-- Drauwper — Cryptocurrency transaction ledger
-- Records all BTC/ETH/SOL/LTC transactions for credit purchases and payouts

CREATE TABLE
  `cryptoTransactions` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `userId` varchar(10) DEFAULT NULL,
    `chain` enum('BTC','ETH','LTC','SOL') NOT NULL DEFAULT 'BTC',
    `direction` enum('inbound','outbound') NOT NULL,
    `amount` decimal(18,8) NOT NULL,
    `amountUSD` decimal(10,2) DEFAULT NULL,
    `fromAddress` varchar(128) DEFAULT NULL,
    `toAddress` varchar(128) DEFAULT NULL,
    `txHash` varchar(128) DEFAULT NULL,
    `blockExplorerLink` varchar(255) DEFAULT NULL,
    `confirmations` int DEFAULT 0,
    `status` enum('pending','confirmed','failed') DEFAULT 'pending',
    `purpose` enum('credit_purchase','creator_payout','refund') DEFAULT 'credit_purchase',
    `relatedPurchaseId` varchar(10) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_userId` (`userId`),
    KEY `idx_txHash` (`txHash`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_cryptoTx_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE SET NULL
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci