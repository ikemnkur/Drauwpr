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
-- Table structure for table `dropReviews`
--

DROP TABLE IF EXISTS `dropReviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dropReviews` (
  `id` varchar(36) NOT NULL COMMENT 'UUID',
  `dropId` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `comment` text NOT NULL,
  `liked` tinyint(1) DEFAULT NULL COMMENT '1=like, 0=dislike, NULL=no vote',
  `rating` tinyint unsigned NOT NULL COMMENT '0-100 quality percentage',
  `isEdited` tinyint(1) DEFAULT '0',
  `isHidden` tinyint(1) DEFAULT '0' COMMENT 'Hidden by moderator',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_drop_review` (`dropId`,`userId`) COMMENT 'One review per user per drop',
  KEY `idx_dropId` (`dropId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_rating` (`rating`),
  CONSTRAINT `fk_reviews_drop` FOREIGN KEY (`dropId`) REFERENCES `drops` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dropReviews`
--

LOCK TABLES `dropReviews` WRITE;
/*!40000 ALTER TABLE `dropReviews` DISABLE KEYS */;
INSERT INTO `dropReviews` VALUES ('1d7e6761-8d4c-4301-9f25-c295e15d5316','83010f80-2c78-4d0d-a8cf-930d03af0eab','Q2R3DSAVB8','Thanks for the solutions',1,86,0,0,'2026-04-29 01:34:51','2026-04-29 01:34:51'),('rev-01','drop-3','c1','Incredible focus app — the ambient soundscapes are next-level. Using it every day now.',1,92,0,0,'2026-04-01 02:34:15','2026-04-01 03:34:15'),('rev-02','drop-3','c3','Solid overall but the tutorial could use more polish. Feature set is great though.',1,78,0,0,'2026-04-01 01:34:15','2026-04-01 03:34:15'),('rev-03','drop-3','c5','Not exactly my style but I can see the quality. Recommending to friends who need focus tools.',NULL,65,0,0,'2026-04-01 00:34:15','2026-04-01 03:34:15');
/*!40000 ALTER TABLE `dropReviews` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:43
