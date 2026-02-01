#!/usr/bin/env node

/**
 * Database seed script for Club Chomp
 * Creates initial admin user and invite code
 * Run with: npm run db:seed
 */

const Database = require('better-sqlite3');
const { randomBytes } = require('crypto');

const DB_PATH = process.env.DATABASE_PATH || './data/club.db';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret';

function generateId() {
  return randomBytes(12).toString('hex');
}

function generateInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

try {
  // Check if already seeded
  const existingAdmin = db.prepare('SELECT id FROM members WHERE is_admin = 1').get();

  if (existingAdmin) {
    console.log('Database already seeded. Skipping.');
    process.exit(0);
  }

  // Create initial admin
  const adminId = generateId();
  const adminName = 'Club Admin';

  db.prepare(`
    INSERT INTO members (id, display_name, is_admin, created_at, last_seen_at)
    VALUES (?, ?, 1, datetime('now'), datetime('now'))
  `).run(adminId, adminName);

  console.log(`Created admin: ${adminName} (${adminId})`);

  // Create notification prefs for admin
  db.prepare(`
    INSERT INTO notification_prefs (member_id, bake_started, recipe_dropped, club_call)
    VALUES (?, 1, 1, 1)
  `).run(adminId);

  // Create initial invite code
  const codeId = generateId();
  const inviteCode = generateInviteCode();

  db.prepare(`
    INSERT INTO invite_codes (id, code, created_by, max_uses, created_at)
    VALUES (?, ?, ?, 10, datetime('now'))
  `).run(codeId, inviteCode, adminId);

  console.log(`Created invite code: ${inviteCode}`);

  // Create default collection
  const collectionId = generateId();
  db.prepare(`
    INSERT INTO collections (id, name, description, sort_order, created_by)
    VALUES (?, 'Favorites', 'Club favorites', 0, ?)
  `).run(collectionId, adminId);

  console.log('Created default collection: Favorites');

  // Create sample pulse
  const pulseId = generateId();
  db.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, created_at)
    VALUES (?, 'club_call', ?, 'Welcome to Chomp Club', 'The club is now open!', datetime('now'))
  `).run(pulseId, adminId);

  console.log('Created welcome pulse');

  console.log('\n--- Seed Complete ---');
  console.log(`Admin secret for first login: ${ADMIN_SECRET}`);
  console.log(`First invite code: ${inviteCode}`);

} catch (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
