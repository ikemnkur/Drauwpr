-- Drauwper — Large contributor rewards
-- Tracks tier-based perks earned by top contributors on a drop.

CREATE TABLE `contributorRewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,

  `tier` enum('bronze','silver','gold','diamond') NOT NULL,
  `totalContributed` int NOT NULL COMMENT 'Sum of all contributions by this user to this drop',
  `percentOfGoal` decimal(5,2) NOT NULL COMMENT 'Their share of the goal amount',

  -- Perks
  `discountPct` decimal(5,2) DEFAULT 0.00 COMMENT 'Download price discount %',
  `fastDownload` tinyint(1) DEFAULT 0 COMMENT 'Premium download speed',
  `commissionPct` decimal(5,2) DEFAULT 0.00 COMMENT 'Commission on post-drop sales',
  `shoutout` tinyint(1) DEFAULT 0 COMMENT 'Creator shout-out / credit roll',
  `badgeAwarded` varchar(50) DEFAULT NULL COMMENT 'Profile badge slug',

  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop_reward` (`dropId`, `userId`),
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_tier` (`tier`),
  CONSTRAINT `fk_rewards_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rewards_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
