CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(60) NULL,
  company VARCHAR(190) NULL,
  newsletter TINYINT(1) NOT NULL DEFAULT 1,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(40) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX sessions_user_id (user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  user_id VARCHAR(40) NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  service VARCHAR(160) NOT NULL,
  pricing_category VARCHAR(160) NOT NULL,
  price_option VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_unit VARCHAR(80) NULL,
  estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  property_type VARCHAR(80) NOT NULL,
  rooms VARCHAR(40) NULL,
  city VARCHAR(160) NOT NULL,
  address VARCHAR(255) NULL,
  service_date DATE NOT NULL,
  service_time VARCHAR(20) NOT NULL,
  frequency VARCHAR(80) NULL,
  notes TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Pending Payment',
  payment_method VARCHAR(80) NOT NULL DEFAULT 'PayFast',
  payment_status VARCHAR(80) NOT NULL DEFAULT 'Awaiting PayFast',
  payfast_payment_id VARCHAR(120) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX bookings_user_id (user_id),
  INDEX bookings_reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  contact_name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  hotel_name VARCHAR(190) NULL,
  property_type VARCHAR(80) NULL,
  city VARCHAR(160) NULL,
  rooms VARCHAR(40) NULL,
  frequency VARCHAR(80) NULL,
  service VARCHAR(160) NOT NULL,
  pricing_category VARCHAR(160) NOT NULL,
  price_option VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  services LONGTEXT NULL,
  notes TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(40) NOT NULL UNIQUE,
  referral_code VARCHAR(80) NULL,
  first_name VARCHAR(120) NOT NULL,
  surname VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  id_number VARCHAR(80) NULL,
  gender VARCHAR(40) NULL,
  date_of_birth DATE NULL,
  country VARCHAR(120) NULL,
  province VARCHAR(120) NULL,
  city VARCHAR(160) NOT NULL,
  street_address VARCHAR(255) NULL,
  suburb VARCHAR(160) NULL,
  postal_code VARCHAR(40) NULL,
  roles LONGTEXT NULL,
  work_days LONGTEXT NULL,
  work_areas LONGTEXT NULL,
  work_type LONGTEXT NULL,
  qualifications LONGTEXT NULL,
  skills LONGTEXT NULL,
  years_experience VARCHAR(80) NULL,
  client1_name VARCHAR(160) NULL,
  client1_phone VARCHAR(80) NULL,
  client2_name VARCHAR(160) NULL,
  client2_phone VARCHAR(80) NULL,
  client3_name VARCHAR(160) NULL,
  client3_phone VARCHAR(80) NULL,
  describe_me TEXT NULL,
  grew_up_country VARCHAR(120) NULL,
  grew_up_city VARCHAR(160) NULL,
  hobbies TEXT NULL,
  other_languages VARCHAR(255) NULL,
  motivation TEXT NULL,
  eligibility LONGTEXT NULL,
  consent TINYINT(1) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX job_applications_reference (reference),
  INDEX job_applications_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(40) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'PayFast',
  provider_payment_id VARCHAR(120) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(80) NOT NULL,
  raw_payload LONGTEXT NULL,
  created_at DATETIME NOT NULL,
  INDEX payments_booking_reference (booking_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  channel VARCHAR(40) NOT NULL,
  destination VARCHAR(190) NOT NULL,
  subject VARCHAR(190) NULL,
  body TEXT NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payfast_itn_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(40) NULL,
  valid_signature TINYINT(1) NOT NULL DEFAULT 0,
  valid_server TINYINT(1) NOT NULL DEFAULT 0,
  raw_payload LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
