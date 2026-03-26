-- FreshSqueeze Sub Shop — Database Schema
-- OWASP Top 10 Training Lab

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password TEXT NOT NULL,         -- VULNERABLE: plaintext, intentional
  role TEXT DEFAULT 'customer'    -- values: customer, staff, admin
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  item TEXT NOT NULL,
  price REAL NOT NULL,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  secret TEXT                     -- VULNERABLE: hidden column, never shown in UI
);

CREATE TABLE IF NOT EXISTS admin_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note TEXT NOT NULL,             -- contains fake sensitive data (SSNs, card numbers)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author TEXT,
  content TEXT,                   -- VULNERABLE: stored raw, rendered as innerHTML
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  user_input TEXT,                -- VULNERABLE: raw user input stored unredacted
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_code TEXT,
  student_name TEXT,
  challenge_id TEXT,
  solved_at TEXT DEFAULT (datetime('now')),
  hints_used INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  fix_submitted INTEGER DEFAULT 0
);
