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
-- Table structure for table `contributorRewards`
--

DROP TABLE IF EXISTS `contributorRewards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contributorRewards` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `tier` enum('bronze','silver','gold','diamond') NOT NULL,
  `totalContributed` int NOT NULL COMMENT 'Sum of all contributions by this user to this drop',
  `percentOfGoal` decimal(5,2) NOT NULL COMMENT 'Their share of the goal amount',
  `discountPct` decimal(5,2) DEFAULT '0.00' COMMENT 'Download price discount %',
  `fastDownload` tinyint(1) DEFAULT '0' COMMENT 'Premium download speed',
  `commissionPct` decimal(5,2) DEFAULT '0.00' COMMENT 'Commission on post-drop sales',
  `shoutout` tinyint(1) DEFAULT '0' COMMENT 'Creator shout-out / credit roll',
  `badgeAwarded` varchar(50) DEFAULT NULL COMMENT 'Profile badge slug',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop_reward` (`dropId`,`userId`),
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_tier` (`tier`),
  CONSTRAINT `fk_rewards_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rewards_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contributorRewards`
--

LOCK TABLES `contributorRewards` WRITE;
/*!40000 ALTER TABLE `contributorRewards` DISABLE KEYS */;
INSERT INTO `contributorRewards` VALUES (1,'drop-3','c3','gold',20000,20.00,20.00,1,2.00,1,'gold-contributor','2026-04-01 03:34:15','2026-04-01 03:34:15'),(2,'drop-3','c5','silver',10000,10.00,10.00,0,1.00,0,'silver-contributor','2026-04-01 03:34:15','2026-04-01 03:34:15'),(3,'drop-3','c1','bronze',8000,8.00,5.00,0,0.00,0,'bronze-contributor','2026-04-01 03:34:15','2026-04-01 03:34:15'),(4,'drop-3','c4','bronze',5000,5.00,5.00,0,0.00,0,'bronze-contributor','2026-04-01 03:34:15','2026-04-01 03:34:15');
/*!40000 ALTER TABLE `contributorRewards` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:00
