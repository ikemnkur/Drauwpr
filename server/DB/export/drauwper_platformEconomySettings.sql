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
-- Table structure for table `platformEconomySettings`
--

DROP TABLE IF EXISTS `platformEconomySettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platformEconomySettings` (
  `id` tinyint unsigned NOT NULL,
  `burnRateConstant` decimal(12,6) NOT NULL DEFAULT '0.999000',
  `sitePopularityConstant` decimal(12,4) NOT NULL DEFAULT '5.0000',
  `volumeDecayConstant` decimal(12,4) NOT NULL DEFAULT '1.0000',
  `subscriptionPriceFree` decimal(10,2) NOT NULL DEFAULT '0.00',
  `subscriptionPriceStandard` decimal(10,2) NOT NULL DEFAULT '5.00',
  `subscriptionPricePremium` decimal(10,2) NOT NULL DEFAULT '10.00',
  `creditPack5000` decimal(10,2) NOT NULL DEFAULT '5.00',
  `creditPack10000` decimal(10,2) NOT NULL DEFAULT '10.00',
  `creditPack25000` decimal(10,2) NOT NULL DEFAULT '25.00',
  `creditPack50000` decimal(10,2) NOT NULL DEFAULT '50.00',
  `creditPack100000` decimal(10,2) NOT NULL DEFAULT '100.00',
  `redemptionFeePct` decimal(6,3) NOT NULL DEFAULT '0.000',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platformEconomySettings`
--

LOCK TABLES `platformEconomySettings` WRITE;
/*!40000 ALTER TABLE `platformEconomySettings` DISABLE KEYS */;
INSERT INTO `platformEconomySettings` VALUES (1,0.999000,5.0000,1.0000,0.00,5.00,10.00,5.00,10.00,25.00,50.00,100.00,5.000,'2026-04-25 15:16:24');
/*!40000 ALTER TABLE `platformEconomySettings` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:35
