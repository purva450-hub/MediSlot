-- MediSlot MySQL 8 schema (mirrors app/models.py). Timestamps are stored in UTC.
-- Alternative: `flask db init && flask db migrate && flask db upgrade` generates migrations from the models.
CREATE DATABASE IF NOT EXISTS medislot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medislot;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient','doctor','admin') NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX ix_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE specialties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  specialty_id INT NOT NULL,
  qualification VARCHAR(160) NOT NULL,
  experience_years INT NOT NULL DEFAULT 0,
  consultation_fee DECIMAL(8,2) NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0,
  clinic_name VARCHAR(160) NOT NULL,
  location VARCHAR(120) NOT NULL,
  address VARCHAR(255) DEFAULT '',
  about TEXT,
  photo_url VARCHAR(255),
  slot_minutes INT NOT NULL DEFAULT 30,
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (specialty_id) REFERENCES specialties(id),
  INDEX ix_doctors_specialty (specialty_id), INDEX ix_doctors_location (location),
  INDEX ix_doctors_status (approval_status)
) ENGINE=InnoDB;

CREATE TABLE doctor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  weekday TINYINT NOT NULL,            -- 0=Mon .. 6=Sun (clinic local time)
  start_time TIME NOT NULL, end_time TIME NOT NULL,
  break_start TIME NULL, break_end TIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX ix_avail_doctor_weekday (doctor_id, weekday)
) ENGINE=InnoDB;

CREATE TABLE doctor_unavailability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  date DATE NOT NULL,
  reason VARCHAR(160),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_unavail_doctor_date (doctor_id, date),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(16) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  start_utc DATETIME NOT NULL, end_utc DATETIME NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('pending','confirmed','completed','cancelled','rejected') NOT NULL DEFAULT 'pending',
  slot_lock VARCHAR(40) NULL UNIQUE,   -- '<doctor_id>:<start>' while active, NULL when released => no double booking
  cancelled_by_id INT NULL, cancelled_at DATETIME NULL, cancel_reason VARCHAR(300),
  reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  FOREIGN KEY (cancelled_by_id) REFERENCES users(id),
  INDEX ix_appt_status (status),
  INDEX ix_appt_doctor_start (doctor_id, start_utc),
  INDEX ix_appt_patient_start (patient_id, start_utc)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(30) NOT NULL, title VARCHAR(120) NOT NULL, message VARCHAR(300) NOT NULL,
  appointment_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  INDEX ix_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,  -- SHA-256 of the emailed token; raw token is never stored
  expires_at DATETIME NOT NULL, used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE revoked_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jti VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(60) NOT NULL, details VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX ix_audit_action (action)
) ENGINE=InnoDB;

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, email VARCHAR(255) NOT NULL, subject VARCHAR(150) NOT NULL, message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
