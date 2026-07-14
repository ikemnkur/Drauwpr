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
-- Table structure for table `promoSubmissions`
--

DROP TABLE IF EXISTS `promoSubmissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promoSubmissions` (
  `id` varchar(36) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `contactEmail` varchar(100) DEFAULT NULL,
  `submissionType` varchar(40) NOT NULL,
  `mediaType` varchar(40) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text,
  `targetDropId` varchar(255) DEFAULT NULL,
  `mediaUrl` text,
  `ctaText` varchar(255) DEFAULT NULL,
  `budgetCredits` decimal(10,2) DEFAULT '0.00',
  `assetPath` varchar(255) DEFAULT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'pending',
  `adminNotes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `clicks` int DEFAULT '0',
  `impressions` int DEFAULT '0',
  `tags` tinytext,
  `likes` int DEFAULT '0',
  `dislikes` int DEFAULT '0',
  `neutrals` int DEFAULT '0',
  `billedImpressions` int DEFAULT '0',
  `billedClicks` int DEFAULT '0',
  `target_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_promo_status` (`status`),
  KEY `idx_promo_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promoSubmissions`
--

LOCK TABLES `promoSubmissions` WRITE;
/*!40000 ALTER TABLE `promoSubmissions` DISABLE KEYS */;
INSERT INTO `promoSubmissions` VALUES ('0109fb26-2e41-4719-ad57-14798e7ecf50','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','ikemnkur@gmail.com','ad','image','electronics and stuff','buy from our surplus online',NULL,NULL,NULL,50.00,'/uploads/promo-submissions/ikemnkur/1778316457282_792cc350-0689-41d0-9e2b-057c37eafba2.jpg','approved','test','2026-05-09 08:47:37','2026-05-09 10:54:45',0,0,'parts, spares, components',0,0,0,0,0,NULL),('45db8242-2f35-447f-b2c0-e58e53a0ee59','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','ikemnkur@gmail.com','ad','video_link','Cool Lambo','Watch this cool lambo video','https://www.youtube.com/watch?v=h_NEOIwrG-E','','Cool Check it out',1000.00,'/uploads/promo-submissions/ikenuru/DAMORAK96_CAR.gif','approved',NULL,'2026-05-09 10:01:11','2026-06-05 00:00:03',5,99,'test, dev, bot, admin',0,0,0,99,5,'https://www.youtube.com/watch?v=h_NEOIwrG-E'),('7j8r9367-84nf-48f7-9f71-c423v5f22e95','UJH2MRXCGU','ikenuru','ikenuru@gmail.com','ikenuru@gmail.com','drop_sponsorship','image','Check Our Photos','Cool service','http://localhost:5173/drop/83010f80-2c78-4d0d-a8cf-930d03af0eab',NULL,'Cool Bean and photos mane',1.00,'/uploads/promo-submissions/ikenuru/1777131617253_7cf03130-474e-461a-8a4f-9eb35eeb7b09.png','approved','2','2026-04-25 15:40:17','2026-06-02 12:00:04',2,292,NULL,2,0,0,292,2,NULL),('879f9367-a424-48f7-9f71-c4a43cf22e95','UJH2MRXCGU','ikenuru','ikenuru@gmail.com','ikenuru@gmail.com','ad','image','Listen to the new heat/fiya','Cool Music, check it out now.',NULL,NULL,'New album coming soon',25.50,'/uploads/promo-submissions/ikenuru/1777054946941_dabd3a63-96fa-4346-9fbb-f3c555f436f1.png','approved','manual test','2026-04-24 18:22:26','2026-04-24 21:51:05',NULL,NULL,NULL,0,0,0,0,0,NULL),('c5fc0351-b1b5-4780-a083-917e5b9c9911','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','test@gmail.com','ad','video_link','cool awesome','dumd test to see if the setting and confirm message worke right',NULL,'','Test Ignore',500.00,NULL,'pending',NULL,'2026-05-09 10:03:57','2026-05-10 09:39:38',0,0,'test',0,0,0,0,0,'https://www.youtube.com/watch?v=h_NEOIwrG-E'),('d40f3d06-b08c-4d67-90b6-c855da65dc39','UJH2MRXCGU','ikenuru','ikenuru@gmail.com','ikenuru@gmail.com','drop_sponsorship','image','Cool image Gallery','Home service','http://localhost:5173/drop/83010f80-2c78-4d0d-a8cf-930d03af0eab',NULL,'Cool Bean and photos mane',1.00,'/uploads/promo-submissions/ikenuru/1777131617253_7cf03130-474e-461a-8a4f-9eb35eeb7b09.png','approved','2','2026-04-25 15:40:17','2026-05-29 12:00:05',6,300,NULL,1,0,0,300,6,NULL),('d99b2f53-fc69-4e80-8dfc-d75eb87faa78','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','ikemnkur@gmail.com','ad','video_link','Gym Training Video here!','Watch these tests to train.',NULL,'https://www.youtube.com/watch?v=r9L23mUmA8I','Train well with these videos',50.00,NULL,'approved','gym video','2026-05-10 07:51:26','2026-06-08 00:00:07',2,88,'fitness, videos, training, exercise, gym',0,0,1,88,2,'https://www.youtube.com/@MoveWellnesscoach'),('daf7fb7d-40d7-4b04-a818-3e2e8b495cf9','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','ikemnkur@gmail.com','ad','audio','Check out my Free Beats','Listen and sample from my beats',NULL,NULL,'Listen to this fresh HEAT!!!!',80.00,'/uploads/promo-submissions/ikemnkur/1778405909108_9286582c-412e-4846-b519-4d599214adb6.wav','pending',NULL,'2026-05-10 09:38:29','2026-05-10 09:38:29',0,0,'music, rap, free beats, trap beats',0,0,0,0,0,'https://soundcloud.com/ikem-nkurumeh'),('fd2ba3db-8e22-46b2-b9b8-14998503ae6a','Q2R3DSAVB8','scramblurr','scramblurr.app@proton.me','scramblurr.app@proton.me','ad','video_link','I Exposed A Famous TikToker Buying Cp! (HULLO)','Cool video exposing famous people commiting crimes',NULL,'https://www.youtube.com/watch?v=Bk922J2nN7E','These are cool Pred catches',50.00,NULL,'approved','nice','2026-05-09 08:25:54','2026-05-29 00:00:01',0,90,'police, pred catches, pedo, arrests',0,0,0,90,0,'https://www.youtube.com/@jidionpremiunm');
/*!40000 ALTER TABLE `promoSubmissions` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:47
