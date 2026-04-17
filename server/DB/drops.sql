-- Drauwper — Core drops table
-- A "drop" is a file/app/game/document with a scheduled future release time.
-- The countdown can be accelerated by community contributions (burn mechanic).

CREATE TABLE `drops` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `creatorId` varchar(10) NOT NULL,

  -- Product info
  `title` varchar(200) NOT NULL,
  `description` text,
  `fileType` enum('game','app','document','music','video','other') NOT NULL DEFAULT 'other',
  `fileSize` bigint DEFAULT NULL COMMENT 'bytes',
  `filePath` varchar(500) DEFAULT NULL COMMENT 'S3 key or local path in drop-files/',
  `originalFileName` varchar(255) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `thumbnailUrl` varchar(500) DEFAULT NULL,
  `trailerUrl` varchar(500) DEFAULT NULL,
  `tags` json DEFAULT NULL COMMENT '["game","rpg","indie"]',

  -- Scheduling & countdown
  `scheduledDropTime` datetime NOT NULL COMMENT 'When the file becomes available (before burn acceleration)',
  `actualDropTime` datetime DEFAULT NULL COMMENT 'Filled in when the drop actually unlocks',
  `expiresAt` datetime NOT NULL COMMENT 'Creator-set deadline; if goal not met, credits refund',

  -- Burn mechanics
  `goalAmount` int NOT NULL COMMENT 'Minimum credits (Spark Threshold) before timer starts',
  `currentContributions` int NOT NULL DEFAULT 0,
  `contributorCount` int NOT NULL DEFAULT 0,
  `momentum` double NOT NULL DEFAULT 0 COMMENT 'Current momentum value M',
  `burnRate` double NOT NULL DEFAULT 1 COMMENT 'Current v = 1 + M',
  `lastMomentumUpdate` datetime DEFAULT NULL COMMENT 'Timestamp of last momentum recalc',
  `sensitivity` double NOT NULL DEFAULT 5 COMMENT 'Tunable sensitivity constant',
  `decayConstant` double NOT NULL DEFAULT 0.0003 COMMENT 'k — momentum decay rate',

  -- Post-drop pricing
  `basePrice` int NOT NULL DEFAULT 0 COMMENT 'Credits charged after drop for download',
  `dailyPriceDecayPct` decimal(4,2) DEFAULT 5.00 COMMENT 'Time-based decay % per 24h',
  `volumeDecayStep` int DEFAULT 1000 COMMENT 'Volume-based: price drops every N downloads',
  `volumeDecayPct` decimal(4,2) DEFAULT 5.00,

  -- Stats
  `totalDownloads` int NOT NULL DEFAULT 0,
  `totalRevenue` bigint NOT NULL DEFAULT 0 COMMENT 'Credits earned from post-drop sales',
  `avgRating` decimal(4,2) DEFAULT NULL COMMENT '0-100 community quality rating',
  `reviewCount` int NOT NULL DEFAULT 0,
  `likeCount` int NOT NULL DEFAULT 0,
  `dislikeCount` int NOT NULL DEFAULT 0,

  -- Status
  `status` enum('draft','pending','active','dropped','expired','removed') NOT NULL DEFAULT 'draft',
  -- draft    = creator still editing
  -- pending  = published but Spark Threshold not met; timer paused
  -- active   = goal met, timer counting down (burning)
  -- dropped  = file released, available for download
  -- expired  = expiry date passed without meeting goal; credits refunded
  -- removed  = taken down by creator or admin

  `isPublic` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_status` (`status`),
  KEY `idx_scheduledDropTime` (`scheduledDropTime`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_drops_creator` FOREIGN KEY (`creatorId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
