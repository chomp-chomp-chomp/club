-- Club Chomp Database Schema
-- Cloudflare D1 (SQLite-compatible)

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  invite_code_id TEXT,
  is_admin INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT,
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_prefs (
  id TEXT PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL,
  bake_started INTEGER DEFAULT 0,
  recipe_dropped INTEGER DEFAULT 1,
  club_call INTEGER DEFAULT 1
);

-- Pulses table (main activity feed)
CREATE TABLE IF NOT EXISTS pulses (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  member_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  recipe_slug TEXT,
  created_at TEXT NOT NULL
);

-- Bulletins table (ephemeral chalkboard)
CREATE TABLE IF NOT EXISTS bulletins (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Bulletin replies table
CREATE TABLE IF NOT EXISTS bulletin_replies (
  id TEXT PRIMARY KEY,
  bulletin_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Recipes cache (from external API)
CREATE TABLE IF NOT EXISTS recipes_cache (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  tags TEXT,
  excerpt TEXT,
  updated_at TEXT,
  cached_at TEXT NOT NULL
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
  added_at TEXT NOT NULL
);

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pulses_created_at ON pulses(created_at);
CREATE INDEX IF NOT EXISTS idx_pulses_type ON pulses(type);
CREATE INDEX IF NOT EXISTS idx_bulletins_expires_at ON bulletins(expires_at);
CREATE INDEX IF NOT EXISTS idx_bulletins_member ON bulletins(member_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_member ON push_subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_shelf_collection ON club_shelf_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_member ON notification_prefs(member_id);
