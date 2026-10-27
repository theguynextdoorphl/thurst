import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

export function openDb(file: string): DB {
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS email_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      birthdate TEXT NOT NULL,
      city TEXT,
      zip TEXT,
      profile TEXT NOT NULL DEFAULT '{}',
      preferences TEXT NOT NULL DEFAULT '{}',
      terms_accepted_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score REAL NOT NULL,
      phase TEXT NOT NULL,
      decision_a TEXT,
      decision_b TEXT,
      created_at INTEGER NOT NULL,
      chat_started_at INTEGER,
      message_count INTEGER NOT NULL DEFAULT 0,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS matches_a ON matches(user_a);
    CREATE INDEX IF NOT EXISTS matches_b ON matches(user_b);

    CREATE TABLE IF NOT EXISTS ratings (
      match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      rater_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ratee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stars INTEGER NOT NULL,
      match_again INTEGER NOT NULL,
      feedback TEXT,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (match_id, rater_id)
    );

    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Matches that were live when the server stopped can never finish; close them.
  db.prepare(`UPDATE matches SET phase = 'ended', ended_at = ? WHERE phase = 'chat'`).run(Date.now());
  db.prepare(`UPDATE matches SET phase = 'declined', ended_at = ? WHERE phase = 'review'`).run(Date.now());
  return db;
}
