-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: tutorlink_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booked_by_id` int NOT NULL,
  `tutor_profile_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `session_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','accepted','rejected','cancelled','completed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (now()),
  `updated_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `booked_by_id` (`booked_by_id`),
  KEY `tutor_profile_id` (`tutor_profile_id`),
  KEY `subject_id` (`subject_id`),
  KEY `ix_bookings_id` (`id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`booked_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles` (`id`),
  CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `ck_booking_time_order` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,11,6,7,'2026-11-03','18:00:00','19:00:00','Tulong sa Python basics.','cancelled','2026-10-30 07:23:51','2026-10-30 07:38:59'),(2,10,6,7,'2026-11-03','19:00:00','20:00:00',NULL,'rejected','2026-10-30 07:33:44','2026-10-30 07:34:36'),(3,11,6,7,'2026-10-30','18:00:00','19:00:00','Tulong sa Python basics.','rejected','2026-10-30 07:40:27','2026-10-30 14:40:15'),(4,11,6,7,'2026-11-10','18:00:00','19:00:00','Tulong sa Python basics.','accepted','2026-10-30 07:41:14','2026-10-30 14:41:24'),(5,8,7,8,'2026-11-02','17:00:00','18:00:00',NULL,'completed','2026-10-30 14:35:16','2026-11-02 03:53:10'),(6,7,7,8,'2026-11-09','17:00:00','18:00:00',NULL,'cancelled','2026-10-30 14:39:30','2026-10-30 14:40:51'),(7,7,4,4,'2026-11-06','15:00:00','18:00:00',NULL,'cancelled','2026-10-31 10:13:07','2026-10-31 10:13:51'),(8,7,7,8,'2026-11-09','17:00:00','18:00:00','gusto ko ng mabait','accepted','2026-11-02 01:12:39','2026-11-02 03:52:37'),(9,10,4,2,'2026-11-06','15:00:00','17:00:00',NULL,'cancelled','2026-11-02 03:48:07','2026-11-02 03:49:51'),(10,8,4,4,'2026-11-06','15:00:00','17:00:00',NULL,'pending','2026-11-02 04:10:15','2026-11-02 04:10:15'),(11,13,4,2,'2026-11-06','15:00:00','18:00:00',NULL,'pending','2026-11-02 19:36:06','2026-11-02 19:36:06'),(12,13,4,2,'2026-11-07','08:00:00','11:00:00',NULL,'cancelled','2026-11-02 19:36:58','2026-11-02 19:37:26');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parent_profiles`
--

DROP TABLE IF EXISTS `parent_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parent_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contact_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_parent_profiles_id` (`id`),
  CONSTRAINT `parent_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parent_profiles`
--

LOCK TABLES `parent_profiles` WRITE;
/*!40000 ALTER TABLE `parent_profiles` DISABLE KEYS */;
INSERT INTO `parent_profiles` VALUES (1,8,NULL,NULL),(2,11,NULL,NULL),(3,14,NULL,NULL),(4,16,NULL,NULL);
/*!40000 ALTER TABLE `parent_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `ix_reviews_id` (`id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_review_rating_range` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_profiles`
--

DROP TABLE IF EXISTS `student_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `school_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_student_profiles_id` (`id`),
  CONSTRAINT `student_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_profiles`
--

LOCK TABLES `student_profiles` WRITE;
/*!40000 ALTER TABLE `student_profiles` DISABLE KEYS */;
INSERT INTO `student_profiles` VALUES (1,7,NULL,NULL,NULL),(2,9,NULL,NULL,NULL),(3,10,NULL,NULL,NULL),(4,12,NULL,NULL,NULL),(5,13,NULL,NULL,NULL),(6,15,NULL,NULL,NULL),(7,17,NULL,NULL,NULL),(8,18,NULL,NULL,NULL);
/*!40000 ALTER TABLE `student_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `ix_subjects_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
INSERT INTO `subjects` VALUES (1,'Mathematics','Algebra, geometry, trigonometry, at calculus'),(2,'English','Grammar, reading, at writing'),(3,'Science','General science, biology, at earth science'),(4,'Filipino','Gramatika, pagbasa, at pagsulat'),(5,'Physics','Mechanics, electricity, at waves'),(6,'Chemistry','General at organic chemistry'),(7,'Programming','Python, Java, at web development'),(8,'Accounting','Basic at financial accounting');
/*!40000 ALTER TABLE `subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_applications`
--

DROP TABLE IF EXISTS `tutor_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutor_applications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tutor_profile_id` int NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_remarks` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` int DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT (now()),
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tutor_profile_id` (`tutor_profile_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `ix_tutor_applications_id` (`id`),
  CONSTRAINT `tutor_applications_ibfk_1` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tutor_applications_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_applications`
--

LOCK TABLES `tutor_applications` WRITE;
/*!40000 ALTER TABLE `tutor_applications` DISABLE KEYS */;
INSERT INTO `tutor_applications` VALUES (1,1,'approved','Sample data',NULL,'2026-10-26 13:22:18',NULL),(2,2,'approved','Sample data',NULL,'2026-10-28 00:57:17',NULL),(3,3,'approved','Sample data',NULL,'2026-10-28 00:57:17',NULL),(4,4,'approved','Sample data',NULL,'2026-10-28 00:57:17',NULL),(5,5,'approved','Sample data',NULL,'2026-10-28 00:57:17',NULL),(6,6,'rejected','Kulang pa ang qualifications.',6,'2026-10-29 05:22:56','2026-10-29 05:28:08'),(7,6,'approved',NULL,6,'2026-10-29 05:30:45','2026-10-29 05:32:49'),(8,7,'rejected','kase',6,'2026-10-29 15:23:27','2026-10-29 15:27:05'),(9,7,'approved',NULL,6,'2026-10-29 15:28:36','2026-10-29 15:29:08'),(10,8,'approved',NULL,6,'2026-11-02 04:01:36','2026-11-02 19:12:55'),(11,9,'approved',NULL,6,'2026-11-02 19:50:58','2026-11-02 20:16:03'),(12,10,'approved',NULL,6,'2026-11-02 20:10:58','2026-11-02 20:11:44');
/*!40000 ALTER TABLE `tutor_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_availability`
--

DROP TABLE IF EXISTS `tutor_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutor_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tutor_profile_id` int NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tutor_profile_id` (`tutor_profile_id`),
  KEY `ix_tutor_availability_id` (`id`),
  CONSTRAINT `tutor_availability_ibfk_1` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_availability_time_order` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_availability`
--

LOCK TABLES `tutor_availability` WRITE;
/*!40000 ALTER TABLE `tutor_availability` DISABLE KEYS */;
INSERT INTO `tutor_availability` VALUES (1,1,'monday','16:00:00','18:00:00'),(2,1,'wednesday','16:00:00','18:00:00'),(3,1,'saturday','09:00:00','12:00:00'),(4,2,'monday','16:00:00','18:00:00'),(5,2,'wednesday','16:00:00','18:00:00'),(6,2,'saturday','09:00:00','12:00:00'),(7,3,'tuesday','18:00:00','20:00:00'),(8,3,'thursday','18:00:00','20:00:00'),(9,3,'sunday','13:00:00','17:00:00'),(10,4,'friday','15:00:00','18:00:00'),(11,4,'saturday','08:00:00','11:00:00'),(12,5,'monday','17:00:00','19:00:00'),(13,5,'thursday','17:00:00','19:00:00'),(14,5,'saturday','13:00:00','16:00:00'),(17,6,'tuesday','18:00:00','20:00:00'),(18,6,'saturday','09:00:00','12:00:00'),(21,7,'monday','17:00:00','18:00:00'),(22,8,'monday','17:00:00','19:00:00'),(23,9,'tuesday','14:30:00','18:00:00'),(25,10,'monday','17:00:00','18:00:00'),(26,10,'tuesday','17:00:00','18:00:00');
/*!40000 ALTER TABLE `tutor_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_profiles`
--

DROP TABLE IF EXISTS `tutor_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutor_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `qualifications` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `hourly_rate` decimal(10,2) NOT NULL,
  `is_approved` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (now()),
  `updated_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `ix_tutor_profiles_id` (`id`),
  CONSTRAINT `tutor_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_profiles`
--

LOCK TABLES `tutor_profiles` WRITE;
/*!40000 ALTER TABLE `tutor_profiles` DISABLE KEYS */;
INSERT INTO `tutor_profiles` VALUES (1,1,'3rd year BS Information Technology student; Dean\'s Lister','Matiyaga at madaling lapitan. Marunong magturo ng Math at English.',250.00,1,'2026-10-26 13:22:18','2026-10-26 13:22:18'),(2,2,'3rd year BS Education (Mathematics); Dean\'s Lister','Matiyaga at madaling lapitan. Mahilig magpaliwanag nang paunti-unti hanggang maintindihan.',250.00,1,'2026-10-28 00:57:17','2026-10-28 00:57:17'),(3,3,'4th year BS Information Technology; 2 taong karanasan sa web development','Tinuturuan ko ang mga baguhan sa Python at web development gamit ang mga totoong halimbawa.',300.00,1,'2026-10-28 00:57:17','2026-10-28 00:57:17'),(4,4,'3rd year BSE major in Filipino; Campus journalist','Tutulungan kitang humasa sa pagbasa, pagsulat, at gramatika.',200.00,1,'2026-10-28 00:57:17','2026-10-28 00:57:17'),(5,5,'Graduate ng BS Physics; Board exam passer','Gumagamit ako ng mga eksperimento at larawan para mas madaling maintindihan ang agham.',350.00,1,'2026-10-28 00:57:17','2026-10-28 00:57:17'),(6,7,'3rd year BS Information Technology; Dean\'s Lister','Mahilig magturo ng programming.',300.00,1,'2026-10-29 05:22:56','2026-10-29 05:32:49'),(7,10,'bsit 3rd year',NULL,300.00,1,'2026-10-29 15:23:27','2026-10-29 15:29:08'),(8,12,'3rd year bsit',NULL,300.00,1,'2026-11-02 04:01:36','2026-11-02 19:12:55'),(9,13,'4th year BSIT,JP Dela cruz',NULL,56.00,1,'2026-11-02 19:50:58','2026-11-02 20:16:03'),(10,17,'3rd year bsit','qwertzxcv',500.00,1,'2026-11-02 20:10:58','2026-11-02 20:12:37');
/*!40000 ALTER TABLE `tutor_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tutor_subjects`
--

DROP TABLE IF EXISTS `tutor_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tutor_subjects` (
  `tutor_profile_id` int NOT NULL,
  `subject_id` int NOT NULL,
  PRIMARY KEY (`tutor_profile_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `tutor_subjects_ibfk_1` FOREIGN KEY (`tutor_profile_id`) REFERENCES `tutor_profiles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tutor_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tutor_subjects`
--

LOCK TABLES `tutor_subjects` WRITE;
/*!40000 ALTER TABLE `tutor_subjects` DISABLE KEYS */;
INSERT INTO `tutor_subjects` VALUES (1,1),(2,1),(3,1),(6,1),(1,2),(2,2),(4,2),(5,3),(4,4),(5,5),(5,6),(8,6),(3,7),(6,7),(7,8),(8,8),(9,8),(10,8);
/*!40000 ALTER TABLE `tutor_subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','parent','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_email` (`email`),
  KEY `ix_users_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'sample.tutor@example.com','SAMPLE-NOT-A-REAL-HASH','Sample Tutor','student',1,'2026-10-26 13:22:18'),(2,'ana.reyes.sample@example.com','SAMPLE-NOT-A-REAL-HASH','Ana Reyes','student',1,'2026-10-28 00:57:17'),(3,'mark.villanueva.sample@example.com','SAMPLE-NOT-A-REAL-HASH','Mark Villanueva','student',1,'2026-10-28 00:57:17'),(4,'liza.mendoza.sample@example.com','SAMPLE-NOT-A-REAL-HASH','Liza Mendoza','student',1,'2026-10-28 00:57:17'),(5,'carlo.bautista.sample@example.com','SAMPLE-NOT-A-REAL-HASH','Carlo Bautista','student',1,'2026-10-28 00:57:17'),(6,'admin@tutorlink.com','$2b$12$h.IoUUc3ZZfHcW6qUCD3IuO/tbjweDnwFgVFiBUbX8q1CPQQmuVI2','admin neust','admin',1,'2026-10-28 16:51:23'),(7,'student1@example.com','$2b$12$cQ4.Uypltlq4ddFhrKtsdO1M6mG.d9JvTCCc1LANqkPL6u9Z5693W','Juan Student','student',1,'2026-10-28 16:53:58'),(8,'magulang408@gmail.com','$2b$12$q5bD7jnx9KaxZEK2Xh0.mOhUwhj/PxyYpre/WXwrZFghgCjg9eQ12','magulang example','parent',1,'2026-10-28 18:39:14'),(9,'user@example.com','$2b$12$bZUVwbOq4kD8avJprkZoG.rg3rce3C0Q5gFGedjy1wxR3G6ENIzlu','string','student',1,'2026-10-29 05:17:37'),(10,'ben@example.com','$2b$12$QPdvo/HqbsB90dUU9fHN3.uRJyX3WKzBVtm18Orybk5h73EuEVmU2','Ben Tutor','student',1,'2026-10-29 15:22:13'),(11,'maria2@example.com','$2b$12$8RKI4swX1H9A4OZE8NEVO.j21eFvfvzbDMtvzk3flbOIjwB4O8FZ6','Maria Parent','parent',1,'2026-10-30 07:20:41'),(12,'delacruzjhaym408@gmail.com','$2b$12$00Crv6.6RbohrI4xJ.Iueuj07GnG0OewyxIJ4mE0hsciVVGrB/Ika','Jose Dela cruz','student',1,'2026-11-02 03:58:24'),(13,'botevincent@gmail.com','$2b$12$LwC0D0dcWBH7VPpjEZ21HOyHdr8ODGoJAzhQ/BnJgpNOUVjGNjRwi','vincentt bote','student',1,'2026-11-02 19:19:38'),(14,'lovelymadrid@gamil.com','$2b$12$j.djgw6gTNAcPypdD8a9l.uWIZ3qXV563CFjLmnRp9Jgk2Cf3SroS','lovely madrid','parent',1,'2026-11-02 19:54:02'),(15,'vince@gmail.com','$2b$12$7GjElqvL4pbi68nb/FGJNuxWCU70z0j7OGRx3L.x4qtTOuiVY4b4G','vince bote','student',1,'2026-11-02 20:06:00'),(16,'bro@gmail.com','$2b$12$h9J0JMP2ikcR/tyWS1cdm.m2uFlUi007/CaRiei1FkhTL7luBtNKe','bro bro','parent',1,'2026-11-02 20:06:59'),(17,'josedc@gmail.com','$2b$12$GhLAQJdleuggB.bn1/YckuXF6OB7GKIJwOjOt13RaSAS0yIdjmSMq','jose dc','student',1,'2026-11-02 20:10:29'),(18,'vincetyn@gmail.com','$2b$12$7EgnHq0NdL7/QfAlpzGsEeIFWCneX64DxS2/7.wDsH2ufgq3G7s.O','vincetyn hg','student',1,'2026-11-02 20:23:57');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02 23:02:58
