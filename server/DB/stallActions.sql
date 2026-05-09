-- Drauwper — Stall actions log
-- Records every time a user purchases extra time on a drop's countdown clock.

CREATE TABLE `stallActions` (
  `id`              varchar(36)  NOT NULL,
  `dropId`          varchar(36)  NOT NULL,
  `userId`          varchar(10)  NOT NULL,
  `stallMinutes`    int          NOT NULL COMMENT 'Minutes added to the clock',
  `creditCost`      int          NOT NULL COMMENT 'Credits charged',
  `balanceAfter`    int          NOT NULL,
  `expiresAtBefore` datetime     NOT NULL COMMENT 'expiresAt before stall',
  `expiresAtAfter`  datetime     NOT NULL COMMENT 'expiresAt after stall',
  `created_at`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  CONSTRAINT `fk_stall_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stall_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
