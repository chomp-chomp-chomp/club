-- Club Chomp Database Schema
-- SQLite

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  invite_code_id TEXT,
  is_admin INTEGER DEFAULT 0,
  is_disabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id)
);

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  is_revoked INTEGER DEFAULT 0,
  expires_at TEXT,
  FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_prefs (
  member_id TEXT PRIMARY KEY,
  bake_started INTEGER DEFAULT 0,
  recipe_dropped INTEGER DEFAULT 1,
  club_call INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Pulses table (main activity feed)
CREATE TABLE IF NOT EXISTS pulses (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('bake_started', 'recipe_dropped', 'club_call')),
  member_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  recipe_slug TEXT,
  recipe_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Bulletins table (ephemeral chalkboard)
CREATE TABLE IF NOT EXISTS bulletins (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 280),
  reply_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_removed INTEGER DEFAULT 0,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Bulletin replies table
CREATE TABLE IF NOT EXISTS bulletin_replies (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 140),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bulletin_id) REFERENCES bulletins(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Recipes cache (from external API)
CREATE TABLE IF NOT EXISTS recipes_cache (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  tags TEXT, -- JSON array as text
  excerpt TEXT,
  updated_at TEXT,
  cached_at TEXT DEFAULT (datetime('now'))
);

-- Club shelf items (curated recipes)
CREATE TABLE IF NOT EXISTS club_shelf_items (
  id TEXT PRIMARY KEY,
  recipe_slug TEXT,
  custom_title TEXT,
  custom_url TEXT,
  collection_id TEXT,
  is_featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now')),
  added_by TEXT,
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  FOREIGN KEY (added_by) REFERENCES members(id)
);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES members(id)
);

-- Sessions table (for member authentication)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pulses_created_at ON pulses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulses_type ON pulses(type);
CREATE INDEX IF NOT EXISTS idx_bulletins_expires_at ON bulletins(expires_at);
CREATE INDEX IF NOT EXISTS idx_bulletins_member ON bulletins(member_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_member ON push_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_shelf_collection ON club_shelf_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_sessions_member ON sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
