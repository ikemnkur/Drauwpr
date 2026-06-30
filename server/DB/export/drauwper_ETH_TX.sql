-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: 34.57.139.74    Database: drauwper
-- ------------------------------------------------------
-- Server version	8.0.41-google

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'b1fb7176-d1f2-11f0-9251-42010a400002:1-834128';

--
-- Table structure for table `ETH_TX`
--

DROP TABLE IF EXISTS `ETH_TX`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ETH_TX` (
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
  `confirmations` int DEFAULT '0',
  `status` enum('pending','confirmed','failed') DEFAULT 'pending',
  `purpose` enum('credit_purchase','creator_payout','refund') DEFAULT 'credit_purchase',
  `relatedPurchaseId` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_txHash` (`txHash`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_cryptoETH_TX_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ETH_TX`
--

LOCK TABLES `ETH_TX` WRITE;
/*!40000 ALTER TABLE `ETH_TX` DISABLE KEYS */;
INSERT INTO `ETH_TX` VALUES (1,NULL,'BTC','inbound',0.00124086,NULL,'0x6081258689a75d253d87ce902a8de3887239fe80','0x9a61f30347258a3d03228f363b07692f3cbb7f27','0xb838805293426888a8e44c7a42a3775bf7e2b8c5a779bcd59544dc9cc0bdeaae',NULL,0,'pending','credit_purchase',NULL,'2025-10-27 05:21:59'),(2,NULL,'BTC','inbound',0.00041944,NULL,'0x9f3e7bd07578cb6401135df5aa45121990cd6903','0x9a61f30347258a3d03228f363b07692f3cbb7f27','0x3ee27ddd1d0fc585ab0b7550ce0e68f6731fbf7652b389a771b4532bc1a00123',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 07:26:47'),(3,NULL,'BTC','inbound',0.00041943,NULL,'0x1887fa9edadeab7562b01cc3f4fa246ace2c3cdd','0x9a61f30347258a3d03228f363b07692f3cbb7f27','0xdb9beb23b6d64a425f195a5cc63c84885731196543a4b627bca5900cae1b1b6a',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 07:31:23'),(4,NULL,'BTC','inbound',0.00008331,NULL,'0x9f3e7bd07578cb6401135df5aa45121990cd6903','0x9a61f30347258a3d03228f363b07692f3cbb7f27','0x8fcf09874e3a3c0d8e65035640d39ea86c6ee926ce2473b3eb69ed6ef8dc93b5',NULL,0,'pending','credit_purchase',NULL,'2026-05-08 04:53:35'),(5,NULL,'BTC','inbound',0.00006577,NULL,'0x9f3e7bd07578cb6401135df5aa45121990cd6903','0x9a61f30347258a3d03228f363b07692f3cbb7f27','0x2629003065fb33086b69fc0d281c086f862665a4beeda6e3b4e4d05412455047',NULL,0,'pending','credit_purchase',NULL,'2026-05-08 04:52:59');
/*!40000 ALTER TABLE `ETH_TX` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-12 10:09:49
