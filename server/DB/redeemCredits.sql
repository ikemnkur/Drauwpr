-- Drauwpr — Redeem requests table
-- Tracks user cash-out requests for admin payout review.

CREATE TABLE IF NOT EXISTS `redeemCredits` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(50) DEFAULT NULL,
  `userId` VARCHAR(10) DEFAULT NULL,
  `credits` INT NOT NULL DEFAULT 0,
  `amountUSD` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `chain` VARCHAR(10) NOT NULL,
  `walletAddress` VARCHAR(255) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `date` BIGINT DEFAULT NULL,
  `time` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_redeem_status` (`status`),
  KEY `idx_redeem_user` (`userId`),
  KEY `idx_redeem_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;