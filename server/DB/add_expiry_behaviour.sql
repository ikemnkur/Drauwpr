-- Migration: add expiry behaviour and threshold columns to drops table
-- expiry_behaviour: 'refund' (default) = credits returned to contributors on expiry
--                   'keep'             = drop remains downloadable after expiry (Premium feature)
-- expiry_threshold: 0.0–1.0 fraction of goalAmount that must be reached before
--                   'keep' behaviour activates. NULL / 0 = no threshold required.

ALTER TABLE `drops`
  ADD COLUMN `expiry_behaviour` ENUM('refund', 'keep') NOT NULL DEFAULT 'refund'
    COMMENT 'What happens when the drop expires without reaching its goal'
    AFTER `expiresAt`,
  ADD COLUMN `expiry_threshold` DECIMAL(4,3) DEFAULT NULL
    COMMENT 'Fraction of goal (0.0–1.0) that must be met for keep behaviour to activate. NULL = no threshold.'
    AFTER `expiry_behaviour`;
