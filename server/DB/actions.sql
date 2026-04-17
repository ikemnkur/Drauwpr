-- ============================================================
--  actions — Credit spend / action ledger
--
--  Records every credit-deducting action a user performs:
--    - Purchasing a day-pass mode
--    - Spending credits on any custom action (spend-credits API)
--    - (future) Contributions to drops
--
--  Ported from VideoScramblerApp with the following changes:
--    - Constraint renamed from unlocks_ibfk_1 → actions_ibfk_1
--    - `action_name` kept for schema compatibility but is NOT
--      populated by any current Drauwper route (legacy field).
--      All routes use `action_type` + `action_description` instead.
-- ============================================================

CREATE TABLE IF NOT EXISTS `actions` (
  `id`                 varchar(40)   NOT NULL,
  `TXnumber`           int           NOT NULL AUTO_INCREMENT,
  `transactionId`      varchar(255)  DEFAULT NULL,
  `username`           varchar(50)   DEFAULT NULL,
  `email`              varchar(100)  DEFAULT NULL,
  `date`               bigint        DEFAULT NULL,           -- Unix ms timestamp
  `time`               varchar(20)   DEFAULT NULL,           -- Locale time string e.g. "3:45:00 PM"
  `credits`            int           DEFAULT NULL,           -- Credits REMAINING after action
  `action_name`        varchar(255)  DEFAULT NULL,           -- ⚠ Legacy (VideoScrambler) — unused in Drauwper
  `action_cost`        int           DEFAULT NULL,           -- Credits deducted
  `action_details`     text,                                 -- JSON blob of extra context
  `action_description` varchar(255)  DEFAULT NULL,           -- Human-readable summary
  `action_type`        varchar(255)  DEFAULT NULL,           -- e.g. 'purchase_mode_pass', 'contribution'
  `created_at`         timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TXnumber` (`TXnumber`),
  KEY `username` (`username`),
  CONSTRAINT `actions_ibfk_1` FOREIGN KEY (`username`) REFERENCES `userData` (`username`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
