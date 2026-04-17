-- Drauwper — Momentum event log
-- Append-only log that records every momentum change on a drop.
-- Used for analytics, burn-rate charts, and anti-fraud auditing.

CREATE TABLE `momentumLog` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dropId` varchar(36) NOT NULL,
  `contributionId` varchar(36) DEFAULT NULL COMMENT 'NULL for decay-only ticks',

  `momentumBefore` double NOT NULL,
  `momentumAfter` double NOT NULL,
  `burnRateBefore` double NOT NULL,
  `burnRateAfter` double NOT NULL,
  `clockSecondsRemaining` double DEFAULT NULL COMMENT 'Clock time left after this event',

  `eventType` enum('contribution','decay_tick','admin_reset') NOT NULL DEFAULT 'contribution',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_dropId` (`dropId`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_momentum_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
