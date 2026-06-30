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
-- Table structure for table `CreditPurchases`
--

DROP TABLE IF EXISTS `CreditPurchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CreditPurchases` (
  `id` varchar(10) NOT NULL,
  `userId` varchar(10) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `credits` int NOT NULL DEFAULT '0',
  `package` enum('5000','10000','25000','50000','100000','custom') DEFAULT NULL,
  `amountPaid` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'USD amount paid',
  `amount` int DEFAULT NULL,
  `currency` varchar(8) DEFAULT NULL,
  `paymentMethod` enum('stripe','btc','eth','ltc','sol') DEFAULT NULL,
  `status` enum('completed','processing','failed','refunded') DEFAULT NULL,
  `stripePaymentIntentId` varchar(255) DEFAULT NULL,
  `stripeChargeId` varchar(255) DEFAULT NULL,
  `cryptoAmount` decimal(18,8) DEFAULT NULL,
  `walletAddress` varchar(128) DEFAULT NULL,
  `txHash` varchar(128) DEFAULT NULL,
  `blockExplorerLink` varchar(255) DEFAULT NULL,
  `exchangeRate` decimal(12,4) DEFAULT NULL,
  `confirmations` int DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `userAgent` varchar(255) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `time` varchar(255) DEFAULT NULL,
  `transactionHash` varchar(255) DEFAULT NULL,
  `rate` float DEFAULT NULL,
  `stripeCheckoutSessionId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_paymentMethod` (`paymentMethod`),
  CONSTRAINT `CreditPurchases_ibfk_user` FOREIGN KEY (`userId`) REFERENCES `userData` (`id`) ON DELETE CASCADE,
  CONSTRAINT `CreditPurchases_ibfk_username` FOREIGN KEY (`username`) REFERENCES `userData` (`username`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CreditPurchases`
--

LOCK TABLES `CreditPurchases` WRITE;
/*!40000 ALTER TABLE `CreditPurchases` DISABLE KEYS */;
INSERT INTO `CreditPurchases` VALUES ('2c6p1ndg','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',25000,'25000',0.00,2500,'USD','stripe','completed','pi_3TQryy3julCtRIb50IbcmQ4H','py_3TQryy3julCtRIb50hD5W5L3',24.50000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-27 16:26:10','1777307170004',NULL,'2026-04-27T16:26:10.004Z','pi_3TQryy3julCtRIb50IbcmQ4H',NULL,'cs_test_a1GPxboN0yF4i7KOO0SP5UGcZ9cwG35Ubic9CmXvJ0R2pvhmcBK1dKILip'),('4oiri50s','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',10000,'10000',0.00,1000,'USD','stripe','completed','pi_3TQfTF3julCtRIb51JKhw7eL','py_3TQfTF3julCtRIb51MyrADOp',9.85000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'cs_test_a1OaPgGlWsebmronL7W6nufZrapTqbo6fUNu6mgAnD8QKmaNBfFJlL8QBg','2026-04-27 03:04:34','1777259074841',NULL,'2026-04-27T03:04:34.841Z','pi_3TQfTF3julCtRIb51JKhw7eL',NULL,NULL),('7zh2f2pl','Q2R3DSAVB8','scramblurr','scramblurr.app@proton.me',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TQsDR3julCtRIb51UuOJCsj','py_3TQsDR3julCtRIb51oAfV2TO',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'Q2R3DSAVB8','2026-04-27 16:41:07','1777308067168',NULL,'2026-04-27T16:41:07.168Z','pi_3TQsDR3julCtRIb51UuOJCsj',NULL,'cs_test_a1mlLzIDWENW7QfOdP6jopk0rLRviLBTqvb9laiW5IgrNvs23sNorzML9g'),('8yswxce2t0','Q2R3DSAVB8','scramblurr',NULL,3067,NULL,3.50,350,'USD','ltc','completed',NULL,NULL,NULL,'ltc1q2gsph0rxkwp4sjraj25upj9uz5ewwyjrgqjrqr','f19abc693704b16eb35d0932ad58e9274f7497781834d9e4e3222599bb53a75f',NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-27 22:52:31',NULL,NULL,NULL,NULL,NULL,NULL),('frkbvdvd','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TRS7u3julCtRIb508mU10Mm','ch_3TRS7u3julCtRIb50HQ3oE13',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-29 07:01:46','1777446106161',NULL,'2026-04-29T07:01:46.161Z','pi_3TRS7u3julCtRIb508mU10Mm',NULL,'cs_test_a1leGY9fValvXHdjLAw8mLmq53mTgPba7Vf5TZ9cM18dgfNxtL1RzEus7F'),('i06ypm4n','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com',10000,'10000',10.00,NULL,'USD','stripe','completed','pi_3TPYEL3julCtRIb51xcebRI7',NULL,9.85000000,'Stripe','pi_3TPYEL3julCtRIb51xcebRI7','www.stripe.com',NULL,NULL,NULL,NULL,'RTMWJ753DR','2026-04-24 01:08:42',NULL,NULL,NULL,NULL,NULL,NULL),('jt9hwgpgua','creator-3','MindLab',NULL,10000,NULL,10.00,NULL,'USD','ltc','failed',NULL,NULL,NULL,'vc903490jv83j4g89456gj4o56g089bj859buj','ltc329-j02jf354890u3489j',NULL,NULL,0,NULL,NULL,NULL,'2026-04-11 00:38:37',NULL,NULL,NULL,NULL,NULL,NULL),('mhf6gv59','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',25000,'25000',0.00,2500,'USD','stripe','completed','pi_3TQs7I3julCtRIb500zhkpNT','py_3TQs7I3julCtRIb50OoNX3kP',24.50000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-27 16:34:49','1777307688345',NULL,'2026-04-27T16:34:48.345Z','pi_3TQs7I3julCtRIb500zhkpNT',NULL,'cs_test_a1gOugy3a0IUiQOpnZdL59YT9MfH7LLdivfhfrkPDDiUnCpDhcDEHCynAp'),('oqzfpw67','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com',10000,'10000',10.00,NULL,'USD','stripe','completed','pi_3TPY573julCtRIb504r7fKz2',NULL,10.00000000,'Stripe','pi_3TPY573julCtRIb504r7fKz2','www.stripe.com',NULL,NULL,NULL,NULL,'RTMWJ753DR','2026-04-24 00:59:07',NULL,NULL,NULL,NULL,NULL,NULL),('p77pwu75','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',25000,'25000',0.00,2500,'USD','stripe','completed','pi_3TQs7I3julCtRIb500zhkpNT','py_3TQs7I3julCtRIb50OoNX3kP',24.50000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-27 16:34:49','1777307688405',NULL,'2026-04-27T16:34:48.405Z','pi_3TQs7I3julCtRIb500zhkpNT',NULL,'cs_test_a1gOugy3a0IUiQOpnZdL59YT9MfH7LLdivfhfrkPDDiUnCpDhcDEHCynAp'),('pur-001','u1','ikem','ikem@drauwpr.com',25000,'25000',25.00,NULL,'USD','stripe','completed','pi_mock_001',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2026-03-04 03:34:15',NULL,NULL,NULL,NULL,NULL,NULL),('pur-002','c1','blaze_runner','blaze@drauwpr.com',50000,'50000',50.00,NULL,'USD','stripe','completed','pi_mock_002',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2026-02-20 03:34:15',NULL,NULL,NULL,NULL,NULL,NULL),('pur-003','c3','pixel_witch','pixel@drauwpr.com',100000,'100000',100.00,NULL,'USD','stripe','completed','pi_mock_003',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2025-12-22 03:34:15',NULL,NULL,NULL,NULL,NULL,NULL),('pur-004','c7','turbo_dev','turbo@drauwpr.com',50000,'50000',50.00,NULL,'USD','stripe','completed','pi_mock_004',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2025-11-12 03:34:15',NULL,NULL,NULL,NULL,NULL,NULL),('pur-005','c5','sky_coder','skycoder@drauwpr.com',25000,'25000',25.00,NULL,'USD','stripe','completed','pi_mock_005',NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2026-01-21 03:34:15',NULL,NULL,NULL,NULL,NULL,NULL),('qectze2e','RTMWJ753DR','ikemnkur','Ikemnkur@gmail.com',10000,'10000',10.00,NULL,'USD','stripe','completed','pi_3TPYIV3julCtRIb50FjgzL3x',NULL,9.85000000,'Stripe','pi_3TPYIV3julCtRIb50FjgzL3x','www.stripe.com',NULL,NULL,NULL,NULL,'RTMWJ753DR','2026-04-24 01:13:37',NULL,NULL,NULL,NULL,NULL,NULL),('qmnjah4gcq','creator-3','MindLab',NULL,10000,NULL,10.00,NULL,'USD','btc','failed',NULL,NULL,NULL,'dc3r32wf3434g45h65rh5r6h567h56','sdvsdvrvererberbe4rb5445454b646b',NULL,NULL,0,NULL,NULL,NULL,'2026-04-11 00:50:04',NULL,NULL,NULL,NULL,NULL,NULL),('qzrztkdq','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',25000,'25000',0.00,2500,'USD','stripe','completed','pi_3TQryy3julCtRIb50IbcmQ4H','py_3TQryy3julCtRIb50hD5W5L3',24.50000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-27 16:26:10','1777307169970',NULL,'2026-04-27T16:26:09.970Z','pi_3TQryy3julCtRIb50IbcmQ4H',NULL,'cs_test_a1GPxboN0yF4i7KOO0SP5UGcZ9cwG35Ubic9CmXvJ0R2pvhmcBK1dKILip'),('rt8oshhx','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TQfQw3julCtRIb50D7um1fX','py_3TQfQw3julCtRIb50NtX61d4',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'cs_test_a1J7OZ3E2ZRhuHQr6r6JvkTcndcpDOS1HxhgEAIRqBTSG30qq5u1H6hRNZ','2026-04-27 03:04:14','1777259054709',NULL,'2026-04-27T03:04:14.709Z','pi_3TQfQw3julCtRIb50D7um1fX',NULL,NULL),('s9ha1fz3','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TRS7u3julCtRIb508mU10Mm','ch_3TRS7u3julCtRIb50HQ3oE13',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'UJH2MRXCGU','2026-04-29 07:01:46','1777446106311',NULL,'2026-04-29T07:01:46.311Z','pi_3TRS7u3julCtRIb508mU10Mm',NULL,'cs_test_a1leGY9fValvXHdjLAw8mLmq53mTgPba7Vf5TZ9cM18dgfNxtL1RzEus7F'),('sfrmyot1','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',10000,'10000',0.00,1000,'USD','stripe','completed','pi_3TQfTF3julCtRIb51JKhw7eL','py_3TQfTF3julCtRIb51MyrADOp',9.85000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'cs_test_a1OaPgGlWsebmronL7W6nufZrapTqbo6fUNu6mgAnD8QKmaNBfFJlL8QBg','2026-04-27 03:04:34','1777259074829',NULL,'2026-04-27T03:04:34.829Z','pi_3TQfTF3julCtRIb51JKhw7eL',NULL,NULL),('u3lv03ec','UJH2MRXCGU','ikenuru','ikenuru@gmail.com',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TQfQw3julCtRIb50D7um1fX','py_3TQfQw3julCtRIb50NtX61d4',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'cs_test_a1J7OZ3E2ZRhuHQr6r6JvkTcndcpDOS1HxhgEAIRqBTSG30qq5u1H6hRNZ','2026-04-27 03:04:14','1777259054675',NULL,'2026-04-27T03:04:14.675Z','pi_3TQfQw3julCtRIb50D7um1fX',NULL,NULL),('v09oy2zi','ZQX060INJO','kcnkur','kcnkurumeh@gmail.com',25000,'25000',0.00,2500,'USD','stripe','completed','pi_3TV5Iy3julCtRIb514wTlPZQ','ch_3TV5Iy3julCtRIb514hqT1oH',24.50000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'ZQX060INJO','2026-05-09 07:28:41','1778311721486',NULL,'2026-05-09T07:28:41.486Z','pi_3TV5Iy3julCtRIb514wTlPZQ',NULL,'cs_test_a1TrqhqOlfbnFKdCrz8jaZrrhM2jrWlvTQfNkSsAstwkHkT7Gays6ImFWy'),('yu4stymv','Q2R3DSAVB8','scramblurr','scramblurr.app@proton.me',5000,'5000',0.00,500,'USD','stripe','completed','pi_3TQsDR3julCtRIb51UuOJCsj','py_3TQsDR3julCtRIb51oAfV2TO',5.25000000,'Stripe',NULL,'www.stripe.com',NULL,NULL,NULL,NULL,'Q2R3DSAVB8','2026-04-27 16:41:07','1777308067135',NULL,'2026-04-27T16:41:07.135Z','pi_3TQsDR3julCtRIb51UuOJCsj',NULL,'cs_test_a1mlLzIDWENW7QfOdP6jopk0rLRviLBTqvb9laiW5IgrNvs23sNorzML9g');
/*!40000 ALTER TABLE `CreditPurchases` ENABLE KEYS */;
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

-- Dump completed on 2026-06-12 10:09:41
