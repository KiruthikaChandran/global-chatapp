CREATE DATABASE IF NOT EXISTS relayroom_chat
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE relayroom_chat;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(40) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_image VARCHAR(500) NOT NULL DEFAULT '',
  bio VARCHAR(240) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email UNIQUE (email),
  INDEX idx_users_username (username),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS global_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_global_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_global_messages_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chat_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sender_id BIGINT NOT NULL,
  receiver_id BIGINT NOT NULL,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_requests_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat_requests_sender (sender_id, status),
  INDEX idx_chat_requests_receiver (receiver_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  CONSTRAINT uq_conv_participant UNIQUE (conversation_id, user_id),
  CONSTRAINT fk_conv_part_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_part_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conv_part_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS private_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_private_messages_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_private_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_private_messages_conv (conversation_id, created_at)
) ENGINE=InnoDB;
