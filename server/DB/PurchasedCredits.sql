-- Drauwper — Credit purchase records
-- Tracks every credit purchase via Stripe or cryptocurrency (1,000 credits = $1 USD)

CREATE TABLE
  `CreditPurchases` (
    `id` varchar(10) NOT NULL,
    `userId` varchar(10) NOT NULL,
    `username` varchar(50) DEFAULT NULL,
    `email` varchar(100) DEFAULT NULL,

    -- Purchase details
    `credits` int NOT NULL,
    `package` enum('5000','10000','25000','50000','100000','custom') DEFAULT NULL,
    `amountPaid` decimal(10, 2) NOT NULL COMMENT 'USD amount paid',
    `currency` varchar(8) DEFAULT 'USD',
    `paymentMethod` enum('stripe','btc','eth','ltc','sol') NOT NULL,
    `status` enum('completed', 'processing', 'failed', 'refunded') DEFAULT 'processing',

    -- Stripe fields
    `stripePaymentIntentId` varchar(255) DEFAULT NULL,
    `stripeChargeId` varchar(255) DEFAULT NULL,
    `stripeCheckoutSessionId` varchar(255) DEFAULT NULL,

    -- Crypto fields
    `cryptoAmount` decimal(18, 8) DEFAULT NULL,
    `walletAddress` varchar(128) DEFAULT NULL,
    `txHash` varchar(128) DEFAULT NULL,
    `blockExplorerLink` varchar(255) DEFAULT NULL,
    `exchangeRate` decimal(12, 4) DEFAULT NULL,
    `confirmations` int DEFAULT 0,

    -- Security & audit
    `ip` varchar(45) DEFAULT NULL,
    `userAgent` varchar(255) DEFAULT NULL,
    `session_id` varchar(255) DEFAULT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_userId` (`userId`),
    KEY `idx_username` (`username`),
    KEY `idx_status` (`status`),
    KEY `idx_paymentMethod` (`paymentMethod`),
    CONSTRAINT `CreditPurchases_ibfk_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE,
    CONSTRAINT `CreditPurchases_ibfk_username` FOREIGN KEY (`username`) REFERENCES `userData` (`username`) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci