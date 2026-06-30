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
-- Table structure for table `dropDownloads`
--

DROP TABLE IF EXISTS `dropDownloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dropDownloads` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `pricePaid` int NOT NULL COMMENT 'Credits charged for this download',
  `basePrice` int NOT NULL COMMENT 'Drop base price at time of download',
  `contributorDiscount` decimal(5,2) DEFAULT '0.00' COMMENT 'Discount % from contributions',
  `timeDecayDiscount` decimal(5,2) DEFAULT '0.00' COMMENT 'Discount % from time decay',
  `volumeDecayDiscount` decimal(5,2) DEFAULT '0.00' COMMENT 'Discount % from volume decay',
  `downloadNumber` int DEFAULT NULL COMMENT 'Nth download (for volume calc)',
  `ip` varchar(45) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop` (`dropId`,`userId`) COMMENT 'One download per user per drop',
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  CONSTRAINT `fk_downloads_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_downloads_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dropDownloads`
--

LOCK TABLES `dropDownloads` WRITE;
/*!40000 ALTER TABLE `dropDownloads` DISABLE KEYS */;
INSERT INTO `dropDownloads` VALUES ('1be97db0-57e7-40a2-a7c3-64710a8364f2','e6abfffc-63b1-410c-bb65-50a888512754','creator-3',98,100,0.00,1.73,0.00,1,NULL,NULL,'2026-04-10 21:39:07'),('41707ade-4a88-42b3-8fa2-35553370c892','83010f80-2c78-4d0d-a8cf-930d03af0eab','Q2R3DSAVB8',273,300,0.00,8.75,0.00,1,NULL,NULL,'2026-04-29 01:34:08'),('d16353ca-44ba-4c33-94c0-ea5c12ef2d6b','e4349953-5451-46f7-b927-ad028b8d7022','RTMWJ753DR',10,200,76.24,18.76,0.00,1,NULL,NULL,'2026-05-10 10:11:06'),('dl-01','drop-3','c1',3500,5000,8.00,1.25,0.00,1,NULL,NULL,'2026-03-31 22:34:15'),('dl-02','drop-3','c3',2800,5000,20.00,1.25,0.00,2,NULL,NULL,'2026-03-31 23:34:15'),('dl-03','drop-3','c5',3900,5000,10.00,1.25,0.00,3,NULL,NULL,'2026-04-01 00:34:15'),('dl-04','drop-3','c4',4500,5000,5.00,1.25,0.00,4,NULL,NULL,'2026-04-01 01:34:15'),('ffcea18c-9b2e-4662-a8cc-c6871745533e','7fdee413-4a0f-49ef-92f2-753aae2b0408','ZQX060INJO',193,200,0.00,3.29,0.00,1,NULL,NULL,'2026-05-09 07:30:16');
/*!40000 ALTER TABLE `dropDownloads` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:03
