-- Drauwper — Download records
-- Tracks every file download after a drop is released.
-- Used for volume-based pricing decay and creator analytics.

CREATE TABLE `dropDownloads` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,

  -- Pricing at time of download
  `pricePaid` int NOT NULL COMMENT 'Credits charged for this download',
  `basePrice` int NOT NULL COMMENT 'Drop base price at time of download',
  `contributorDiscount` decimal(5,2) DEFAULT 0.00 COMMENT 'Discount % from contributions',
  `timeDecayDiscount` decimal(5,2) DEFAULT 0.00 COMMENT 'Discount % from time decay',
  `volumeDecayDiscount` decimal(5,2) DEFAULT 0.00 COMMENT 'Discount % from volume decay',
  `downloadNumber` int DEFAULT NULL COMMENT 'Nth download (for volume calc)',

  `ip` varchar(45) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop` (`dropId`, `userId`) COMMENT 'One download per user per drop',
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  CONSTRAINT `fk_downloads_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_downloads_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
