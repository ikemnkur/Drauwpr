/**
 * Drauwper — API Routes
 *
 * All drop, contribution, review, favourite, profile, follower,
 * and dashboard endpoints for the Drauwper platform.
 *
 * Mount with:
 *   const drauwperRoutes = require('./drauwper-routes');
 *   drauwperRoutes(server, pool, authenticateToken, PROXY, { storage, BUCKET_NAME, DEST_PREFIX });
 */

const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Burn-rate engine (matches frontend src/engine/burnRate.ts) ──
const ENGINE_C = parseFloat(process.env.BURN_C || '0.999'); // Decay constant — admin-configurable
const ENGINE_K = parseInt(process.env.BURN_K || '5', 10);   // Loop interval minutes — admin-configurable
const DOWNLOAD_TIME_DECAY_CONSTANT = parseFloat(process.env.DOWNLOAD_TIME_DECAY_CONSTANT || '1');
const DOWNLOAD_SITE_POPULARITY_CONSTANT = parseFloat(process.env.DOWNLOAD_SITE_POPULARITY_CONSTANT || '1');

/** Sensitivity: 1 at creation, approaches 0 at expiry. Floored at 0.01. */
function engineSensitivity(nowMs, createdAtMs, expiresAtMs) {
  const s = (nowMs - expiresAtMs) / (createdAtMs - expiresAtMs);
  return Math.max(s, 0.01);
}

/** One decay tick: BurnRate = max(1, BurnRate / (2 − C^(BurnRate/S))) */
function engineTickDecay(burnRate, sensitivity, C = ENGINE_C) {
  const decay = 2 - Math.pow(C, burnRate / sensitivity);
  return Math.max(1, burnRate / decay);
}

/** Contribution boost: BurnRate += contribution / goalAmount */
function engineApplyContribution(burnRate, contribution, goalAmount) {
  return burnRate + (goalAmount > 0 ? contribution / goalAmount : 0);
}

function computeDownloadPricing({
  basePrice,
  goalAmount,
  contributedAmount,
  actualDropTime,
  totalDownloads,
  timeConstant = DOWNLOAD_TIME_DECAY_CONSTANT,
  sitePopularityConstant = DOWNLOAD_SITE_POPULARITY_CONSTANT,
}) {
  const safeBasePrice = Math.max(0, Number(basePrice) || 0);
  const safeGoalAmount = Math.max(0, Number(goalAmount) || 0);
  const safeContributedAmount = Math.max(0, Number(contributedAmount) || 0);
  const safeDownloads = Math.max(0, Number(totalDownloads) || 0);

  const contributionRatio = safeGoalAmount > 0
    ? safeContributedAmount / safeGoalAmount
    : 0;
  const contributionFactor = Math.pow(Math.max(0, contributionRatio), 0.75);
  const contributorDiscountPct = Math.max(0, contributionFactor * 100);

  const daysSinceDrop = actualDropTime
    ? Math.max(0, (Date.now() - new Date(actualDropTime).getTime()) / 86_400_000)
    : 0;

  const timeDecayFraction = 1 - Math.pow(0.99, Math.max(0, timeConstant) * daysSinceDrop);
  const volumeDecayFraction = 1 - Math.pow(0.99, Math.max(0, sitePopularityConstant) * (safeDownloads / 100));

  let contributorDiscountAmount = safeBasePrice * (contributorDiscountPct / 100);
  let timeDecayDiscountAmount = safeBasePrice * Math.max(0, timeDecayFraction);
  let volumeDecayDiscountAmount = safeBasePrice * Math.max(0, volumeDecayFraction);

  const maxDiscountAmount = safeBasePrice * 0.95;
  const rawDiscountAmount = contributorDiscountAmount + timeDecayDiscountAmount + volumeDecayDiscountAmount;
  if (rawDiscountAmount > maxDiscountAmount && rawDiscountAmount > 0) {
    const scale = maxDiscountAmount / rawDiscountAmount;
    contributorDiscountAmount *= scale;
    timeDecayDiscountAmount *= scale;
    volumeDecayDiscountAmount *= scale;
  }

  const finalPrice = safeBasePrice === 0
    ? 0
    : Math.max(1, Math.floor(safeBasePrice - (contributorDiscountAmount + timeDecayDiscountAmount + volumeDecayDiscountAmount)));

  const contributorDiscountPctOut = safeBasePrice > 0 ? (contributorDiscountAmount / safeBasePrice) * 100 : 0;
  const timeDecayDiscountPct = safeBasePrice > 0 ? (timeDecayDiscountAmount / safeBasePrice) * 100 : 0;
  const volumeDecayDiscountPct = safeBasePrice > 0 ? (volumeDecayDiscountAmount / safeBasePrice) * 100 : 0;
  const totalDiscountPct = contributorDiscountPctOut + timeDecayDiscountPct + volumeDecayDiscountPct;

  return {
    contributorDiscountPct: +contributorDiscountPctOut.toFixed(2),
    timeDecayDiscountPct: +timeDecayDiscountPct.toFixed(2),
    volumeDecayDiscountPct: +volumeDecayDiscountPct.toFixed(2),
    totalDiscountPct: +totalDiscountPct.toFixed(2),
    finalPrice,
  };
}

