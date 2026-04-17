-- Drauwper — Favourites / Waitlist
-- Users can star drops to track them and get notified on release.

CREATE TABLE `dropFavorites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `notifyOnRelease` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Receive email/push when drop unlocks',
  `notifyOnGoalMet` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Notify when spark threshold hit',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop_fav` (`dropId`, `userId`),
  KEY `idx_userId` (`userId`),
  CONSTRAINT `fk_favorites_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
