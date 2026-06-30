-- Prolifer8 — Post flags
-- User-submitted moderation flags for posts.
-- Thresholds enforced in frontend feed rendering:
--   3+ flags  => hidden from Explore
--   5+ flags  => hidden from recommendation rails

CREATE TABLE IF NOT EXISTS `dropFlags` (
  `id` varchar(36) NOT NULL,
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `reason` enum('spam','scam','explicit','abuse','plagiarism','impersonation') NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_drop_flag_user` (`dropId`,`userId`),
  KEY `idx_drop_flags_drop` (`dropId`),
  KEY `idx_drop_flags_user` (`userId`),
  KEY `idx_drop_flags_reason` (`reason`),
  CONSTRAINT `fk_drop_flags_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drop_flags_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
