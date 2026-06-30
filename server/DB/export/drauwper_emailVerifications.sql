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
-- Table structure for table `emailVerifications`
--

DROP TABLE IF EXISTS `emailVerifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emailVerifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `code` varchar(10) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_expires` (`expiresAt`),
  CONSTRAINT `fk_emailVerifications_userData_email` FOREIGN KEY (`email`) REFERENCES `userData` (`email`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emailVerifications`
--

LOCK TABLES `emailVerifications` WRITE;
/*!40000 ALTER TABLE `emailVerifications` DISABLE KEYS */;
INSERT INTO `emailVerifications` VALUES (1,'Ikemnkur@gmail.com','70433556','2026-04-02 03:58:59','2026-04-02 03:28:59',0),(7,'scramblurr.app@proton.me','762955','2026-05-08 04:53:57','2026-05-08 04:23:57',1),(9,'kcnkurumeh@gmail.com','5285758','2026-05-09 08:04:24','2026-05-09 07:34:24',0),(10,'ikenuru@gmail.com','79480092','2026-05-09 09:12:45','2026-05-09 08:42:45',0),(12,'ikemuru@gmail.com','6913357','2026-05-09 23:52:00','2026-05-09 23:22:00',0),(13,'mrbootyheadman4@gmail.com','2352380','2026-05-11 02:08:59','2026-05-11 01:38:59',0),(14,'gamer2@gmail.com','89539812','2026-05-12 19:30:45','2026-05-12 19:00:45',0),(15,'Iloverap@gmail.com','9673775','2026-05-12 22:02:17','2026-05-12 21:32:17',0),(16,'rapper@gmail.com','5430537','2026-05-12 22:18:10','2026-05-12 21:48:10',0),(19,'swpromos@proton.me','9912586','2026-05-28 14:11:42','2026-05-28 13:41:42',0);
/*!40000 ALTER TABLE `emailVerifications` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:54
