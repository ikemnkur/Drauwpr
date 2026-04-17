-- Drauwper — Credit wallet transactions (ledger)
-- Immutable log of every credit movement: purchases, contributions, earnings, refunds.
-- The user's `credits` column in userData is the running balance; this table is the audit trail.

CREATE TABLE `walletTransactions` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `userId` varchar(10) NOT NULL,

  `type` enum(
    'purchase',           -- Bought credits via Stripe
    'credit_purchase',    -- Bought credits via crypto/other
    'contribution',       -- Spent credits on a drop
    'contribution_refund',-- Credits returned from expired drop
    'contributor_reward', -- Earned credits as top contributor when drop released
    'download_payment',   -- Spent credits to download a drop
    'creator_earning',    -- Earned credits from someone downloading your drop
    'creator_payout',     -- Cashed out credits to fiat/crypto
    'admin_adjustment',   -- Manual adjustment by admin
    'bonus'               -- Promotional credits
  ) NOT NULL,

  `amount` int NOT NULL COMMENT 'Positive = credit, negative = debit',
  `balanceAfter` int NOT NULL COMMENT 'User credit balance after this transaction',

  `relatedDropId` varchar(36) DEFAULT NULL,
  `relatedPurchaseId` varchar(10) DEFAULT NULL,
  `relatedContributionId` varchar(36) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,

  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_type` (`type`),
  KEY `idx_relatedDropId` (`relatedDropId`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
