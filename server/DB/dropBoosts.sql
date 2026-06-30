-- ============================================================
--  postBoosts — tracks active and historical post boosts
--
--  Run once against the production database.
-- ============================================================

CREATE TABLE IF NOT EXISTS postBoosts (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  postId           VARCHAR(36)   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  userId           VARCHAR(10)    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL, -- creator who paid

  -- Campaign pre-allocation
  budget           INT UNSIGNED  NOT NULL,                  -- initial pre-allocated amount
  campaignBalance  INT UNSIGNED  NOT NULL,                  -- server-deducted campaign wallet
  campaignSpent    INT UNSIGNED  NOT NULL DEFAULT 0,
  remainingBudget  INT UNSIGNED  NOT NULL,                  -- compatibility mirror

  -- Pricing
  costPerView      INT UNSIGNED  NOT NULL DEFAULT 4,        -- credits charged per watcher
  costPerHour      INT UNSIGNED  NOT NULL DEFAULT 2,        -- credits charged per hour active
  priorityProbability DECIMAL(4,3) NOT NULL DEFAULT 0.300,

  -- Limits (NULL = no limit)
  maxImpressions   INT UNSIGNED           DEFAULT NULL,
  impressionCount  INT UNSIGNED  NOT NULL DEFAULT 0,
  durationHours    INT UNSIGNED           DEFAULT NULL,
  endsAt           DATETIME               DEFAULT NULL,

  -- Lifecycle
  status           ENUM('active','paused','completed','cancelled')
                                 NOT NULL DEFAULT 'active',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_postBoosts_postId  (postId),
  INDEX idx_postBoosts_userId  (userId),
  INDEX idx_postBoosts_status  (status),
  INDEX idx_postBoosts_endsAt  (endsAt),

  CONSTRAINT fk_postBoosts_postId  FOREIGN KEY (postId)  REFERENCES posts(id)     ON DELETE CASCADE,
  CONSTRAINT fk_postBoosts_userId  FOREIGN KEY (userId)  REFERENCES userData(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE postBoosts
  MODIFY COLUMN postId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  MODIFY COLUMN userId VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  MODIFY COLUMN id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL;

ALTER TABLE postBoosts ADD COLUMN IF NOT EXISTS campaignBalance INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE postBoosts ADD COLUMN IF NOT EXISTS campaignSpent INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE postBoosts ADD COLUMN IF NOT EXISTS priorityProbability DECIMAL(4,3) NOT NULL DEFAULT 0.300;
ALTER TABLE postBoosts MODIFY COLUMN costPerHour INT UNSIGNED NOT NULL DEFAULT 2;

-- Dedicated campaign balance table is created manually to avoid FK/collation
-- issues on mixed MySQL/MariaDB deployments. Use this compatible schema:
--
-- CREATE TABLE `boostCampaignBalances` (
--   `id` varchar(36) NOT NULL,
--   `boostId` varchar(36) NOT NULL,
--   `postId` varchar(36) NOT NULL,
--   `userId` varchar(10) NOT NULL,
--   `initialBalance` int unsigned NOT NULL,
--   `currentBalance` int unsigned NOT NULL,
--   `totalSpent` int unsigned NOT NULL DEFAULT 0,
--   `status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active',
--   `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `idx_boostCampaignBalances_boostId` (`boostId`),
--   KEY `idx_boostCampaignBalances_postId` (`postId`),
--   KEY `idx_boostCampaignBalances_userId` (`userId`),
--   KEY `idx_boostCampaignBalances_status` (`status`),
--   CONSTRAINT `fk_boostCampaignBalances_boostId` FOREIGN KEY (`boostId`) REFERENCES `postBoosts` (`id`) ON DELETE CASCADE,
--   CONSTRAINT `fk_boostCampaignBalances_postId` FOREIGN KEY (`postId`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
--   CONSTRAINT `fk_boostCampaignBalances_userId` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Also ensure the posts.status enum includes the new values (safe migration):
-- Run only if your DB engine supports this without a full table rebuild.
ALTER TABLE posts
  MODIFY COLUMN status
    ENUM('draft','pending','active','dropped','expired','removed','hidden','boosted')
    NOT NULL DEFAULT 'draft';