// ── Notification helper (pool-based, mirrors notifications table schema) ──
async function createNotif(pool, { userId, type, title, message = '', priority = 'info', category = 'system', relatedDropId = null, actionUrl = null }) {
  const id = Math.random().toString(36).substring(2, 12).toUpperCase();
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    await pool.query(
      `INSERT IGNORE INTO notifications (id, userId, type, title, message, priority, category, relatedDropId, actionUrl, isRead, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, userId, type, title, message, priority, category, relatedDropId, actionUrl, createdAt]
    );
  } catch (e) {
    console.error('createNotif error:', e.message);
  }
}

const WALLET_TX_ENUM_VALUES = [
  'purchase',
  'credit_purchase',
  'contribution',
  'contribution_refund',
  'contributor_reward',
  'download_payment',
  'creator_earning',
  'creator_payout',
  'admin_adjustment',
  'bonus',
];

const WALLET_TX_TYPE_FALLBACKS = {
  credit_purchase: 'purchase',
  contribution_refund: 'bonus',
  contributor_reward: 'bonus',
  download_payment: 'contribution',
  creator_earning: 'bonus',
  creator_payout: 'admin_adjustment',
};

async function ensureWalletTransactionTypeCompatibility(db) {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM walletTransactions LIKE 'type'");
    const typeDef = String(rows?.[0]?.Type || '');
    const missing = WALLET_TX_ENUM_VALUES.filter((value) => !typeDef.includes(`'${value}'`));

    if (!missing.length) return;

    await db.query(`
      ALTER TABLE walletTransactions
      MODIFY COLUMN type ENUM(
        'purchase',
        'credit_purchase',
        'contribution',
        'contribution_refund',
        'contributor_reward',
        'download_payment',
        'creator_earning',
        'creator_payout',
        'admin_adjustment',
        'bonus'
      ) NOT NULL
    `);

    console.log(`✅ Updated walletTransactions.type enum to include: ${missing.join(', ')}`);
  } catch (err) {
    console.warn('⚠️ walletTransactions schema compatibility check skipped:', err.message || err);
  }
}

async function insertWalletTransaction(db, tx) {
  const insertSql = `INSERT INTO walletTransactions
    (id, userId, type, amount, balanceAfter, relatedDropId, relatedPurchaseId, relatedContributionId, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const id = tx.id || uuidv4();
  const params = [
    id,
    tx.userId,
    tx.type,
    tx.amount,
    tx.balanceAfter,
    tx.relatedDropId || null,
    tx.relatedPurchaseId || null,
    tx.relatedContributionId || null,
    tx.description || null,
  ];

  try {
    await db.query(insertSql, params);
    return { id, typeUsed: tx.type, downgraded: false };
  } catch (err) {
    const isTypeError = err?.code === 'WARN_DATA_TRUNCATED'
      && /column 'type'/i.test(err?.sqlMessage || err?.message || '');
    const fallbackType = WALLET_TX_TYPE_FALLBACKS[tx.type];

    if (!isTypeError || !fallbackType) throw err;

    console.warn(`⚠️ walletTransactions.type "${tx.type}" is not supported by the current DB schema. Falling back to "${fallbackType}".`);
    params[2] = fallbackType;
    await db.query(insertSql, params);
    return { id, typeUsed: fallbackType, downgraded: true };
  }
}

async function ensurePromoSubmissionMetricsColumns(db) {
  try {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'promoSubmissions'
         AND COLUMN_NAME IN ('clicks','dislikes','likes','neutrals','impressions','tags')`
    );
    const existing = new Set((cols || []).map((col) => col.COLUMN_NAME));
    const alters = [];
    if (!existing.has('clicks')) alters.push('ADD COLUMN clicks INT DEFAULT 0');
    if (!existing.has('dislikes')) alters.push('ADD COLUMN dislikes INT DEFAULT 0');
    if (!existing.has('likes')) alters.push('ADD COLUMN likes INT DEFAULT 0');
    if (!existing.has('neutrals')) alters.push('ADD COLUMN neutrals INT DEFAULT 0');
    if (!existing.has('impressions')) alters.push('ADD COLUMN impressions INT DEFAULT 0');
    if (!existing.has('tags')) alters.push('ADD COLUMN tags TINYTEXT');

    if (alters.length > 0) {
      await db.query(`ALTER TABLE promoSubmissions ${alters.join(', ')}`);
    }
  } catch (err) {
    // Ignore if table does not yet exist. Explore should stay operational.
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) return;
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────
module.exports = function drauwperRoutes(server, pool, authenticateToken, PROXY = '', gcs = {}) {
  const { storage, BUCKET_NAME, DEST_PREFIX } = gcs;

  ensureWalletTransactionTypeCompatibility(pool).catch(() => {});

  // ============================================================
  //  DROPS — CRUD
  // ============================================================

  /**
   * GET /api/drops
   * List drops with optional filters.
   * Query params: status, tag, search, sort (newest|popular|ending|burnRate), page, limit
   */
  server.get(PROXY + '/api/drops', async (req, res) => {
    try {
      const { status, tag, search, sort = 'newest', page = 1, limit = 20 } = req.query;
      const offset = (Math.max(1, +page) - 1) * Math.min(50, +limit || 20);
      const cap = Math.min(50, +limit || 20);

      let where = 'WHERE d.isPublic = 1';
      const params = [];

      if (status) {
        where += ' AND d.status = ?';
        params.push(status);
      }
      if (tag) {
        where += ' AND JSON_CONTAINS(d.tags, ?)';
        params.push(JSON.stringify(tag));
      }
      if (search) {
        where += ' AND (d.title LIKE ? OR d.description LIKE ?)';
        const s = `%${search}%`;
        params.push(s, s);
      }

      const orderMap = {
        newest: 'd.created_at DESC',
        popular: 'd.contributorCount DESC',
        ending: 'd.scheduledDropTime ASC',
        burnRate: 'd.burnRate DESC',
      };
      const order = orderMap[sort] || orderMap.newest;

      const [rows] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar
         FROM drops d
         JOIN userData u ON u.id = d.creatorId
         ${where}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
        [...params, cap, offset]
      );

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM drops d ${where}`,
        params
      );

      res.json({ drops: rows, total, page: +page, limit: cap });
    } catch (err) {
      console.error('GET /api/drops error:', err);
      res.status(500).json({ error: 'Failed to fetch drops' });
    }
  });

  /**
   * GET /api/drops/featured
   * Returns featured, sponsored, and trending sections for the Explore page.
   */
  server.get(PROXY + '/api/drops/featured', async (req, res) => {
    try {
      const [featured] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar
         FROM drops d JOIN userData u ON u.id = d.creatorId
         WHERE d.status IN ('active','pending') AND d.isPublic = 1
         ORDER BY d.burnRate DESC LIMIT 4`
      );

      const [trending] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar
         FROM drops d JOIN userData u ON u.id = d.creatorId
         WHERE d.status IN ('active','pending') AND d.isPublic = 1
         ORDER BY d.momentum DESC LIMIT 3`
      );

      const [newest] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar
         FROM drops d JOIN userData u ON u.id = d.creatorId
         WHERE d.status IN ('active','pending','dropped') AND d.isPublic = 1
         ORDER BY d.created_at DESC LIMIT 4`
      );

      const [topCreators] = await pool.query(
        `SELECT id, username, profilePicture, bio, creatorRating, totalDropsCreated, totalCreditsEarned
         FROM userData
         WHERE accountType = 'creator' AND totalDropsCreated > 0
         ORDER BY creatorRating DESC LIMIT 4`
      );

      res.json({ featured, trending, newest, topCreators });
    } catch (err) {
      console.error('GET /api/drops/featured error:', err);
      res.status(500).json({ error: 'Failed to fetch featured drops' });
    }
  });

  /**
   * GET /api/promotions/sponsored
   * Returns approved sponsored promos for the Explore page.
   */
  server.get(PROXY + '/api/promotions/sponsored', async (req, res) => {
    try {
      await ensurePromoSubmissionMetricsColumns(pool);
      const limit = Math.min(20, Math.max(1, Number(req.query.limit || 6)));
      const tag = String(req.query.tag || '').trim();
      const hasTag = !!tag;
      const [rows] = await pool.query(
        `SELECT id, userId, username, submissionType, mediaType, title, description,
                targetDropId, mediaUrl, ctaText, budgetUsd, assetPath, status,
                clicks, impressions, likes, neutrals, dislikes, tags,
                created_at, updated_at
         FROM promoSubmissions
         WHERE status = 'approved'
           AND targetDropId IS NOT NULL
           AND targetDropId <> ''
           ${hasTag ? 'AND tags IS NOT NULL AND LOWER(tags) LIKE LOWER(?)' : ''}
         ORDER BY updated_at DESC
         LIMIT ?`,
        hasTag ? [`%${tag}%`, limit] : [limit]
      );

      res.json({ sponsored: rows });
    } catch (err) {
      // If promoSubmissions does not exist yet, return an empty list instead of failing Explore.
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
        return res.json({ sponsored: [] });
      }
      console.error('GET /api/promotions/sponsored error:', err);
      res.status(500).json({ error: 'Failed to fetch sponsored promotions' });
    }
  });

  server.post(PROXY + '/api/promotions/:id/impression', async (req, res) => {
    try {
      await ensurePromoSubmissionMetricsColumns(pool);
      const id = String(req.params.id || '');
      const [result] = await pool.query(
        `UPDATE promoSubmissions
         SET impressions = COALESCE(impressions, 0) + 1
         WHERE id = ? AND status = 'approved'`,
        [id]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Promo not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('POST /api/promotions/:id/impression error:', err);
      res.status(500).json({ error: 'Failed to track impression' });
    }
  });

  server.post(PROXY + '/api/promotions/:id/click', async (req, res) => {
    try {
      await ensurePromoSubmissionMetricsColumns(pool);
      const id = String(req.params.id || '');
      const [result] = await pool.query(
        `UPDATE promoSubmissions
         SET clicks = COALESCE(clicks, 0) + 1
         WHERE id = ? AND status = 'approved'`,
        [id]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Promo not found' });
      res.json({ success: true });
    } catch (err) {
      console.error('POST /api/promotions/:id/click error:', err);
      res.status(500).json({ error: 'Failed to track click' });
    }
  });

  server.post(PROXY + '/api/promotions/:id/reaction', async (req, res) => {
    try {
      await ensurePromoSubmissionMetricsColumns(pool);
      const id = String(req.params.id || '');
      const reaction = String(req.body?.reaction || '').toLowerCase();
      const columnByReaction = {
        like: 'likes',
        neutral: 'neutrals',
        dislike: 'dislikes',
      };
      const col = columnByReaction[reaction];
      if (!col) return res.status(400).json({ error: 'reaction must be like, neutral, or dislike' });

      const [result] = await pool.query(
        `UPDATE promoSubmissions
         SET ${col} = COALESCE(${col}, 0) + 1
         WHERE id = ? AND status = 'approved'`,
        [id]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Promo not found' });
      res.json({ success: true, reaction });
    } catch (err) {
      console.error('POST /api/promotions/:id/reaction error:', err);
      res.status(500).json({ error: 'Failed to track reaction' });
    }
  });

  /**
   * GET /api/drops/:id
   * Single drop with creator info.
   */
  server.get(PROXY + '/api/drops/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar
         FROM drops d
         JOIN userData u ON u.id = d.creatorId
         WHERE d.id = ?`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Drop not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('GET /api/drops/:id error:', err);
      res.status(500).json({ error: 'Failed to fetch drop' });
    }
  });

  /**
   * POST /api/drops
   * Create a new drop. Requires authentication.
   * Body: title, description, fileType, tags[], goalAmount, basePrice,
   *       scheduledDropTime (ISO), expiresAt (ISO), trailerUrl?, thumbnailUrl?
   * File upload is handled separately via /api/drops/:id/upload-url + /confirm-upload.
   */
  server.post(PROXY + '/api/drops', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        title, description, fileType, tags,
        goalAmount, basePrice,
        scheduledDropTime, expiresAt,
        trailerUrl, thumbnailUrl,
        sensitivity, decayConstant,
      } = req.body;

      if (!title || !goalAmount || !scheduledDropTime || !expiresAt) {
        return res.status(400).json({ error: 'Missing required fields: title, goalAmount, scheduledDropTime, expiresAt' });
      }

      const dropId = uuidv4();
      await pool.query(
        `INSERT INTO drops
         (id, creatorId, title, description, fileType, tags,
          goalAmount, basePrice, scheduledDropTime, expiresAt,
          trailerUrl, thumbnailUrl, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          dropId, userId, title, description || '',
          fileType || 'other', JSON.stringify(tags || []),
          +goalAmount, +(basePrice || 0),
          new Date(scheduledDropTime), new Date(expiresAt),
          trailerUrl || null, thumbnailUrl || null,
        ]
      );

      // Upgrade user to creator if needed
      await pool.query(
        `UPDATE userData SET totalDropsCreated = totalDropsCreated + 1 WHERE id = ? AND accountType = 'free'`,
        [userId]
      );

      res.status(201).json({ id: dropId, message: 'Drop created' });
    } catch (err) {
      console.error('POST /api/drops error:', err);
      res.status(500).json({ error: 'Failed to create drop' });
    }
  });

  /**
   * PUT /api/drops/:id
   * Update a drop (creator only, draft/pending only).
   */
  server.put(PROXY + '/api/drops/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const dropId = req.params.id;

      const [rows] = await pool.query('SELECT creatorId, status FROM drops WHERE id = ?', [dropId]);
      if (!rows.length) return res.status(404).json({ error: 'Drop not found' });
      if (rows[0].creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });
      if (!['draft', 'pending'].includes(rows[0].status)) {
        return res.status(400).json({ error: 'Can only edit draft or pending drops' });
      }

      const allowed = [
        'title', 'description', 'fileType', 'goalAmount', 'basePrice',
        'scheduledDropTime', 'expiresAt', 'trailerUrl', 'thumbnailUrl',
        'sensitivity', 'decayConstant', 'status', 'isPublic',
      ];
      const sets = [];
      const vals = [];
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          if (key === 'tags') {
            sets.push('tags = ?');
            vals.push(JSON.stringify(req.body[key]));
          } else if (['scheduledDropTime', 'expiresAt'].includes(key)) {
            sets.push(`${key} = ?`);
            vals.push(new Date(req.body[key]));
          } else {
            sets.push(`${key} = ?`);
            vals.push(req.body[key]);
          }
        }
      }
      // Handle tags separately if present
      if (req.body.tags !== undefined && !sets.some(s => s.startsWith('tags'))) {
        sets.push('tags = ?');
        vals.push(JSON.stringify(req.body.tags));
      }

      if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

      vals.push(dropId);
      await pool.query(`UPDATE drops SET ${sets.join(', ')} WHERE id = ?`, vals);
      res.json({ message: 'Drop updated' });
    } catch (err) {
      console.error('PUT /api/drops/:id error:', err);
      res.status(500).json({ error: 'Failed to update drop' });
    }
  });

  /**
   * POST /api/drops/:id/publish
   * Move draft → pending (makes it visible, waiting for spark goal).
   */
  server.post(PROXY + '/api/drops/:id/publish', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const [rows] = await pool.query('SELECT creatorId, status, title FROM drops WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Drop not found' });
      if (rows[0].creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });
      if (rows[0].status !== 'draft') return res.status(400).json({ error: 'Only draft drops can be published' });

      await pool.query(`UPDATE drops SET status = 'pending' WHERE id = ?`, [req.params.id]);
      res.json({ message: `"${rows[0].title}" is now live and awaiting contributions` });
    } catch (err) {
      console.error('POST /api/drops/:id/publish error:', err);
      res.status(500).json({ error: 'Failed to publish drop' });
    }
  });

  /**
   * DELETE /api/drops/:id
   * Soft-remove a drop (creator or admin).
   */
  server.delete(PROXY + '/api/drops/:id', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const [rows] = await pool.query('SELECT creatorId FROM drops WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Drop not found' });
      if (rows[0].creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });

      await pool.query(`UPDATE drops SET status = 'removed' WHERE id = ?`, [req.params.id]);
      res.json({ message: 'Drop removed' });
    } catch (err) {
      console.error('DELETE /api/drops/:id error:', err);
      res.status(500).json({ error: 'Failed to remove drop' });
    }
  });


  // ============================================================
  //  CONTRIBUTIONS — Burn credits to accelerate a drop
  // ============================================================

  /**
   * POST /api/drops/:id/contribute
   * Body: { amount: number }
   */
  server.post(PROXY + '/api/drops/:id/contribute', authenticateToken, async (req, res) => {
    console.log(`POST /api/drops/${req.params.id}/contribute - User ${req.user.id} contributing ${req.body.amount} credits`);
    const conn = await pool.getConnection();
    try {
      const userId = req.user.id;
      const dropId = req.params.id;
      const amount = Math.floor(+req.body.amount);
      if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum contribution is 100 credits' });

      await conn.beginTransaction();

      // Lock the drop row
      const [[drop]] = await conn.query(
        'SELECT * FROM drops WHERE id = ? FOR UPDATE', [dropId]
      );
      if (!drop) { await conn.rollback(); return res.status(404).json({ error: 'Drop not found' }); }
      if (!['pending', 'active'].includes(drop.status)) {
        await conn.rollback();
        return res.status(400).json({ error: 'This drop is not accepting contributions' });
      }

      // Check user balance
      const [[user]] = await conn.query('SELECT credits, verification FROM userData WHERE id = ? FOR UPDATE', [userId]);
      if (!user || user.credits < amount) {
        await conn.rollback();
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Wait penalty (cost increases near expiry — max 1%/day)
      const msToExpiry = new Date(drop.expiresAt).getTime() - Date.now();
      const daysToExpiry = msToExpiry / 86_400_000;
      const waitPenaltyPct = daysToExpiry < 1 ? Math.min(1, 1 / Math.max(0.01, daysToExpiry)) : 0;
      const penaltyAmount = Math.floor(amount * waitPenaltyPct / 100);
      const totalCost = amount + penaltyAmount;

      if (user.credits < totalCost) {
        await conn.rollback();
        return res.status(400).json({ error: 'Insufficient credits (including wait penalty)' });
      }

      // Apply contribution boost to burn rate
      const now = Date.now();
      const newContributions = drop.currentContributions + amount;
      const newContributorCount = drop.contributorCount + 1;

      // If goal just met → activate
      let newStatus = drop.status;
      if (drop.status === 'pending' && newContributions >= drop.goalAmount) {
        newStatus = 'active';
      }

      // Burn rate locked at 1× until goal is met; boosted by contribution once active
      const goalMet = newContributions >= drop.goalAmount;
      const newBurnRate = goalMet ? engineApplyContribution(drop.burnRate, amount, drop.goalAmount) : 1;

      // Update drop
      await conn.query(
        `UPDATE drops SET
          currentContributions = ?, contributorCount = ?,
          burnRate = ?,
          lastContributionTime = NOW(),
          lastMomentumUpdate = NOW(), status = ?
         WHERE id = ?`,
        [newContributions, newContributorCount, newBurnRate, newStatus, dropId]
      );

      // Deduct user credits
      await conn.query('UPDATE userData SET credits = credits - ? WHERE id = ?', [totalCost, userId]);

      // Insert contribution record — stamp isVerified from the contributing user's current verification status
      const contribId = uuidv4();
      const isVerified = user.verification === 'true' ? 1 : 0;
      await conn.query(
        `INSERT INTO contributions
         (id, dropId, userId, amount, momentumBefore, momentumAfter, burnRateAfter, waitPenaltyPct, penaltyAmount, isVerified)
         VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
        [contribId, dropId, userId, amount, newBurnRate, waitPenaltyPct, penaltyAmount, isVerified]
      );

      // Burn log
      await conn.query(
        `INSERT INTO momentumLog
         (dropId, contributionId, momentumBefore, momentumAfter, burnRateBefore, burnRateAfter, eventType)
         VALUES (?, ?, 0, 0, ?, ?, 'contribution')`,
        [dropId, contribId, drop.burnRate, newBurnRate]
      );

      // Wallet transaction ledger
      await insertWalletTransaction(conn, {
        id: uuidv4(),
        userId,
        type: 'contribution',
        amount: -totalCost,
        balanceAfter: user.credits - totalCost,
        relatedDropId: dropId,
        relatedContributionId: contribId,
        description: `Contributed ${amount.toLocaleString()} credits to "${drop.title}"`,
      });

      await conn.commit();

      // Fire-and-forget: notify creator of contribution + notify contributor if goal just met
      if (userId !== drop.creatorId) {
        pool.query('SELECT username FROM userData WHERE id = ?', [userId])
          .then(([[contrib]]) => createNotif(pool, {
            userId: drop.creatorId,
            type: 'contribution_received',
            title: '\uD83D\uDD25 New contribution!',
            message: `${contrib?.username || 'Someone'} contributed ${amount.toLocaleString()} credits to "${drop.title}".`,
            priority: 'success',
            category: 'contribution_received',
            relatedDropId: dropId,
            actionUrl: `/drop/${dropId}`,
          }))
          .catch((e) => console.error('Contribution notif error:', e.message));
      }

      // Notify all contributors + creator when goal is first met
      if (newStatus === 'active' && drop.status === 'pending') {
        pool.query('SELECT DISTINCT userId FROM contributions WHERE dropId = ? AND isRefunded = 0', [dropId])
          .then(([rows]) => Promise.all(rows.map((r) => createNotif(pool, {
            userId: r.userId,
            type: 'goal_reached',
            title: '\uD83C\uDF89 Goal reached!',
            message: `"${drop.title}" has hit its funding goal and the countdown has started!`,
            priority: 'success',
            category: 'goal_reached',
            relatedDropId: dropId,
            actionUrl: `/drop/${dropId}`,
          }))))
          .catch((e) => console.error('Goal-reached notifs error:', e.message));
      }

      res.json({
        message: 'Contribution successful',
        contribution: { id: contribId, amount, penaltyAmount },
        drop: {
          currentContributions: newContributions,
          burnRate: newBurnRate,
          status: newStatus,
        },
        newBalance: user.credits - totalCost,
      });
    } catch (err) {
      await conn.rollback();
      console.error('POST /api/drops/:id/contribute error:', err);
      res.status(500).json({ error: 'Contribution failed' });
    } finally {
      conn.release();
    }
  });

  /**
   * GET /api/drops/:id/contributors
   * Top contributors for a drop.
   */
  server.get(PROXY + '/api/drops/:id/contributors', async (req, res) => {
    try {
      const limit = Math.min(50, +(req.query.limit || 20));
      const [rows] = await pool.query(
        `SELECT c.userId, u.username, u.profilePicture AS avatar,
                SUM(c.amount) AS totalAmount, COUNT(*) AS contributions,
                MAX(c.created_at) AS lastContribution
         FROM contributions c
         JOIN userData u ON u.id = c.userId
         WHERE c.dropId = ? AND c.isRefunded = 0
         GROUP BY c.userId
         ORDER BY totalAmount DESC
         LIMIT ?`,
        [req.params.id, limit]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/drops/:id/contributors error:', err);
      res.status(500).json({ error: 'Failed to fetch contributors' });
    }
  });


  // ============================================================
  //  DOWNLOADS — Post-release file purchases
  // ============================================================

  /**
   * GET /api/drops/:id/price-preview
   * Returns dynamic price breakdown. Optionally authenticated for contributor discount.
   * Must be defined BEFORE the generic /:id routes to avoid collision.
   */
  server.get(PROXY + '/api/drops/:id/price-preview', async (req, res) => {
    try {
      const dropId = req.params.id;
      // Soft auth — not required
      let userId = null;
      try {
        const hdr = req.headers.authorization;
        if (hdr) {
          const jwt = require('jsonwebtoken');
          const payload = jwt.verify(hdr.split(' ')[1], process.env.JWT_SECRET || 'secret');
          userId = payload.id || payload.userId || null;
        }
      } catch (_) {}

      const [[drop]] = await pool.query(
        `SELECT id, creatorId, basePrice, goalAmount, actualDropTime, totalDownloads,
                status
         FROM drops WHERE id = ?`,
        [dropId]
      );
      if (!drop) return res.status(404).json({ error: 'Drop not found' });

      let contributedAmount = 0;
      let alreadyDownloaded = false;
      const isCreator = userId != null && userId === drop.creatorId;

      if (userId) {
        const [[c]] = await pool.query(
          `SELECT COALESCE(SUM(amount),0) AS contributed FROM contributions WHERE dropId = ? AND userId = ? AND isRefunded = 0`,
          [dropId, userId]
        );
        contributedAmount = Number(c.contributed) || 0;

        const [[dl]] = await pool.query(
          `SELECT id, basePrice, pricePaid, contributorDiscount, timeDecayDiscount, volumeDecayDiscount 
           FROM dropDownloads WHERE dropId = ? AND userId = ?`, [dropId, userId]
        );
        alreadyDownloaded = !!dl;

        // If already downloaded, use the stored discount values from the download record
        if (alreadyDownloaded) {
          const storedBasePrice = Number(dl.basePrice) || drop.basePrice;
          const storedContributorDiscount = Number(dl.contributorDiscount) || 0;
          const storedTimeDecayDiscount = Number(dl.timeDecayDiscount) || 0;
          const storedVolumeDecayDiscount = Number(dl.volumeDecayDiscount) || 0;
          const storedTotalDiscount = storedContributorDiscount + storedTimeDecayDiscount + storedVolumeDecayDiscount;
          const storedFinalPrice = Number(dl.pricePaid) || 0;

          return res.json({
            basePrice: storedBasePrice,
            contributedAmount,
            contributorDiscountPct: +storedContributorDiscount.toFixed(2),
            timeDecayDiscountPct: +storedTimeDecayDiscount.toFixed(2),
            volumeDecayDiscountPct: +storedVolumeDecayDiscount.toFixed(2),
            totalDiscountPct: +storedTotalDiscount.toFixed(2),
            finalPrice: storedFinalPrice,
            alreadyDownloaded: true,
            isCreator,
            isFree: isCreator || storedFinalPrice === 0,
          });
        }
      }

      // Calculate preview for users who haven't downloaded yet
      const basePrice = drop.basePrice;
      const pricing = computeDownloadPricing({
        basePrice,
        goalAmount: drop.goalAmount,
        contributedAmount,
        actualDropTime: drop.actualDropTime,
        totalDownloads: drop.totalDownloads,
      });
      const finalPrice = isCreator ? 0 : pricing.finalPrice;

      res.json({
        basePrice,
        contributedAmount,
        contributorDiscountPct: pricing.contributorDiscountPct,
        timeDecayDiscountPct: pricing.timeDecayDiscountPct,
        volumeDecayDiscountPct: pricing.volumeDecayDiscountPct,
        totalDiscountPct: pricing.totalDiscountPct,
        finalPrice,
        alreadyDownloaded: false,
        isCreator,
        isFree: isCreator || basePrice === 0,
      });
    } catch (err) {
      console.error('GET /api/drops/:id/price-preview error:', err);
      res.status(500).json({ error: 'Failed to compute price' });
    }
  });

  /**
   * GET /api/drops/:id/download-url
   * Returns a 1h signed GCS URL for users who have purchased the drop.
   */
  server.get(PROXY + '/api/drops/:id/download-url', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const dropId = req.params.id;

      const [[drop]] = await pool.query(
        `SELECT creatorId, filePath, originalFileName, status FROM drops WHERE id = ?`, [dropId]
      );
      if (!drop) return res.status(404).json({ error: 'Drop not found' });
      if (drop.status !== 'dropped') return res.status(400).json({ error: 'Drop not yet released' });
      if (!drop.filePath) return res.status(404).json({ error: 'No file attached to this drop yet' });

      if (drop.creatorId !== userId) {
        const [[dl]] = await pool.query(
          `SELECT id FROM dropDownloads WHERE dropId = ? AND userId = ?`, [dropId, userId]
        );
        if (!dl) return res.status(403).json({ error: 'Purchase the drop before downloading' });
      }

      const [signedUrl] = await storage.bucket(BUCKET_NAME).file(drop.filePath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        responseDisposition: `attachment; filename="${drop.originalFileName || 'download'}"`,
      });

      res.json({ url: signedUrl, filename: drop.originalFileName || 'download' });
    } catch (err) {
      console.error('GET /api/drops/:id/download-url error:', err);
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  });

  /**
   * POST /api/drops/:id/download
   * Purchase and get download URL. Handles contributor discounts + decay pricing.
   */
  server.post(PROXY + '/api/drops/:id/download', authenticateToken, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const userId = req.user.id;
      const dropId = req.params.id;

      await conn.beginTransaction();

      const [[drop]] = await conn.query('SELECT * FROM drops WHERE id = ? FOR UPDATE', [dropId]);
      if (!drop) { await conn.rollback(); return res.status(404).json({ error: 'Drop not found' }); }
      if (drop.status !== 'dropped') {
        await conn.rollback();
        return res.status(400).json({ error: 'This drop has not been released yet' });
      }

      // Already downloaded?
      const [[existing]] = await conn.query(
        'SELECT id FROM dropDownloads WHERE dropId = ? AND userId = ?', [dropId, userId]
      );
      if (existing) {
        await conn.rollback();
        return res.json({ message: 'Already downloaded', filePath: drop.filePath });
      }

      // Calculate price with discounts
      let price = drop.basePrice;

      // Contributor discount + time + volume discount from unified pricing model
      const [[contrib]] = await conn.query(
        'SELECT COALESCE(SUM(amount),0) AS contributed FROM contributions WHERE dropId = ? AND userId = ? AND isRefunded = 0',
        [dropId, userId]
      );
      const pricing = computeDownloadPricing({
        basePrice: drop.basePrice,
        goalAmount: drop.goalAmount,
        contributedAmount: contrib.contributed,
        actualDropTime: drop.actualDropTime,
        totalDownloads: drop.totalDownloads,
      });

      const contributorDiscount = pricing.contributorDiscountPct;
      const timeDecayDiscount = pricing.timeDecayDiscountPct;
      const volumeDecayDiscount = pricing.volumeDecayDiscountPct;
      price = pricing.finalPrice;

      // Creator gets free download
      if (drop.creatorId === userId) price = 0;

      // Check balance
      const [[user]] = await conn.query('SELECT credits FROM userData WHERE id = ? FOR UPDATE', [userId]);
      if (user.credits < price) {
        await conn.rollback();
        return res.status(400).json({ error: 'Insufficient credits', priceToPay: price });
      }

      // Deduct credits
      if (price > 0) {
        await conn.query('UPDATE userData SET credits = credits - ? WHERE id = ?', [price, userId]);
      }

      // Record download
      const dlId = uuidv4();
      await conn.query(
        `INSERT INTO dropDownloads
         (id, dropId, userId, pricePaid, basePrice, contributorDiscount, timeDecayDiscount, volumeDecayDiscount, downloadNumber)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [dlId, dropId, userId, price, drop.basePrice, contributorDiscount, timeDecayDiscount, volumeDecayDiscount, drop.totalDownloads + 1]
      );

      // Update drop stats
      await conn.query(
        'UPDATE drops SET totalDownloads = totalDownloads + 1, totalRevenue = totalRevenue + ? WHERE id = ?',
        [price, dropId]
      );

      // Credit the creator
      if (price > 0) {
        await conn.query('UPDATE userData SET credits = credits + ?, totalCreditsEarned = totalCreditsEarned + ? WHERE id = ?',
          [price, price, drop.creatorId]);

        const [[creatorRow]] = await conn.query('SELECT credits FROM userData WHERE id = ?', [drop.creatorId]);
        await insertWalletTransaction(conn, {
          id: uuidv4(),
          userId: drop.creatorId,
          type: 'creator_earning',
          amount: price,
          balanceAfter: creatorRow.credits,
          relatedDropId: dropId,
          description: `Download sale for "${drop.title}"`,
        });
      }

      // Wallet ledger for buyer
      if (price > 0) {
        await insertWalletTransaction(conn, {
          id: uuidv4(),
          userId,
          type: 'download_payment',
          amount: -price,
          balanceAfter: user.credits - price,
          relatedDropId: dropId,
          description: `Downloaded "${drop.title}"`,
        });
      }

      await conn.commit();

      // Fire-and-forget: notify creator of new download
      if (price > 0 && userId !== drop.creatorId) {
        pool.query('SELECT username FROM userData WHERE id = ?', [userId])
          .then(([[buyer]]) => createNotif(pool, {
            userId: drop.creatorId,
            type: 'drop_downloaded',
            title: '\uD83C\uDF89 Your drop was downloaded!',
            message: `${buyer?.username || 'Someone'} downloaded "${drop.title}" for ${price.toLocaleString()} credits.`,
            priority: 'success',
            category: 'download_available',
            relatedDropId: dropId,
            actionUrl: `/drop/${dropId}/download`,
          }))
          .catch((e) => console.error('Download notif error:', e.message));
      }

      res.json({
        message: 'Download ready — use GET /api/drops/:id/download-url to get the file',
        dropId,
        pricePaid: price,
        discounts: { contributorDiscount, timeDecayDiscount, volumeDecayDiscount },
      });
    } catch (err) {
      await conn.rollback();
      console.error('POST /api/drops/:id/download error:', err);
      res.status(500).json({ error: 'Download failed' });
    } finally {
      conn.release();
    }
  });


  // ============================================================
  //  REVIEWS
  // ============================================================

  /**
   * GET /api/drops/:id/reviews
   */
  server.get(PROXY + '/api/drops/:id/reviews', async (req, res) => {
    try {
      const { sort = 'newest' } = req.query;
      const order = sort === 'top' ? 'r.rating DESC' : 'r.created_at DESC';
      const [rows] = await pool.query(
        `SELECT r.*, u.username, u.profilePicture AS avatar
         FROM dropReviews r
         JOIN userData u ON u.id = r.userId
         WHERE r.dropId = ? AND r.isHidden = 0
         ORDER BY ${order}
         LIMIT 50`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/drops/:id/reviews error:', err);
      res.status(500).json({ error: 'Failed to fetch reviews' });
    }
  });

  /**
   * POST /api/drops/:id/reviews
   * Body: { comment, rating (0-100), liked (true/false/null) }
   */
  server.post(PROXY + '/api/drops/:id/reviews', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const dropId = req.params.id;
      const { comment, rating, liked } = req.body;

      if (!comment || rating === undefined) {
        return res.status(400).json({ error: 'comment and rating required' });
      }
      const clampedRating = Math.max(0, Math.min(100, Math.floor(+rating)));

      // Must have downloaded the drop
      const [[dl]] = await pool.query(
        'SELECT id FROM dropDownloads WHERE dropId = ? AND userId = ?', [dropId, userId]
      );
      if (!dl) return res.status(403).json({ error: 'You must download the drop before reviewing' });

      const reviewId = uuidv4();
      await pool.query(
        `INSERT INTO dropReviews (id, dropId, userId, comment, rating, liked)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE comment = VALUES(comment), rating = VALUES(rating), liked = VALUES(liked), isEdited = 1`,
        [reviewId, dropId, userId, comment, clampedRating, liked === true ? 1 : liked === false ? 0 : null]
      );

      // Recalculate drop average rating
      await pool.query(
        `UPDATE drops SET
          avgRating = (SELECT AVG(rating) FROM dropReviews WHERE dropId = ? AND isHidden = 0),
          reviewCount = (SELECT COUNT(*) FROM dropReviews WHERE dropId = ? AND isHidden = 0),
          likeCount = (SELECT COUNT(*) FROM dropReviews WHERE dropId = ? AND liked = 1 AND isHidden = 0),
          dislikeCount = (SELECT COUNT(*) FROM dropReviews WHERE dropId = ? AND liked = 0 AND isHidden = 0)
         WHERE id = ?`,
        [dropId, dropId, dropId, dropId, dropId]
      );

      res.status(201).json({ id: reviewId, message: 'Review submitted' });
    } catch (err) {
      console.error('POST /api/drops/:id/reviews error:', err);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });


  // ============================================================
  //  FAVORITES / WAITLIST
  // ============================================================

  /**
   * POST /api/drops/:id/favorite
   * Toggle favorite. Returns { favorited: true/false }.
   */
  server.post(PROXY + '/api/drops/:id/favorite', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const dropId = req.params.id;

      const [[existing]] = await pool.query(
        'SELECT id FROM dropFavorites WHERE dropId = ? AND userId = ?', [dropId, userId]
      );

      if (existing) {
        await pool.query('DELETE FROM dropFavorites WHERE id = ?', [existing.id]);
        res.json({ favorited: false });
      } else {
        await pool.query(
          'INSERT INTO dropFavorites (dropId, userId) VALUES (?, ?)', [dropId, userId]
        );
        res.json({ favorited: true });
      }
    } catch (err) {
      console.error('POST /api/drops/:id/favorite error:', err);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  /**
   * GET /api/user/favorites
   * Get current user's favorited drops.
   */
  server.get(PROXY + '/api/user/favorites', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT d.*, u.username AS creatorName, u.profilePicture AS creatorAvatar,
                f.created_at AS favoritedAt
         FROM dropFavorites f
         JOIN drops d ON d.id = f.dropId
         JOIN userData u ON u.id = d.creatorId
         WHERE f.userId = ?
         ORDER BY f.created_at DESC`,
        [req.user.id]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/user/favorites error:', err);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });


  // ============================================================
  //  USER PROFILES
  // ============================================================

  /**
   * GET /api/users/search?q=
   * Search users by username (partial match). Must be defined BEFORE /api/users/:id.
   */
  server.get(PROXY + '/api/users/search', async (req, res) => {
    try {
      const q = (req.query.q || '').toString().trim();
      if (!q || q.length < 2) return res.json([]);
      const [rows] = await pool.query(
        `SELECT id, username, profilePicture, bio, accountType,
                totalDropsCreated, totalCreditsEarned
         FROM userData
         WHERE username LIKE ? AND isBanned = 0
         ORDER BY totalDropsCreated DESC
         LIMIT 15`,
        [`%${q}%`]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/users/search error:', err);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  /**
   * GET /api/users/:id
   * Public profile data.
   */
  server.get(PROXY + '/api/users/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, username, profilePicture, bio, accountType,
                totalDropsCreated, totalCreditsEarned, creatorRating, createdAt,
                bannerUrl, bioVideoUrl, socialLinks,
                (SELECT COUNT(*) FROM followers WHERE followeeId = userData.id) AS followerCount,
                (SELECT COUNT(*) FROM followers WHERE followerId = userData.id) AS followingCount
         FROM userData WHERE id = ?`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('GET /api/users/:id error:', err);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  /**
   * GET /api/users/:id/drops
   * Public drops for a user profile.
   */
  server.get(PROXY + '/api/users/:id/drops', async (req, res) => {
    try {
      const { status } = req.query;
      let where = 'd.creatorId = ? AND d.isPublic = 1';
      const params = [req.params.id];
      if (status) {
        where += ' AND d.status = ?';
        params.push(status);
      }
      const [rows] = await pool.query(
        `SELECT d.* FROM drops d WHERE ${where} ORDER BY d.created_at DESC LIMIT 50`,
        params
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/users/:id/drops error:', err);
      res.status(500).json({ error: 'Failed to fetch user drops' });
    }
  });


  // ============================================================
  //  FOLLOWERS
  // ============================================================

  /**
   * POST /api/users/:id/follow
   * Toggle follow. Returns { following: true/false }.
   */
  server.post(PROXY + '/api/users/:id/follow', authenticateToken, async (req, res) => {
    try {
      const followerId = req.user.id;
      const followeeId = req.params.id;
      if (followerId === followeeId) return res.status(400).json({ error: 'Cannot follow yourself' });

      const [[existing]] = await pool.query(
        'SELECT id FROM followers WHERE followerId = ? AND followeeId = ?',
        [followerId, followeeId]
      );

      if (existing) {
        await pool.query('DELETE FROM followers WHERE id = ?', [existing.id]);
        res.json({ following: false });
      } else {
        await pool.query(
          'INSERT INTO followers (followerId, followeeId) VALUES (?, ?)',
          [followerId, followeeId]
        );
        res.json({ following: true });
      }
    } catch (err) {
      console.error('POST /api/users/:id/follow error:', err);
      res.status(500).json({ error: 'Failed to toggle follow' });
    }
  });

  /**
   * GET /api/users/:id/followers
   */
  server.get(PROXY + '/api/users/:id/followers', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.profilePicture, u.bio
         FROM followers f
         JOIN userData u ON u.id = f.followerId
         WHERE f.followeeId = ?
         ORDER BY f.createdAt DESC LIMIT 100`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/users/:id/followers error:', err);
      res.status(500).json({ error: 'Failed to fetch followers' });
    }
  });

  /**
   * GET /api/users/:id/following
   */
  server.get(PROXY + '/api/users/:id/following', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.profilePicture, u.bio
         FROM followers f
         JOIN userData u ON u.id = f.followeeId
         WHERE f.followerId = ?
         ORDER BY f.createdAt DESC LIMIT 100`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error('GET /api/users/:id/following error:', err);
      res.status(500).json({ error: 'Failed to fetch following' });
    }
  });


  // ============================================================
  //  DASHBOARD — Authenticated user's overview
  // ============================================================

  /**
   * GET /api/dashboard
   * Returns my drops, my contributions, stats.
   */
  server.get(PROXY + '/api/dashboard', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;

      // My drops
      const [myDrops] = await pool.query(
        `SELECT * FROM drops WHERE creatorId = ? ORDER BY created_at DESC`, [userId]
      );

      // Drops I contributed to (aggregated)
      const [contributed] = await pool.query(
        `SELECT d.*, SUM(c.amount) AS myContribution
         FROM contributions c
         JOIN drops d ON d.id = c.dropId
         WHERE c.userId = ? AND c.isRefunded = 0
         GROUP BY c.dropId
         ORDER BY MAX(c.created_at) DESC`,
        [userId]
      );

      // Quick stats
      const [[stats]] = await pool.query(
        `SELECT
           (SELECT COALESCE(SUM(amount),0) FROM contributions WHERE userId = ? AND isRefunded = 0) AS totalContributed,
           (SELECT COUNT(DISTINCT dropId) FROM contributions WHERE userId = ? AND isRefunded = 0) AS dropsContributedTo,
           (SELECT COALESCE(SUM(totalRevenue),0) FROM drops WHERE creatorId = ?) AS totalEarned,
           (SELECT COUNT(*) FROM drops WHERE creatorId = ? AND status != 'removed') AS totalMyDrops,
           (SELECT COUNT(*) FROM dropFavorites WHERE userId = ?) AS totalFavorites`,
        [userId, userId, userId, userId, userId]
      );

      // User info
      const [[user]] = await pool.query(
        'SELECT id, username, email, credits, profilePicture, accountType FROM userData WHERE id = ?',
        [userId]
      );

      res.json({ user, myDrops, contributed, stats });
    } catch (err) {
      console.error('GET /api/dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  });


  // ============================================================
  //  CONTRIBUTION HISTORY — user's past contributions
  // ============================================================

  /**
   * GET /api/contributions/history
   * Returns the authenticated user's contribution history with drop info.
   */
  server.get(PROXY + '/api/contributions/history', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = parseInt(req.query.offset) || 0;

      const [rows] = await pool.query(
        `SELECT c.id, c.dropId, c.amount, c.penaltyAmount, c.isRefunded, c.created_at,
                d.title AS dropTitle, d.status AS dropStatus
         FROM contributions c
         JOIN drops d ON d.id = c.dropId
         WHERE c.userId = ?
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [[{ total }]] = await pool.query(
        'SELECT COUNT(*) AS total FROM contributions WHERE userId = ?',
        [userId]
      );

      const [[{ totalSpent }]] = await pool.query(
        'SELECT COALESCE(SUM(amount + penaltyAmount), 0) AS totalSpent FROM contributions WHERE userId = ? AND isRefunded = 0',
        [userId]
      );

      res.json({ history: rows, total, totalSpent, limit, offset });
    } catch (err) {
      console.error('GET /api/contributions/history error:', err);
      res.status(500).json({ error: 'Failed to fetch contribution history' });
    }
  });


  // ============================================================
  //  BURN ENGINE — Cron / Scheduled momentum decay
  // ============================================================

  /**
   * POST /api/engine/decay-tick
   * Called by a cron job every ~60s.
   * Applies momentum decay to all active drops.
   */
  server.post(PROXY + '/api/engine/decay-tick', async (req, res) => {
    try {
      const [activeDrops] = await pool.query(
        `SELECT id, burnRate, created_at, expiresAt, scheduledDropTime, status,
                creatorId, title
         FROM drops WHERE status = 'active'`
      );

      let updated = 0;
      const now = Date.now();

      for (const drop of activeDrops) {
        const createdAtMs = new Date(drop.created_at).getTime();
        const expiresAtMs = new Date(drop.expiresAt).getTime();
        const S = engineSensitivity(now, createdAtMs, expiresAtMs);
        const newBurnRate = engineTickDecay(drop.burnRate, S);

        // Check if countdown reached zero → mark as dropped
        const scheduledMs = new Date(drop.scheduledDropTime).getTime();
        const realRemaining = (scheduledMs - now) / 1000;
        // Each K-minute tick consumes burnRate × K×60 clock-seconds
        const accelRemaining = realRemaining - newBurnRate * ENGINE_K * 60;

        let newStatus = drop.status;
        if (realRemaining <= 0 || accelRemaining <= 0) {
          newStatus = 'dropped';
        }

        await pool.query(
          `UPDATE drops SET burnRate = ?, lastMomentumUpdate = NOW(), status = ? WHERE id = ?`,
          [newBurnRate, newStatus, drop.id]
        );

        // Log the tick
        await pool.query(
          `INSERT INTO momentumLog
           (dropId, momentumBefore, momentumAfter, burnRateBefore, burnRateAfter, clockSecondsRemaining, eventType)
           VALUES (?, 0, 0, ?, ?, ?, 'decay_tick')`,
          [drop.id, drop.burnRate, newBurnRate, Math.max(0, realRemaining)]
        );

        // If just dropped → set actualDropTime and notify contributors
        if (newStatus === 'dropped' && drop.status === 'active') {
          await pool.query('UPDATE drops SET actualDropTime = NOW() WHERE id = ?', [drop.id]);

          // Notify all contributors that the drop is now available
          pool.query('SELECT DISTINCT userId FROM contributions WHERE dropId = ? AND isRefunded = 0', [drop.id])
            .then(([rows]) => Promise.all(rows.map((r) => createNotif(pool, {
              userId: r.userId,
              type: 'drop_released',
              title: '\uD83C\uDF89 Drop released!',
              message: `"${drop.title}" has been released and is now available to download.`,
              priority: 'success',
              category: 'drop_released',
              relatedDropId: drop.id,
              actionUrl: `/drop/${drop.id}/download`,
            }))))
            .catch((e) => console.error('Drop-released notif error:', e.message));
        }

        // High burn rate warning (>= 3x) — notify creator at most once per 10-minute window
        if (newBurnRate >= 3) {
          const [[existing]] = await pool.query(
            `SELECT id FROM notifications WHERE userId = ? AND type = 'high_burn_rate'
               AND relatedDropId = ? AND createdAt > NOW() - INTERVAL 10 MINUTE
             LIMIT 1`,
            [drop.creatorId, drop.id]
          );
          if (!existing) {
            createNotif(pool, {
              userId: drop.creatorId,
              type: 'high_burn_rate',
              title: `\uD83D\uDD25 Burn rate ${newBurnRate.toFixed(1)}\u00d7 on your drop!`,
              message: `"${drop.title}" is burning fast — contributors are pushing it to release early.`,
              priority: 'warning',
              category: 'system',
              relatedDropId: drop.id,
              actionUrl: `/drop/${drop.id}`,
            }).catch(() => {});
          }
        }

        updated++;
      }

      // Notify creators of drops expiring within 24h (fires once per drop)
      const [expiringDrops] = await pool.query(`
        SELECT d.id, d.title, d.creatorId FROM drops d
        WHERE d.status IN ('pending','active')
          AND d.expiresAt BETWEEN NOW() AND NOW() + INTERVAL 24 HOUR
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.relatedDropId = d.id AND n.type = 'expiry_warning' AND n.userId = d.creatorId
          )
      `);
      for (const d of expiringDrops) {
        await createNotif(pool, {
          userId: d.creatorId,
          type: 'expiry_warning',
          title: '\u26A0\uFE0F Drop expiring within 24h!',
          message: `"${d.title}" expires soon. If the goal isn't met, all contributions will be refunded.`,
          priority: 'warning',
          category: 'system',
          relatedDropId: d.id,
          actionUrl: `/drop/${d.id}`,
        });
      }

      // Also check for expired drops (past expiresAt with status pending)
      const [expired] = await pool.query(
        `UPDATE drops SET status = 'expired' WHERE status = 'pending' AND expiresAt < NOW()`
      );

      // Refund contributions for newly expired drops
      if (expired.changedRows > 0) {
        const [expiredDrops] = await pool.query(
          `SELECT d.id, d.title FROM drops d WHERE d.status = 'expired' AND d.id IN (
             SELECT DISTINCT dropId FROM contributions WHERE isRefunded = 0
           )`
        );
        for (const d of expiredDrops) {
          const [contribs] = await pool.query(
            'SELECT id, userId, amount FROM contributions WHERE dropId = ? AND isRefunded = 0',
            [d.id]
          );
          for (const c of contribs) {
            await pool.query('UPDATE userData SET credits = credits + ? WHERE id = ?', [c.amount, c.userId]);
            await pool.query('UPDATE contributions SET isRefunded = 1, refundedAt = NOW() WHERE id = ?', [c.id]);
            const [[refundedUser]] = await pool.query('SELECT credits FROM userData WHERE id = ?', [c.userId]);
            await insertWalletTransaction(pool, {
              id: uuidv4(),
              userId: c.userId,
              type: 'contribution_refund',
              amount: c.amount,
              balanceAfter: refundedUser.credits,
              relatedDropId: d.id,
              relatedContributionId: c.id,
              description: `"${d.title}" expired — credits refunded`,
            });
            createNotif(pool, {
              userId: c.userId,
              type: 'contribution_refunded',
              title: 'Credits refunded',
              message: `"${d.title}" expired without meeting its goal. ${c.amount.toLocaleString()} credits have been returned to your balance.`,
              priority: 'info',
              category: 'contribution_refunded',
              relatedDropId: d.id,
              actionUrl: `/drop/${d.id}`,
            }).catch(() => {});
          }
        }
      }

      res.json({ updated, expiredRefunded: expired.changedRows || 0 });
    } catch (err) {
      console.error('POST /api/engine/decay-tick error:', err);
      res.status(500).json({ error: 'Decay tick failed' });
    }
  });

  /**
   * POST /api/engine/contributor-rewards
   * Run hourly. Pays top-10 contributors 5% of total drop contributions,
   * weighted by their share, for drops released 3+ days ago.
   */
  server.post(PROXY + '/api/engine/contributor-rewards', async (req, res) => {
    try {
      const [eligible] = await pool.query(`
        SELECT d.id, d.title, d.currentContributions
        FROM drops d
        WHERE d.status = 'dropped'
          AND d.actualDropTime IS NOT NULL
          AND d.actualDropTime < NOW() - INTERVAL 3 DAY
          AND NOT EXISTS (
            SELECT 1 FROM walletTransactions wt
            WHERE wt.relatedDropId = d.id
              AND (
                wt.type = 'contributor_reward'
                OR wt.description LIKE 'Top contributor reward for %'
              )
          )
      `);

      let rewardedDrops = 0;
      for (const drop of eligible) {
        const rewardPool = Math.floor(drop.currentContributions * 0.05);
        if (rewardPool < 1) continue;

        const [top10] = await pool.query(`
          SELECT userId, SUM(amount) AS totalContrib
          FROM contributions
          WHERE dropId = ? AND isRefunded = 0
          GROUP BY userId ORDER BY totalContrib DESC LIMIT 10
        `, [drop.id]);
        if (!top10.length) continue;

        const totalTop10 = top10.reduce((s, r) => s + Number(r.totalContrib), 0);
        for (const row of top10) {
          const share = Math.floor(rewardPool * (Number(row.totalContrib) / totalTop10));
          if (share < 1) continue;

          await pool.query(
            'UPDATE userData SET credits = credits + ?, totalCreditsEarned = totalCreditsEarned + ? WHERE id = ?',
            [share, share, row.userId]
          );
          const [[rewardedUser]] = await pool.query('SELECT credits FROM userData WHERE id = ?', [row.userId]);
          await insertWalletTransaction(pool, {
            id: uuidv4(),
            userId: row.userId,
            type: 'contributor_reward',
            amount: share,
            balanceAfter: rewardedUser.credits,
            relatedDropId: drop.id,
            description: `Top contributor reward for "${drop.title}"`,
          });
          await createNotif(pool, {
            userId: row.userId,
            type: 'contributor_reward',
            title: '\uD83D\uDCB0 Contributor reward!',
            message: `You earned ${share.toLocaleString()} credits as a top contributor to "${drop.title}".`,
            priority: 'success',
            category: 'system',
            relatedDropId: drop.id,
            actionUrl: `/drop/${drop.id}/download`,
          });
        }
        rewardedDrops++;
      }
      res.json({ rewardedDrops });
    } catch (err) {
      console.error('POST /api/engine/contributor-rewards error:', err);
      res.status(500).json({ error: 'Contributor rewards failed' });
    }
  });


  // ============================================================
  //  DROP FILE UPLOAD — GCS Signed URL (resumable)
  //
  //  Flow:
  //  1. Client calls POST /api/drops/:id/upload-url with file metadata
  //  2. Server returns a short-lived GCS signed URL
  //  3. Client uploads directly to GCS (file never touches this server)
  //  4. Client calls POST /api/drops/:id/confirm-upload
  //  5. Server verifies the file exists in GCS and updates the DB
  // ============================================================

  // Allowed drop file MIME types
  const DROP_MIME_TYPES = new Set([
    // Video
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac',
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Documents
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Apps / Games
    'application/octet-stream',
    'application/x-msdownload',
    'application/vnd.android.package-archive',
    'application/x-apple-diskimage',
  ]);

  /**
   * POST /api/drops/:id/upload-url
   * Returns a GCS signed resumable-upload URL.
   * Body: { fileName, fileType (MIME), fileSize (bytes) }
   */
  server.post(PROXY + '/api/drops/:id/upload-url', authenticateToken, async (req, res) => {
    try {
      if (!storage) return res.status(503).json({ error: 'Cloud storage not configured' });

      const userId = req.user.id;
      const dropId = req.params.id;
      const { fileName, fileType, fileSize } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({ error: 'fileName and fileType are required' });
      }
      if (!DROP_MIME_TYPES.has(fileType)) {
        return res.status(400).json({ error: `Unsupported file type: ${fileType}` });
      }
      const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
      if (fileSize && +fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File exceeds 5 GB limit' });
      }

      // Verify ownership
      const [[drop]] = await pool.query('SELECT creatorId, status FROM drops WHERE id = ?', [dropId]);
      if (!drop) return res.status(404).json({ error: 'Drop not found' });
      if (drop.creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });
      if (!['draft', 'pending'].includes(drop.status)) {
        return res.status(400).json({ error: 'Can only upload files for draft or pending drops' });
      }

      // Build GCS destination path
      const ext = path.extname(fileName) || '';
      const safeBase = path.basename(fileName, ext)
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9._-]/g, '')
        .slice(0, 100);
      const gcsFileName = `${uuidv4()}_${safeBase}${ext}`;
      const gcsPath = `${DEST_PREFIX}/drops/${userId}/${dropId}/${gcsFileName}`;

      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(gcsPath);

      // Generate a signed resumable-upload URL (15 min expiry)
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: fileType,
      });

      // Store the pending path so confirm-upload can verify it
      await pool.query(
        `UPDATE drops SET filePath = ?, mimeType = ?, fileSize = ? WHERE id = ?`,
        [gcsPath, fileType, fileSize ? +fileSize : null, dropId]
      );

      res.json({
        uploadUrl: signedUrl,
        gcsPath,
        expiresIn: '15 minutes',
        instructions: {
          method: 'PUT',
          headers: { 'Content-Type': fileType },
          body: '(raw file bytes)',
        },
      });
    } catch (err) {
      console.error('POST /api/drops/:id/upload-url error:', err);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  /**
   * POST /api/drops/:id/confirm-upload
   * Client calls this after the direct-to-GCS upload finishes.
   * Server verifies the file exists and finalises the DB record.
   * Body: { originalFileName? }
   */
  server.post(PROXY + '/api/drops/:id/confirm-upload', authenticateToken, async (req, res) => {
    try {
      if (!storage) return res.status(503).json({ error: 'Cloud storage not configured' });

      const userId = req.user.id;
      const dropId = req.params.id;

      const [[drop]] = await pool.query(
        'SELECT creatorId, filePath, status FROM drops WHERE id = ?', [dropId]
      );
      if (!drop) return res.status(404).json({ error: 'Drop not found' });
      if (drop.creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });
      if (!drop.filePath) return res.status(400).json({ error: 'No upload in progress for this drop' });

      // Verify the file actually exists in GCS
      const bucket = storage.bucket(BUCKET_NAME);
      const [exists] = await bucket.file(drop.filePath).exists();
      if (!exists) {
        return res.status(400).json({ error: 'File not found in storage — upload may have failed' });
      }

      // Get actual file metadata from GCS
      const [metadata] = await bucket.file(drop.filePath).getMetadata();

      const updates = {
        fileSize: metadata.size ? +metadata.size : null,
        mimeType: metadata.contentType || null,
      };
      if (req.body.originalFileName) {
        updates.originalFileName = req.body.originalFileName;
      }

      const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      await pool.query(`UPDATE drops SET ${sets} WHERE id = ?`, [...Object.values(updates), dropId]);

      res.json({
        message: 'Upload confirmed',
        fileSize: updates.fileSize,
        mimeType: updates.mimeType,
        gcsPath: drop.filePath,
      });
    } catch (err) {
      console.error('POST /api/drops/:id/confirm-upload error:', err);
      res.status(500).json({ error: 'Failed to confirm upload' });
    }
  });


  // ============================================================
  //  DROP FILE DOWNLOAD — Signed download URL
  //
  //  After a user purchases a download (POST /api/drops/:id/download),
  //  this endpoint returns a short-lived signed URL so the client
  //  can stream the file directly from GCS.
  // ============================================================

  /**
   * GET /api/drops/:id/download-url
   * Returns a 1-hour signed download URL. Must have a download record.
   */
  server.get(PROXY + '/api/drops/:id/download-url', authenticateToken, async (req, res) => {
    try {
      if (!storage) return res.status(503).json({ error: 'Cloud storage not configured' });

      const userId = req.user.id;
      const dropId = req.params.id;

      // Verify purchase
      const [[dl]] = await pool.query(
        'SELECT id FROM dropDownloads WHERE dropId = ? AND userId = ?', [dropId, userId]
      );
      if (!dl) return res.status(403).json({ error: 'You have not purchased this drop' });

      const [[drop]] = await pool.query('SELECT filePath, title FROM drops WHERE id = ?', [dropId]);
      if (!drop || !drop.filePath) return res.status(404).json({ error: 'Drop file not found' });

      const bucket = storage.bucket(BUCKET_NAME);
      const file = bucket.file(drop.filePath);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
        responseDisposition: `attachment; filename="${(drop.title || 'download').replace(/"/g, '_')}"`,
      });

      res.json({ downloadUrl: signedUrl, expiresIn: '1 hour' });
    } catch (err) {
      console.error('GET /api/drops/:id/download-url error:', err);
      res.status(500).json({ error: 'Failed to generate download URL' });
    }
  });


  // ============================================================
  //  BANNER / THUMBNAIL UPLOAD (multer — small images only)
  // ============================================================

  const bannerStorage = multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(__dirname, 'uploads', 'banners', req.user.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  const bannerUpload = multer({
    storage: bannerStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter(_req, file, cb) {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for banners'), false);
      }
      cb(null, true);
    },
  });

  /**
   * POST /api/drops/:id/banner
   * Upload a banner/thumbnail image for a drop.
   */
  server.post(
    PROXY + '/api/drops/:id/banner',
    authenticateToken,
    bannerUpload.single('banner'),
    async (req, res) => {
      try {
        const userId = req.user.id;
        const dropId = req.params.id;

        const [[drop]] = await pool.query('SELECT creatorId, status FROM drops WHERE id = ?', [dropId]);
        if (!drop) return res.status(404).json({ error: 'Drop not found' });
        if (drop.creatorId !== userId) return res.status(403).json({ error: 'Not the creator' });

        if (!req.file) return res.status(400).json({ error: 'No banner file provided' });

        // If GCS is available, upload to cloud; otherwise serve locally
        let thumbnailUrl;
        if (storage) {
          const ext = path.extname(req.file.originalname) || '.jpg';
          const gcsPath = `${DEST_PREFIX}/banners/${userId}/${uuidv4()}${ext}`;
          const bucket = storage.bucket(BUCKET_NAME);
          await bucket.upload(req.file.path, {
            destination: gcsPath,
            metadata: { contentType: req.file.mimetype },
          });
          await bucket.file(gcsPath).makePublic().catch(() => {});
          thumbnailUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${encodeURI(gcsPath)}`;
          // Clean up local temp file
          fs.unlink(req.file.path, () => {});
        } else {
          thumbnailUrl = `/uploads/banners/${userId}/${req.file.filename}`;
        }

        await pool.query('UPDATE drops SET thumbnailUrl = ? WHERE id = ?', [thumbnailUrl, dropId]);

        res.json({ message: 'Banner uploaded', thumbnailUrl });
      } catch (err) {
        console.error('POST /api/drops/:id/banner error:', err);
        res.status(500).json({ error: 'Banner upload failed' });
      }
    }
  );

  // ============================================================
  //  NOTIFICATIONS
  // ============================================================

  /** GET /api/notifications/me — paginated, newest first */
  server.get(PROXY + '/api/notifications/me', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = Math.min(50, +(req.query.limit || 20));
      const [rows] = await pool.query(
        `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
        [userId, limit]
      );
      const unreadCount = rows.filter((r) => !r.isRead).length;
      res.json({ notifications: rows, unreadCount });
    } catch (err) {
      console.error('GET /api/notifications/me error:', err);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  /** PATCH /api/notifications/read-all — mark all as read */
  server.patch(PROXY + '/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
      await pool.query('UPDATE notifications SET isRead = 1 WHERE userId = ?', [req.user.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark all read' });
    }
  });

  /** PATCH /api/notifications/:id/read — mark one as read */
  server.patch(PROXY + '/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      await pool.query(
        'UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?',
        [req.params.id, req.user.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to mark read' });
    }
  });

  /** DELETE /api/notifications/:id — delete a single notification */
  server.delete(PROXY + '/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM notifications WHERE id = ? AND userId = ?',
        [req.params.id, req.user.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });


  // ============================================================
  //  HISTORY — Unified payment/activity history endpoints
  // ============================================================

  /**
   * GET /api/history/purchases
   * Returns the authenticated user's credit purchase history.
   */
  server.get(PROXY + '/api/history/purchases', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, credits, amountPaid, currency, paymentMethod, status, txHash, created_at
         FROM CreditPurchases
         WHERE userId = ?
         ORDER BY created_at DESC
         LIMIT 200`,
        [req.user.id]
      );
      res.json({ purchases: rows });
    } catch (err) {
      console.error('GET /api/history/purchases error:', err);
      res.status(500).json({ error: 'Failed to fetch purchase history' });
    }
  });

  /**
   * GET /api/history/downloads
   * Returns the authenticated user's paid download history.
   */
  server.get(PROXY + '/api/history/downloads', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT dd.id, dd.dropId, d.title AS dropTitle, dd.pricePaid, dd.basePrice,
                dd.contributorDiscount, dd.timeDecayDiscount, dd.volumeDecayDiscount,
                dd.downloadNumber, dd.created_at
         FROM dropDownloads dd
         JOIN drops d ON d.id = dd.dropId
         WHERE dd.userId = ?
         ORDER BY dd.created_at DESC
         LIMIT 200`,
        [req.user.id]
      );
      res.json({ downloads: rows });
    } catch (err) {
      console.error('GET /api/history/downloads error:', err);
      res.status(500).json({ error: 'Failed to fetch download history' });
    }
  });

  /**
   * GET /api/history/memberships
   * Returns membership charge history. Placeholder until the memberships table exists.
   */
  server.get(PROXY + '/api/history/memberships', authenticateToken, async (req, res) => {
    try {
      // Check if memberships table exists
      const [[tableCheck]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'memberships'`
      );
      if (!tableCheck || tableCheck.cnt === 0) {
        return res.json({ memberships: [], activePlan: null });
      }
      const [rows] = await pool.query(
        `SELECT id, plan, amount, billingPeriod, status, created_at
         FROM memberships
         WHERE userId = ?
         ORDER BY created_at DESC
         LIMIT 200`,
        [req.user.id]
      );
      const [[active]] = await pool.query(
        `SELECT plan FROM memberships WHERE userId = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [req.user.id]
      );
      res.json({ memberships: rows, activePlan: active?.plan || null });
    } catch (err) {
      console.error('GET /api/history/memberships error:', err);
      res.status(500).json({ error: 'Failed to fetch membership history' });
    }
  });

  /**
   * GET /api/history/earnings
   * Returns the authenticated user's creator earnings from downloads.
   */
  server.get(PROXY + '/api/history/earnings', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT wt.id, wt.amount, wt.balanceAfter, wt.relatedDropId, wt.description, wt.created_at,
                d.title AS dropTitle
         FROM walletTransactions wt
         LEFT JOIN drops d ON d.id = wt.relatedDropId
         WHERE wt.userId = ? AND wt.type = 'creator_earning'
         ORDER BY wt.created_at DESC
         LIMIT 200`,
        [req.user.id]
      );
      
      // Calculate total earnings
      const totalEarned = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
      
      res.json({ earnings: rows, totalEarned });
    } catch (err) {
      console.error('GET /api/history/earnings error:', err);
      res.status(500).json({ error: 'Failed to fetch earnings history' });
    }
  });

  /**
   * GET /api/history/promo-charges
   * Returns promo deployment charges billed to the authenticated user.
   */
  server.get(PROXY + '/api/history/promo-charges', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT wt.id, wt.amount, wt.balanceAfter, wt.description, wt.created_at
         FROM walletTransactions wt
         WHERE wt.userId = ?
           AND wt.amount < 0
           AND wt.description LIKE 'Promo charge:%'
         ORDER BY wt.created_at DESC
         LIMIT 200`,
        [req.user.id]
      );

      const totalCharged = rows.reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);
      res.json({ charges: rows, totalCharged });
    } catch (err) {
      console.error('GET /api/history/promo-charges error:', err);
      res.status(500).json({ error: 'Failed to fetch promo charge history' });
    }
  });

  console.log('✅ Drauwper routes loaded')};
