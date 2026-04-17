-- Drauwper — Contributions table
-- Every credit spent to accelerate a drop's countdown is recorded here.
-- Used for contributor leaderboards, discount calculations, and refunds.

CREATE TABLE `contributions` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,

  `amount` int NOT NULL COMMENT 'Credits contributed',
  `momentumBefore` double DEFAULT NULL COMMENT 'Momentum snapshot before this contribution',
  `momentumAfter` double DEFAULT NULL COMMENT 'Momentum snapshot after this contribution',
  `burnRateAfter` double DEFAULT NULL COMMENT 'Burn rate snapshot after this contribution',

  -- Wait penalty (cost increases near expiry, max 1%/day)
  `waitPenaltyPct` decimal(5,2) DEFAULT 0.00 COMMENT 'Penalty % applied at time of contribution',
  `penaltyAmount` int DEFAULT 0 COMMENT 'Extra credits charged as penalty',

  `isRefunded` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 if drop expired and credits were returned',
  `refundedAt` datetime DEFAULT NULL,

  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  `isVerified` bit(1) DEFAULT NULL COMMENT '1 if contributing user was verified at time of contribution',

  PRIMARY KEY (`id`),
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_dropId_userId` (`dropId`, `userId`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_contributions_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_contributions_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
