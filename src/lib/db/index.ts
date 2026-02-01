import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/club.db';

// Ensure data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDb(): void {
  const database = getDb();
  const schemaPath = join(__dirname, 'schema.sql');

  // Try to read schema from the built location or source
  let schema: string;
  try {
    schema = readFileSync(schemaPath, 'utf-8');
  } catch {
    // Fallback to src location during development
    schema = readFileSync(join(process.cwd(), 'src/lib/db/schema.sql'), 'utf-8');
  }

  database.exec(schema);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Type definitions for database rows
export interface Member {
  id: string;
  display_name: string;
  invite_code_id: string | null;
  is_admin: number;
  is_disabled: number;
  created_at: string;
  last_seen_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  created_by: string | null;
  created_at: string;
  max_uses: number;
  use_count: number;
  is_revoked: number;
  expires_at: string | null;
}

export interface PushSubscription {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  is_active: number;
}

export interface NotificationPrefs {
  member_id: string;
  bake_started: number;
  recipe_dropped: number;
  club_call: number;
  updated_at: string;
}

export interface Pulse {
  id: string;
  type: 'bake_started' | 'recipe_dropped' | 'club_call';
  member_id: string | null;
  title: string;
  body: string | null;
  recipe_slug: string | null;
  recipe_url: string | null;
  created_at: string;
}

export interface Bulletin {
  id: string;
  member_id: string;
  content: string;
  reply_count: number;
  created_at: string;
  expires_at: string;
  is_removed: number;
}

export interface BulletinReply {
  id: string;
  bulletin_id: string;
  member_id: string;
  content: string;
  created_at: string;
}

export interface RecipeCache {
  slug: string;
  title: string;
  url: string;
  tags: string | null;
  excerpt: string | null;
  updated_at: string | null;
  cached_at: string;
}

export interface ClubShelfItem {
  id: string;
  recipe_slug: string | null;
  custom_title: string | null;
  custom_url: string | null;
  collection_id: string | null;
  is_featured: number;
  sort_order: number;
  added_at: string;
  added_by: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface Session {
  id: string;
  member_id: string;
  created_at: string;
  expires_at: string;
}
