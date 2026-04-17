-- Drauwper — Creator payouts
-- Tracks when creators cash out their earned credits to fiat (Stripe) or crypto.

CREATE TABLE `creatorPayouts` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `creatorId` varchar(10) NOT NULL,

  `creditsWithdrawn` int NOT NULL,
  `amountUSD` decimal(10,2) NOT NULL COMMENT 'USD equivalent at time of payout',
  `payoutMethod` enum('stripe','btc','eth','ltc','sol') NOT NULL,

  -- Stripe fields
  `stripeTransferId` varchar(255) DEFAULT NULL,
  `stripeAccountId` varchar(255) DEFAULT NULL,

  -- Crypto fields
  `walletAddress` varchar(128) DEFAULT NULL,
  `txHash` varchar(128) DEFAULT NULL,
  `chain` enum('BTC','ETH','LTC','SOL') DEFAULT NULL,

  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `processedAt` datetime DEFAULT NULL,
  `failureReason` varchar(255) DEFAULT NULL,

  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_creatorId` (`creatorId`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_payouts_creator` FOREIGN KEY (`creatorId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
