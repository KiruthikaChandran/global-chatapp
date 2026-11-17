import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'relayroom.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password TEXT NOT NULL,
    profile_image TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS global_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_global_messages_created_at ON global_messages(created_at);

  CREATE TABLE IF NOT EXISTS chat_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')) DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chat_requests_sender ON chat_requests(sender_id, status);
  CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver ON chat_requests(receiver_id, status);

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    UNIQUE(conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
  CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

  CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_private_messages_conv ON private_messages(conversation_id, created_at);
`);

export interface UserRow {
  id: number;
  full_name: string;
  username: string;
  email: string;
  password: string;
  profile_image: string;
  bio: string;
  created_at: string;
}

export interface UserPublicDTO {
  id: number;
  fullName: string;
  username: string;
  email?: string;
  profileImage: string;
  bio: string;
  createdAt: string;
  presenceStatus: 'LIVE' | 'ONLINE' | 'OFFLINE';
}

export function toPublicUserDTO(
  row: Omit<UserRow, 'password'> & { password?: string },
  presenceStatus: 'LIVE' | 'ONLINE' | 'OFFLINE' = 'OFFLINE',
  includeEmail = false
): UserPublicDTO {
  const dto: UserPublicDTO = {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    profileImage: row.profile_image,
    bio: row.bio || '',
    createdAt: row.created_at,
    presenceStatus,
  };
  if (includeEmail) {
    dto.email = row.email;
  }
  return dto;
}

export function findDirectConversationId(userA: number, userB: number): number | null {
  const row = db
    .prepare(
      `SELECT cp1.conversation_id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2
         ON cp1.conversation_id = cp2.conversation_id
       WHERE cp1.user_id = ? AND cp2.user_id = ?
       LIMIT 1`
    )
    .get(userA, userB) as { conversation_id: number } | undefined;
  return row ? row.conversation_id : null;
}

export function isConversationParticipant(conversationId: number, userId: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1`
    )
    .get(conversationId, userId);
  return Boolean(row);
}

export function getConversationParticipantIds(conversationId: number): number[] {
  const rows = db
    .prepare(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`)
    .all(conversationId) as { user_id: number }[];
  return rows.map((r) => r.user_id);
}

export default db;
