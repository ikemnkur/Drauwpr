-- Drauwper — Drop reviews
-- Post-download reviews with like/dislike and 0-100% quality rating.

CREATE TABLE `dropReviews` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,

  `comment` text NOT NULL,
  `liked` tinyint(1) DEFAULT NULL COMMENT '1=like, 0=dislike, NULL=no vote',
  `rating` tinyint unsigned NOT NULL COMMENT '0-100 quality percentage',

  `isEdited` tinyint(1) DEFAULT 0,
  `isHidden` tinyint(1) DEFAULT 0 COMMENT 'Hidden by moderator',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop_review` (`dropId`, `userId`) COMMENT 'One review per user per drop',
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_rating` (`rating`),
  CONSTRAINT `fk_reviews_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
