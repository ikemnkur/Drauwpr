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
-- Table structure for table `BTC_TX`
--

DROP TABLE IF EXISTS `BTC_TX`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `BTC_TX` (
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
  `relatedUserId` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_txHash` (`txHash`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_cryptoBTC_TX_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `BTC_TX`
--

LOCK TABLES `BTC_TX` WRITE;
/*!40000 ALTER TABLE `BTC_TX` DISABLE KEYS */;
INSERT INTO `BTC_TX` VALUES (1,NULL,'BTC','inbound',0.00024717,NULL,NULL,NULL,'5f010d1e3eb3d9fb12404d271b9399dccf693ff3ca2e2aaef76117fb6398f5ba',NULL,0,'pending','credit_purchase',NULL,'2025-08-22 02:52:22'),(2,NULL,'BTC','inbound',2000.00000000,NULL,'bc1q7m8dd2rwa3jjt8ujadfzg9kf7ckklevguw80vz','bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6','be754cfea597bf71d883430dcc6bbb96070b6bf3ab4565f81f74657320de30e8',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 04:53:04'),(3,NULL,'BTC','inbound',1238.00000000,NULL,'bc1q4vxcxw7mpg9dcryqu0kav8awrn7qk5e6wgs3hg','bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6','314551311a37e5b7b3f3c9668b5c1c98b106eddb61e7f10638f5adb348b47874',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 04:39:52'),(4,NULL,'BTC','inbound',50000.00000000,NULL,'bc1q4vxcxw7mpg9dcryqu0kav8awrn7qk5e6wgs3hg','bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6','f0c3e62f287710de725d30f7cffc19c809f900898dd34c9ac9bd795359ac8f1c',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 05:08:23'),(5,NULL,'BTC','inbound',2500.00000000,NULL,'bc1qtuzlewpenfz8je9wjr8fk95er8uk59s4rlv7np','bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6','ff6ef0e0cc48d749c749aee58aef5e307f982c116e51270ece93db1f2cdb15d6',NULL,0,'pending','credit_purchase',NULL,'2026-05-05 06:29:08');
/*!40000 ALTER TABLE `BTC_TX` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:33
