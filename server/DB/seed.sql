-- ============================================================
--  Drauwpr — Seed / Mock Data
--
--  Run with:  mysql -u root drauwper < server/DB/seed.sql
--
--  Inserts: 12 users, 4 drops, 16 contributions, 3 reviews,
--           4 downloads, 5 favorites, 10 follower pairs,
--           5 credit purchases, 24 wallet transactions,
--           4 contributor rewards, 6 notifications,
--           4 momentum-log entries.
--
--  All passwords hash to: "password123" (bcrypt, 10 rounds)
--  All IDs match the frontend mock data in src/data/mock.ts
-- ============================================================

SET @bcrypt_hash = '$2b$10$KIXQK4VxoOVsm7gKXMZ0/.1GhFJKPOcpjGvVj/dShBdwBJPwreT8G';

-- -----------------------------------------------------------
--  1. USERS (userData)
-- -----------------------------------------------------------
INSERT INTO `userData`
  (`id`, `username`, `email`, `passwordHash`, `credits`, `firstName`, `lastName`,
   `accountType`, `totalDropsCreated`, `totalCreditsEarned`, `creatorRating`,
   `bio`, `profilePicture`, `verification`, `createdAt`, `updatedAt`)
VALUES
  -- Primary test user
  ('u1',        'ikem',              'ikem@drauwpr.com',          @bcrypt_hash, 25000,   'Ikem',    'Nkur',     'creator',  0, 0,        NULL,  'Platform founder & tester.',                                               NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 30 DAY) * 1000, UNIX_TIMESTAMP() * 1000),

  -- 4 Creators (match mockProfiles)
  ('creator-1', 'StarForge Studios', 'starforge@drauwpr.com',     @bcrypt_hash, 85000,   'Star',    'Forge',    'creator',  7, 1850000,  91.00, 'Indie game studio crafting pixel-art adventures.',                          NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 180 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('creator-2', 'RetroSonic',        'retrosonic@drauwpr.com',    @bcrypt_hash, 42000,   'Retro',   'Sonic',    'creator', 12,  920000,  87.00, 'Music producer & sound designer specializing in synthwave.',                NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 90 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('creator-3', 'MindLab',           'mindlab@drauwpr.com',       @bcrypt_hash, 63000,   'Mind',    'Lab',      'creator',  3,  640000,  94.00, 'Building tools for deep work and intentional living.',                      NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 240 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('creator-4', 'Dr. Elena Markov',  'elena.markov@drauwpr.com',  @bcrypt_hash, 15000,   'Elena',   'Markov',   'creator',  2,  185000,  76.00, 'Cryptography researcher. Decentralized identity & ZKPs.',                   NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 60 DAY) * 1000, UNIX_TIMESTAMP() * 1000),

  -- 8 Contributors / Regular users (match mockContributors + mockProfiles)
  ('c1',        'blaze_runner',      'blaze@drauwpr.com',         @bcrypt_hash, 12000,   'Blake',   'Runner',   'free',     0,       0,  68.00, 'Full-stack dev and avid gamer. Burning credits since day one.',              NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 45 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c2',        'neon_drift',        'neon@drauwpr.com',          @bcrypt_hash,  8500,   'Neon',    'Drift',    'creator',  1,   52000,  72.00, 'UI designer who loves neon aesthetics and late-night coding sessions.',      NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 30 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c3',        'pixel_witch',       'pixel@drauwpr.com',         @bcrypt_hash, 31000,   'Pixa',    'Witch',    'free',     0,       0,  85.00, 'Pixel artist and game jam enthusiast. Top contributor on multiple drops.',   NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 120 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c4',        'data_monk',         'datamonk@drauwpr.com',      @bcrypt_hash,  4200,   'Daniel',  'Monk',     'free',     0,       0,  60.00, 'Data engineer with a passion for decentralized systems.',                    NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 20 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c5',        'sky_coder',         'skycoder@drauwpr.com',      @bcrypt_hash, 18000,   'Sky',     'Coder',    'free',     0,       0,  74.00, 'Freelance developer. I review everything I download.',                      NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 80 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c6',        'luna_byte',         'luna@drauwpr.com',          @bcrypt_hash,  6800,   'Luna',    'Byte',     'free',     0,       0,  65.00, 'Night-owl coder and music lover.',                                          NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 15 DAY) * 1000, UNIX_TIMESTAMP() * 1000),
  ('c7',        'turbo_dev',         'turbo@drauwpr.com',         @bcrypt_hash, 22000,   'Turbo',   'Dev',      'creator',  2,  310000,  79.00, 'Speed is everything. Building fast apps and burning credits faster.',        NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 150 DAY) * 1000, UNIX_TIMESTAMP() * 1000);


-- c8 (echo_wave) — separated because it's the last one
INSERT INTO `userData`
  (`id`, `username`, `email`, `passwordHash`, `credits`, `firstName`, `lastName`,
   `accountType`, `totalDropsCreated`, `totalCreditsEarned`, `creatorRating`,
   `bio`, `profilePicture`, `verification`, `createdAt`, `updatedAt`)
VALUES
  ('c8',        'echo_wave',         'echo@drauwpr.com',          @bcrypt_hash,  1500,   'Echo',    'Wave',     'free',     0,       0,  58.00, 'Audio engineer and sound enthusiast.',                                       NULL, 'verified', UNIX_TIMESTAMP(NOW() - INTERVAL 10 DAY) * 1000, UNIX_TIMESTAMP() * 1000);


-- -----------------------------------------------------------
--  2. DROPS
-- -----------------------------------------------------------
INSERT INTO `drops`
  (`id`, `creatorId`, `title`, `description`, `fileType`, `fileSize`,
   `tags`, `scheduledDropTime`, `expiresAt`,
   `goalAmount`, `currentContributions`, `contributorCount`,
   `momentum`, `burnRate`, `lastMomentumUpdate`,
   `sensitivity`, `decayConstant`, `basePrice`,
   `dailyPriceDecayPct`, `volumeDecayStep`, `volumeDecayPct`,
   `totalDownloads`, `totalRevenue`, `avgRating`, `reviewCount`, `likeCount`, `dislikeCount`,
   `status`, `isPublic`, `created_at`)
VALUES
  -- Drop 1: Active game (high burn rate)
  (
    'drop-1', 'creator-1',
    'Nebula Quest — Indie Space RPG',
    'A hand-crafted pixel-art space RPG with procedurally generated galaxies, over 200 quests, and a branching storyline. Explore, trade, and fight your way across the cosmos.',
    'game', 1288490189,
    '["game","rpg","indie","pixel-art","space"]',
    NOW() + INTERVAL 48 HOUR, NOW() + INTERVAL 7 DAY,
    500000, 312500, 1247,
    2.4, 3.4, NOW(),
    5, 0.0003, 15000,
    5.00, 1000, 5.00,
    0, 0, NULL, 0, 0, 0,
    'active', 1, NOW() - INTERVAL 2 DAY
  ),

  -- Drop 2: Active music pack (over goal, high momentum)
  (
    'drop-2', 'creator-2',
    'SynthWave Producer Pack Vol. 3',
    '400+ royalty-free synthwave samples, loops, and presets for Serum & Vital. Perfect for retro-inspired music production.',
    'music', 891289600,
    '["music","samples","synthwave","production"]',
    NOW() + INTERVAL 12 HOUR, NOW() + INTERVAL 5 DAY,
    200000, 210000, 843,
    4.1, 5.1, NOW(),
    5, 0.0003, 8000,
    5.00, 500, 5.00,
    0, 0, NULL, 0, 0, 0,
    'active', 1, NOW() - INTERVAL 1 DAY
  ),

  -- Drop 3: Dropped (released) app
  (
    'drop-3', 'creator-3',
    'ZenFocus — Productivity App',
    'A minimalist Pomodoro + task manager with focus analytics, ambient soundscapes, and deep-work streaks.',
    'app', 47185920,
    '["app","productivity","pomodoro","focus"]',
    NOW() - INTERVAL 6 HOUR, NOW() + INTERVAL 2 DAY,
    100000, 100000, 520,
    0, 1, NOW() - INTERVAL 6 HOUR,
    5, 0.0003, 5000,
    5.00, 1000, 5.00,
    2340, 8424000, 78.33, 3, 2, 0,
    'dropped', 1, NOW() - INTERVAL 5 DAY
  ),

  -- Drop 4: Pending document (low contributions so far)
  (
    'drop-4', 'creator-4',
    'CryptoWhitepaper: Decentralized Identity',
    'An in-depth technical whitepaper on self-sovereign identity using zero-knowledge proofs. 92 pages of research.',
    'document', 4404019,
    '["document","crypto","identity","zkp"]',
    NOW() + INTERVAL 96 HOUR, NOW() + INTERVAL 10 DAY,
    300000, 42000, 187,
    0.3, 1.3, NOW(),
    5, 0.0003, 3000,
    5.00, 500, 5.00,
    0, 0, NULL, 0, 0, 0,
    'pending', 1, NOW() - INTERVAL 1 DAY
  );


-- -----------------------------------------------------------
--  3. CONTRIBUTIONS (16 records across the 4 drops)
-- -----------------------------------------------------------
INSERT INTO `contributions`
  (`id`, `dropId`, `userId`, `amount`,
   `momentumBefore`, `momentumAfter`, `burnRateAfter`,
   `waitPenaltyPct`, `penaltyAmount`, `isRefunded`, `created_at`, `isVerified`)
VALUES
  -- Drop 1 contributions
  ('cont-0101', 'drop-1', 'c1', 25000,  0.0, 0.010, 1.010, 0.00, 0, 0, NOW() - INTERVAL 2 HOUR, 0),
  ('cont-0102', 'drop-1', 'c3', 50000,  0.010, 0.030, 1.030, 0.00, 0, 0, NOW() - INTERVAL 1 HOUR, 0),
  ('cont-0103', 'drop-1', 'c5', 15000,  0.030, 0.036, 1.036, 0.00, 0, 0, NOW() - INTERVAL 3 HOUR, 0),
  ('cont-0104', 'drop-1', 'c7', 30000,  0.036, 0.048, 1.048, 0.00, 0, 0, NOW() - INTERVAL 5 HOUR, 0),

  -- Drop 2 contributions
  ('cont-0201', 'drop-2', 'c2', 10000,  0.0, 0.010, 1.010, 0.00, 0, 0, NOW() - INTERVAL 4 HOUR, 0),
  ('cont-0202', 'drop-2', 'c6',  8000,  0.010, 0.018, 1.018, 0.00, 0, 0, NOW() - INTERVAL 30 MINUTE, 0),
  ('cont-0203', 'drop-2', 'c8',  2500,  0.018, 0.021, 1.021, 0.00, 0, 0, NOW() - INTERVAL 45 MINUTE, 0),
  ('cont-0204', 'drop-2', 'c1', 12000,  0.021, 0.033, 1.033, 0.00, 0, 0, NOW() - INTERVAL 2 HOUR, 0),

  -- Drop 3 contributions (already dropped)
  ('cont-0301', 'drop-3', 'c1',  8000,  0.0, 0.016, 1.016, 0.00, 0, 0, NOW() - INTERVAL 4 DAY, 0),
  ('cont-0302', 'drop-3', 'c3', 20000,  0.016, 0.056, 1.056, 0.00, 0, 0, NOW() - INTERVAL 3 DAY, 0),
  ('cont-0303', 'drop-3', 'c5', 10000,  0.056, 0.076, 1.076, 0.00, 0, 0, NOW() - INTERVAL 2 DAY, 0),
  ('cont-0304', 'drop-3', 'c4',  5000,  0.076, 0.086, 1.086, 0.00, 0, 0, NOW() - INTERVAL 36 HOUR, 0),

  -- Drop 4 contributions
  ('cont-0401', 'drop-4', 'c4',  5000,  0.0, 0.003, 1.003, 0.00, 0, 0, NOW() - INTERVAL 20 HOUR, 0),
  ('cont-0402', 'drop-4', 'c7', 15000,  0.003, 0.013, 1.013, 0.00, 0, 0, NOW() - INTERVAL 18 HOUR, 0),
  ('cont-0403', 'drop-4', 'c2',  8000,  0.013, 0.019, 1.019, 0.00, 0, 0, NOW() - INTERVAL 12 HOUR, 0),
  ('cont-0404', 'drop-4', 'c8',  2000,  0.019, 0.020, 1.020, 0.00, 0, 0, NOW() - INTERVAL 8 HOUR, 0);


-- -----------------------------------------------------------
--  4. MOMENTUM LOG (one per drop — last contribution event)
-- -----------------------------------------------------------
INSERT INTO `momentumLog`
  (`dropId`, `contributionId`,
   `momentumBefore`, `momentumAfter`, `burnRateBefore`, `burnRateAfter`,
   `clockSecondsRemaining`, `eventType`)
VALUES
  ('drop-1', 'cont-0104', 0.036, 0.048, 1.036, 1.048, 172800, 'contribution'),
  ('drop-2', 'cont-0204', 0.021, 0.033, 1.021, 1.033,  43200, 'contribution'),
  ('drop-3', 'cont-0304', 0.076, 0.086, 1.076, 1.086,      0, 'contribution'),
  ('drop-4', 'cont-0404', 0.019, 0.020, 1.019, 1.020, 345600, 'contribution');


-- -----------------------------------------------------------
--  5. REVIEWS (for drop-3 which is "dropped" / released)
-- -----------------------------------------------------------
INSERT INTO `dropReviews`
  (`id`, `dropId`, `userId`, `comment`, `liked`, `rating`, `isEdited`, `isHidden`, `created_at`)
VALUES
  ('rev-01', 'drop-3', 'c1',
   'Incredible focus app — the ambient soundscapes are next-level. Using it every day now.',
   1, 92, 0, 0, NOW() - INTERVAL 1 HOUR),

  ('rev-02', 'drop-3', 'c3',
   'Solid overall but the tutorial could use more polish. Feature set is great though.',
   1, 78, 0, 0, NOW() - INTERVAL 2 HOUR),

  ('rev-03', 'drop-3', 'c5',
   'Not exactly my style but I can see the quality. Recommending to friends who need focus tools.',
   NULL, 65, 0, 0, NOW() - INTERVAL 3 HOUR);


-- -----------------------------------------------------------
--  6. DOWNLOADS (4 users downloaded drop-3)
-- -----------------------------------------------------------
INSERT INTO `dropDownloads`
  (`id`, `dropId`, `userId`, `pricePaid`, `basePrice`,
   `contributorDiscount`, `timeDecayDiscount`, `volumeDecayDiscount`,
   `downloadNumber`, `created_at`)
VALUES
  ('dl-01', 'drop-3', 'c1', 3500, 5000, 8.00,  1.25, 0.00, 1,    NOW() - INTERVAL 5 HOUR),
  ('dl-02', 'drop-3', 'c3', 2800, 5000, 20.00, 1.25, 0.00, 2,    NOW() - INTERVAL 4 HOUR),
  ('dl-03', 'drop-3', 'c5', 3900, 5000, 10.00, 1.25, 0.00, 3,    NOW() - INTERVAL 3 HOUR),
  ('dl-04', 'drop-3', 'c4', 4500, 5000, 5.00,  1.25, 0.00, 4,    NOW() - INTERVAL 2 HOUR);


-- -----------------------------------------------------------
--  7. FAVORITES / WAITLIST
-- -----------------------------------------------------------
INSERT INTO `dropFavorites` (`dropId`, `userId`, `notifyOnRelease`, `notifyOnGoalMet`)
VALUES
  ('drop-1', 'c1', 1, 0),
  ('drop-1', 'c3', 1, 1),
  ('drop-2', 'c6', 1, 0),
  ('drop-4', 'c4', 1, 1),
  ('drop-4', 'u1', 1, 0);


-- -----------------------------------------------------------
--  8. FOLLOWERS
-- -----------------------------------------------------------
INSERT INTO `followers` (`followerId`, `followeeId`)
VALUES
  ('c1', 'creator-1'),
  ('c3', 'creator-1'),
  ('c5', 'creator-1'),
  ('c7', 'creator-1'),
  ('c2', 'creator-2'),
  ('c6', 'creator-2'),
  ('c1', 'creator-3'),
  ('c3', 'creator-3'),
  ('c4', 'creator-4'),
  ('u1', 'creator-1');


-- -----------------------------------------------------------
--  9. CREDIT PURCHASES (CreditPurchases)
-- -----------------------------------------------------------
INSERT INTO `CreditPurchases`
  (`id`, `userId`, `username`, `email`, `credits`, `package`,
   `amountPaid`, `currency`, `paymentMethod`, `status`,
   `stripePaymentIntentId`, `created_at`)
VALUES
  ('pur-001', 'u1',  'ikem',         'ikem@drauwpr.com',      25000,  '25000',  25.00, 'USD', 'stripe', 'completed', 'pi_mock_001', NOW() - INTERVAL 28 DAY),
  ('pur-002', 'c1',  'blaze_runner', 'blaze@drauwpr.com',     50000,  '50000',  50.00, 'USD', 'stripe', 'completed', 'pi_mock_002', NOW() - INTERVAL 40 DAY),
  ('pur-003', 'c3',  'pixel_witch',  'pixel@drauwpr.com',    100000, '100000', 100.00, 'USD', 'stripe', 'completed', 'pi_mock_003', NOW() - INTERVAL 100 DAY),
  ('pur-004', 'c7',  'turbo_dev',    'turbo@drauwpr.com',     50000,  '50000',  50.00, 'USD', 'stripe', 'completed', 'pi_mock_004', NOW() - INTERVAL 140 DAY),
  ('pur-005', 'c5',  'sky_coder',    'skycoder@drauwpr.com',  25000,  '25000',  25.00, 'USD', 'stripe', 'completed', 'pi_mock_005', NOW() - INTERVAL 70 DAY);


-- -----------------------------------------------------------
--  10. WALLET TRANSACTIONS (immutable credit ledger)
-- -----------------------------------------------------------
INSERT INTO `walletTransactions`
  (`id`, `userId`, `type`, `amount`, `balanceAfter`,
   `relatedDropId`, `relatedPurchaseId`, `relatedContributionId`,
   `description`, `created_at`)
VALUES
  -- Credit purchases (positive)
  ('wt-001', 'u1',  'purchase',          25000,  25000, NULL,      'pur-001', NULL,        'Purchased 25,000 credits',         NOW() - INTERVAL 28 DAY),
  ('wt-002', 'c1',  'purchase',          50000,  50000, NULL,      'pur-002', NULL,        'Purchased 50,000 credits',         NOW() - INTERVAL 40 DAY),
  ('wt-003', 'c3',  'purchase',         100000, 100000, NULL,      'pur-003', NULL,        'Purchased 100,000 credits',        NOW() - INTERVAL 100 DAY),
  ('wt-004', 'c7',  'purchase',          50000,  50000, NULL,      'pur-004', NULL,        'Purchased 50,000 credits',         NOW() - INTERVAL 140 DAY),
  ('wt-005', 'c5',  'purchase',          25000,  25000, NULL,      'pur-005', NULL,        'Purchased 25,000 credits',         NOW() - INTERVAL 70 DAY),

  -- Contributions (negative)
  ('wt-010', 'c1',  'contribution',     -25000,  25000, 'drop-1',  NULL,      'cont-0101', 'Contributed to Nebula Quest',      NOW() - INTERVAL 2 HOUR),
  ('wt-011', 'c3',  'contribution',     -50000,  50000, 'drop-1',  NULL,      'cont-0102', 'Contributed to Nebula Quest',      NOW() - INTERVAL 1 HOUR),
  ('wt-012', 'c5',  'contribution',     -15000,  10000, 'drop-1',  NULL,      'cont-0103', 'Contributed to Nebula Quest',      NOW() - INTERVAL 3 HOUR),
  ('wt-013', 'c7',  'contribution',     -30000,  20000, 'drop-1',  NULL,      'cont-0104', 'Contributed to Nebula Quest',      NOW() - INTERVAL 5 HOUR),
  ('wt-014', 'c2',  'contribution',     -10000,   8500, 'drop-2',  NULL,      'cont-0201', 'Contributed to SynthWave Pack',    NOW() - INTERVAL 4 HOUR),
  ('wt-015', 'c6',  'contribution',      -8000,   6800, 'drop-2',  NULL,      'cont-0202', 'Contributed to SynthWave Pack',    NOW() - INTERVAL 30 MINUTE),
  ('wt-016', 'c1',  'contribution',      -8000,  17000, 'drop-3',  NULL,      'cont-0301', 'Contributed to ZenFocus',          NOW() - INTERVAL 4 DAY),
  ('wt-017', 'c3',  'contribution',     -20000,  30000, 'drop-3',  NULL,      'cont-0302', 'Contributed to ZenFocus',          NOW() - INTERVAL 3 DAY),

  -- Download payments (negative — buyers)
  ('wt-020', 'c1',  'download_payment',  -3500,  13500, 'drop-3',  NULL,      NULL,        'Downloaded ZenFocus',              NOW() - INTERVAL 5 HOUR),
  ('wt-021', 'c3',  'download_payment',  -2800,  27200, 'drop-3',  NULL,      NULL,        'Downloaded ZenFocus',              NOW() - INTERVAL 4 HOUR),
  ('wt-022', 'c5',  'download_payment',  -3900,   6100, 'drop-3',  NULL,      NULL,        'Downloaded ZenFocus',              NOW() - INTERVAL 3 HOUR),
  ('wt-023', 'c4',  'download_payment',  -4500,   4200, 'drop-3',  NULL,      NULL,        'Downloaded ZenFocus',              NOW() - INTERVAL 2 HOUR),

  -- Creator earnings (positive — creator-3 earns from ZenFocus sales)
  ('wt-030', 'creator-3', 'creator_earning', 3500, 66500, 'drop-3', NULL, NULL, 'Download sale: ZenFocus', NOW() - INTERVAL 5 HOUR),
  ('wt-031', 'creator-3', 'creator_earning', 2800, 69300, 'drop-3', NULL, NULL, 'Download sale: ZenFocus', NOW() - INTERVAL 4 HOUR),
  ('wt-032', 'creator-3', 'creator_earning', 3900, 73200, 'drop-3', NULL, NULL, 'Download sale: ZenFocus', NOW() - INTERVAL 3 HOUR),
  ('wt-033', 'creator-3', 'creator_earning', 4500, 77700, 'drop-3', NULL, NULL, 'Download sale: ZenFocus', NOW() - INTERVAL 2 HOUR),

  -- Bonus (welcome credits for ikem)
  ('wt-040', 'u1', 'bonus', 5000, 30000, NULL, NULL, NULL, 'Welcome bonus: 5,000 credits', NOW() - INTERVAL 29 DAY),

  -- Creator payout
  ('wt-041', 'creator-3', 'creator_payout', -14700, 63000, NULL, NULL, NULL, 'Payout: $14.70 via Stripe', NOW() - INTERVAL 1 HOUR);


-- -----------------------------------------------------------
--  11. CONTRIBUTOR REWARDS (top contributors on drop-3)
-- -----------------------------------------------------------
INSERT INTO `contributorRewards`
  (`dropId`, `userId`, `tier`, `totalContributed`, `percentOfGoal`,
   `discountPct`, `fastDownload`, `commissionPct`, `shoutout`, `badgeAwarded`)
VALUES
  ('drop-3', 'c3', 'gold',     20000, 20.00, 20.00, 1, 2.00, 1, 'gold-contributor'),
  ('drop-3', 'c5', 'silver',   10000, 10.00, 10.00, 0, 1.00, 0, 'silver-contributor'),
  ('drop-3', 'c1', 'bronze',    8000,  8.00,  5.00, 0, 0.00, 0, 'bronze-contributor'),
  ('drop-3', 'c4', 'bronze',    5000,  5.00,  5.00, 0, 0.00, 0, 'bronze-contributor');


-- -----------------------------------------------------------
--  12. CREATOR PAYOUT (one record for MindLab)
-- -----------------------------------------------------------
INSERT INTO `creatorPayouts`
  (`id`, `creatorId`, `creditsWithdrawn`, `amountUSD`,
   `payoutMethod`, `stripeTransferId`, `status`, `processedAt`)
VALUES
  ('payout-001', 'creator-3', 14700, 14.70, 'stripe', 'tr_mock_001', 'completed', NOW() - INTERVAL 1 HOUR);


-- -----------------------------------------------------------
--  13. NOTIFICATIONS
-- -----------------------------------------------------------
INSERT INTO `notifications`
  (`id`, `userId`, `type`, `title`, `message`, `priority`, `category`,
   `relatedDropId`, `actionUrl`, `isRead`)
VALUES
  ('notif-01', 'creator-1', 'contribution', 'New contribution!',
   'blaze_runner contributed 25,000 credits to Nebula Quest.',
   'success', 'contribution_received', 'drop-1', '/drop/drop-1', 0),

  ('notif-02', 'creator-2', 'goal_reached', 'Spark goal reached!',
   'SynthWave Producer Pack Vol. 3 hit its spark goal — the timer is accelerating!',
   'success', 'goal_reached', 'drop-2', '/drop/drop-2', 0),

  ('notif-03', 'c1', 'drop_released', 'ZenFocus has dropped!',
   'The ZenFocus app is now available for download.',
   'info', 'drop_released', 'drop-3', '/drop/drop-3/download', 1),

  ('notif-04', 'creator-3', 'review_received', 'New review on ZenFocus',
   'blaze_runner rated ZenFocus 92/100 — "Incredible focus app"',
   'info', 'review_received', 'drop-3', '/drop/drop-3', 0),

  ('notif-05', 'u1', 'credit_purchase', 'Credits added!',
   'Your purchase of 25,000 credits has been confirmed.',
   'success', 'credit_purchase', NULL, '/buy-credits', 1),

  ('notif-06', 'creator-3', 'account', 'Payout complete',
   'Your payout of $14.70 has been sent to your Stripe account.',
   'success', 'account', NULL, '/account', 0);


-- -----------------------------------------------------------
--  Done! 🚀
-- -----------------------------------------------------------
SELECT '✅ Seed data loaded successfully' AS status,
       (SELECT COUNT(*) FROM userData) AS users,
       (SELECT COUNT(*) FROM drops) AS drops,
       (SELECT COUNT(*) FROM contributions) AS contributions,
       (SELECT COUNT(*) FROM dropReviews) AS reviews,
       (SELECT COUNT(*) FROM dropDownloads) AS downloads,
       (SELECT COUNT(*) FROM walletTransactions) AS wallet_txns,
       (SELECT COUNT(*) FROM followers) AS follower_pairs;
