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
-- Table structure for table `userData`
--

DROP TABLE IF EXISTS `userData`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userData` (
  `id` varchar(10) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `credits` int NOT NULL DEFAULT '0',
  `lastLogin` datetime DEFAULT NULL,
  `loginStatus` tinyint(1) DEFAULT '0',
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `phoneNumber` varchar(20) DEFAULT NULL,
  `birthDate` date DEFAULT NULL,
  `encryptionKey` varchar(100) DEFAULT NULL,
  `reportCount` int DEFAULT '0',
  `isBanned` tinyint(1) DEFAULT '0',
  `banReason` text,
  `banDate` datetime DEFAULT NULL,
  `banDuration` int DEFAULT NULL,
  `createdAt` bigint DEFAULT NULL,
  `updatedAt` bigint DEFAULT NULL,
  `twoFactorEnabled` tinyint(1) DEFAULT '0',
  `twoFactorSecret` varchar(50) DEFAULT NULL,
  `recoveryCodes` json DEFAULT NULL,
  `accountType` enum('free','standard','premium') DEFAULT 'free',
  `planExpiry` timestamp NULL DEFAULT NULL,
  `totalDropsCreated` int DEFAULT '0',
  `totalCreditsEarned` bigint DEFAULT '0',
  `creatorRating` decimal(4,2) DEFAULT NULL,
  `profilePicture` varchar(255) DEFAULT NULL,
  `bio` text,
  `bioVideoUrl` varchar(255) DEFAULT NULL,
  `bannerUrl` varchar(255) DEFAULT NULL,
  `socialLinks` json DEFAULT NULL,
  `verification` varchar(10) DEFAULT NULL,
  `amount1` double DEFAULT NULL,
  `amount2` double DEFAULT NULL,
  `cryptoAmounts` varchar(255) DEFAULT NULL,
  `resetCode` varchar(6) DEFAULT NULL,
  `resetCodeExpiry` datetime DEFAULT NULL,
  `verificationFacePath` varchar(255) DEFAULT NULL,
  `verificationIdPath` varchar(255) DEFAULT NULL,
  `verificationDocsStatus` varchar(32) DEFAULT NULL,
  `verificationDocsNotes` text,
  `verificationDocsReviewedAt` datetime DEFAULT NULL,
  `verificationDocsReviewedBy` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_accountType` (`accountType`),
  KEY `idx_verification` (`verification`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userData`
--

LOCK TABLES `userData` WRITE;
/*!40000 ALTER TABLE `userData` DISABLE KEYS */;
INSERT INTO `userData` VALUES ('43JH67Q9KX','RackRavager','mrbootyheadman4@gmail.com','$2b$12$4b1uFXYcWLgZzebLG5n.juq4ORWuWqtmkNaDvj6FFt2WMW7HWiRpG',100,NULL,0,'RackRavager','','',NULL,'enc_key_1778463539706',0,0,'',NULL,NULL,1778463539640,1778463539640,0,'','[]','free',NULL,1,0,NULL,'https://i.pravatar.cc/150?img=22','',NULL,NULL,'{}','false',0.157,0.1095,'{\"BTC\":{\"amount1\":\"0.00000193\",\"amount2\":\"0.00000134\"},\"ETH\":{\"amount1\":\"0.00006652\",\"amount2\":\"0.00004639\"},\"LTC\":{\"amount1\":\"0.00263467\",\"amount2\":\"0.00183756\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('4ZZAH6VFGE','RealestRapper','Iloverap@gmail.com','$2b$12$aaHD54xbbF76FHHloTR.nOG3Vv5ZUAnRD1ko/.hSnqpAKFkGueu3i',100,NULL,0,'RealestRapper','','',NULL,'enc_key_1778621537308',0,0,'',NULL,NULL,1778621537116,1778621537116,1,'O4YVCMCWNZ2GQWTTOMXVQTSULA3EQQ2E','[\"174E-1448-F40E-F2AF\", \"3D31-A030-354B-ECBA\", \"6809-9BD4-CA76-236A\", \"824F-B160-D708-C196\", \"DDBB-B500-F642-0A2D\", \"634D-A1C2-9076-206D\", \"399F-BDCC-DAFD-44BC\", \"C7AC-63F8-9BA3-02CE\"]','free',NULL,1,0,NULL,'https://i.pravatar.cc/150?img=29','',NULL,NULL,'{}','false',0.1606,0.114,'{\"BTC\":{\"amount1\":\"0.00000199\",\"amount2\":\"0.00000141\"},\"ETH\":{\"amount1\":\"0.00007025\",\"amount2\":\"0.00004987\"},\"LTC\":{\"amount1\":\"0.00276753\",\"amount2\":\"0.00196450\"},\"SOL\":{\"amount1\":\"0.00107067\",\"amount2\":\"0.00076000\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ALIQJ8YFVQ','ikemuru','ikemuru@gmail.com','$2b$12$zNFG6JR0BnCnTMlnZaI6yOP/Nl0918ase5itVG4h.dYm5LC9u5G6m',100,NULL,0,'ikemuru','','',NULL,'enc_key_1778368842920',0,0,'',NULL,NULL,1778368842746,1778368842746,0,'','[]','free',NULL,0,0,NULL,'https://i.pravatar.cc/150?img=49','',NULL,NULL,'{}','false',0.1911,0.1194,'{\"BTC\":{\"amount1\":\"0.00000237\",\"amount2\":\"0.00000148\"},\"ETH\":{\"amount1\":\"0.00008213\",\"amount2\":\"0.00005131\"},\"LTC\":{\"amount1\":\"0.00328916\",\"amount2\":\"0.00205508\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c1','blaze_runner','blaze@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',19131,'2026-04-02 03:32:41',0,'Blake','Runner',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1771126455000,1775014455000,0,NULL,NULL,'free',NULL,1,7131,68.00,NULL,'Full-stack dev and avid gamer. Burning credits since day one.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c2','neon_drift','neon@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',19730,NULL,0,'Neon','Drift',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1772422455000,1775014455000,0,NULL,NULL,'free',NULL,1,55230,72.00,NULL,'UI designer who loves neon aesthetics and late-night coding sessions.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c3','pixel_witch','pixel@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',156164,'2026-05-09 09:57:16',0,'Pixa','Witch',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1764646455000,1775014455000,0,NULL,NULL,'standard',NULL,0,130464,85.00,NULL,'Pixel artist and game jam enthusiast. Top contributor on multiple drops.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c4','data_monk','datamonk@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',9200,NULL,0,'Daniel','Monk',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1773286455000,1775014455000,0,NULL,NULL,'free',NULL,0,0,60.00,NULL,'Data engineer with a passion for decentralized systems.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c5','sky_coder','skycoder@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',19953,NULL,0,'Sky','Coder',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1768102455000,1775014455000,0,NULL,NULL,'standard',NULL,0,1953,74.00,NULL,'Freelance developer. I review everything I download.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c6','luna_byte','luna@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',6059,'2026-04-14 04:39:14',0,'Luna','Byte',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1773718455000,1775014455000,0,NULL,NULL,'free',NULL,0,2759,65.00,NULL,'Night-owl coder and music lover.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c7','turbo_dev','turbo@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',183052,'2026-05-12 21:56:54',0,'Turbo','Dev',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1762054455000,1775014455000,1,'MJVVCNTNGZMDQOCIKZYVMVCULFHUEUBL','[\"6B28-5E57-8C06-6BC7\", \"1C19-2185-94D0-21BD\", \"A702-79A8-4A5F-969C\", \"43F0-00E1-ABD6-7168\", \"6E25-2921-A0E3-B3D6\", \"FEB4-A950-91ED-6658\", \"EC41-380E-2285-C135\", \"86D5-0F88-4B28-A50B\"]','standard',NULL,3,316926,79.00,NULL,'Speed is everything. Building fast apps and burning credits faster.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('c8','echo_wave','echo@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',4307,'2026-04-03 23:09:04',1,'Echo','Wave',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1774150455000,1775014455000,0,NULL,NULL,'free',NULL,0,807,58.00,NULL,'Audio engineer and sound enthusiast.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('creator-1','StarForge Studios','starforge@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',84678,'2026-04-29 07:14:54',1,'Star','Forge',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1759462455000,1775014455000,0,NULL,NULL,'free',NULL,8,1850029,91.00,NULL,'Indie game studio crafting pixel-art adventures.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('creator-2','RetroSonic','retrosonic@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',51210,'2026-04-04 08:01:08',0,'Retro','Sonic',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1767238455000,1775014455000,0,NULL,NULL,'free',NULL,13,922210,87.00,NULL,'Music producer & sound designer specializing in synthwave.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('creator-3','MindLab','mindlab@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',71951,'2026-04-10 21:28:59',1,'Mind','Lab',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1754278455000,1775014455000,0,NULL,NULL,'free',NULL,3,640049,94.00,NULL,'Building tools for deep work and intentional living.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('creator-4','Dr. Elena Markov','elena.markov@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',15000,NULL,0,'Elena','Markov',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1769830455000,1775014455000,0,NULL,NULL,'free',NULL,2,185000,76.00,NULL,'Cryptography researcher. Decentralized identity & ZKPs.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('K5IGM21O1B','gamer2','gamer2@gmail.com','$2b$12$o4DahHIYJtXLdxjAB6A1ieGARV5dFOCr4NyFQOUeqZkc7FGy9IF3G',70,NULL,0,'gamer2','','',NULL,'enc_key_1778612444929',0,0,'',NULL,NULL,1778612444723,1778612444723,1,'GF4U23KIINLXGN2CKVTHO6KVMJMFO4BR','[\"2040-2972-5FFD-F905\", \"21F6-B8F5-6AB2-A83F\", \"06C3-80C4-7632-9BC4\", \"C018-2A9F-1D3B-D285\", \"F82C-BCC5-8B35-D8E0\", \"3775-6BBA-E953-D309\", \"BC04-0AEC-17F3-13ED\", \"D7D8-1ED4-9249-A098\"]','free',NULL,0,0,NULL,'https://i.pravatar.cc/150?img=15','',NULL,NULL,'{}','false',0.1372,0.1432,'{\"BTC\":{\"amount1\":\"0.00000170\",\"amount2\":\"0.00000177\"},\"ETH\":{\"amount1\":\"0.00006018\",\"amount2\":\"0.00006281\"},\"LTC\":{\"amount1\":\"0.00238236\",\"amount2\":\"0.00248654\"},\"SOL\":{\"amount1\":\"0.00091467\",\"amount2\":\"0.00095467\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('M1KBSGI37M','coolrapper26','rapper@gmail.com','$2b$12$RxRPeaeaM1IGu4XvffRCxOLmZ/1PHr8l9qxdbs18CnGBf2qXvcqnq',1,NULL,1,'coolrapper26','','',NULL,'enc_key_1778622490027',0,0,'',NULL,NULL,1778622489881,1778622489881,1,'KB2FGYTXG44EER3CFN2G24CHKNYDMTBP','[\"1EAA-40CF-8EBA-54FF\", \"2ACD-7583-DF75-D417\", \"6D3C-5685-A188-CDCD\", \"03CB-9355-079C-E8D2\", \"F07B-A909-F49B-E38F\", \"D6B5-56BA-5BF5-A9EC\", \"CFB9-B48E-0D42-8624\", \"4A53-45DA-1D87-11BA\"]','free',NULL,1,0,NULL,'https://i.pravatar.cc/150?img=1','',NULL,NULL,'{}','false',0.1179,0.175,'{\"BTC\":{\"amount1\":\"0.00000146\",\"amount2\":\"0.00000217\"},\"ETH\":{\"amount1\":\"0.00005162\",\"amount2\":\"0.00007662\"},\"LTC\":{\"amount1\":\"0.00202682\",\"amount2\":\"0.00300842\"},\"SOL\":{\"amount1\":\"0.00078600\",\"amount2\":\"0.00116667\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('Q2R3DSAVB8','scramblurr','scramblurr.app@proton.me','$2b$12$SFqqFa5Bg0PXfoNzBhznDuaPwFdo/YEk/CAW9jmFeYP1zQwMqNT9S',12046,'2026-04-27 16:40:35',0,'scramblurr','','',NULL,'enc_key_1776224279421',0,0,'',NULL,NULL,1776224279209,1776224279209,0,'','[]','free',NULL,1,242,NULL,'https://i.pravatar.cc/150?img=54','',NULL,NULL,'{}','true',0.1546,0.1862,'{\"BTC\":{\"amount1\":\"0.00000208\",\"amount2\":\"0.00000251\"},\"ETH\":{\"amount1\":\"0.00006648\",\"amount2\":\"0.00008007\"},\"LTC\":{\"amount1\":\"0.00285714\",\"amount2\":\"0.00344114\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,'/uploads/verification/scramblurr/facePic_bd215a67-caa9-4a20-8710-8b8c5d2ed567.gif','/uploads/verification/scramblurr/idPhoto_ffa6ace3-f76f-4d5b-9841-3dfe5ad20e10.png','pending',NULL,NULL,NULL),('RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com','$2b$12$cEsd8ksk/w82uRGrFEfiD.pI7FsalmnYOd/NNNeTchUxvGliQbb.K',10858,'2026-05-22 00:13:05',0,'ikemnkur','','',NULL,'enc_key_1775100539597',0,0,'',NULL,NULL,1775100539431,1775100539431,1,'MJLWOUTTJBYES3DHNBHXGV2WJNIVOMLH','[\"13C6-977E-6C37-018A\", \"F7A4-650C-76C5-4317\", \"1A23-E7CD-21EF-63C3\", \"D1FA-A9B9-368C-F562\", \"E656-223F-7499-7B35\", \"FB38-C812-E510-1AA0\", \"0110-9349-8B86-99F4\", \"AF7E-4CFB-D6AB-5B42\"]','standard',NULL,0,2314,NULL,'https://i.pravatar.cc/150?img=67','',NULL,NULL,'{}','pending',0.1269,0.1387,'{\"BTC\":{\"amount1\":\"0.00000190\",\"amount2\":\"0.00000208\"},\"ETH\":{\"amount1\":\"0.00006118\",\"amount2\":\"0.00006687\"},\"LTC\":{\"amount1\":\"0.00240843\",\"amount2\":\"0.00263238\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('u1','ikem','ikem@drauwpr.com','$2b$12$Le5VmZbf3X1ZVqhNwCgUhuE5.nD4Wjiyw7vziMJ02oPLVHEmwfzDW',25000,NULL,0,'Ikem','Nkur',NULL,NULL,NULL,0,0,NULL,NULL,NULL,1772422455000,1775014455000,0,NULL,NULL,'standard',NULL,0,0,NULL,NULL,'Platform founder & tester.',NULL,NULL,NULL,'verified',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('UJH2MRXCGU','ikenuru','ikenuru@gmail.com','$2b$12$6eddVLoNwEraUuiqAWOUtukRTVutnLwCR4RU2SuAct1DpZdVuisbu',57890,'2026-05-16 19:57:43',1,'ikenuru','','',NULL,'enc_key_1777053616763',0,0,'',NULL,NULL,1777053616621,1777053616621,0,'','[]','free',NULL,2,525,NULL,'https://storage.googleapis.com/cloutcoinclub_bucket/storage_folder/avatars/UJH2MRXCGU/f63b29f6-342d-486f-8ab8-058fc2a1a1da_avatar.webp','super cool content dropper',NULL,NULL,'{\"github\": \"\", \"tiktok\": \"\", \"discord\": \"\", \"twitter\": \"https://x.com/@ikenuru\", \"website\": \"\", \"youtube\": \"\", \"instagram\": \"\"}','false',0.1859,0.1949,'{\"BTC\":{\"amount1\":\"0.00000239\",\"amount2\":\"0.00000251\"},\"ETH\":{\"amount1\":\"0.00008011\",\"amount2\":\"0.00008399\"},\"LTC\":{\"amount1\":\"0.00328910\",\"amount2\":\"0.00344834\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('V2V72GOMMU','swpromos','swpromos@proton.me','$2b$12$eyrQ3B9lxCMHZXPuBn.ytuJw8QJLUHpg0xV8iFN6lJZ9qZ4yDWEZm',100,NULL,1,'swpromos','','',NULL,'enc_key_1779975421085',0,0,'',NULL,NULL,1779975420988,1779975420988,0,'','[]','free',NULL,0,0,NULL,'https://i.pravatar.cc/150?img=34','',NULL,NULL,'{}','false',0.1537,0.1008,'{\"BTC\":{\"amount1\":\"0.00000211\",\"amount2\":\"0.00000138\"},\"ETH\":{\"amount1\":\"0.00007762\",\"amount2\":\"0.00005091\"},\"LTC\":{\"amount1\":\"0.00302500\",\"amount2\":\"0.00198386\"},\"SOL\":{\"amount1\":\"0.00190317\",\"amount2\":\"0.00124814\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('ZQX060INJO','kcnkur','kcnkurumeh@gmail.com','$2b$12$JKbzS5NblhxqhsLh1NCw2eca3oXAEVbB.Yl5meIiTirBkUjzNi0BC',24907,NULL,1,'kcnkur','','',NULL,'enc_key_1778311402893',0,0,'',NULL,NULL,1778311402751,1778311402751,0,'','[]','free',NULL,1,0,NULL,'https://i.pravatar.cc/150?img=45','',NULL,NULL,'{}','false',0.113,0.1575,'{\"BTC\":{\"amount1\":\"0.00000141\",\"amount2\":\"0.00000196\"},\"ETH\":{\"amount1\":\"0.00004880\",\"amount2\":\"0.00006801\"},\"LTC\":{\"amount1\":\"0.00193129\",\"amount2\":\"0.00269185\"},\"SOL\":{\"amount1\":\"Infinity\",\"amount2\":\"Infinity\"}}',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `userData` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:08:56
