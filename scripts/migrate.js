#!/usr/bin/env node

/**
 * Database migration script for Club Chomp
 * Run with: npm run db:migrate
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/club.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created directory: ${dbDir}`);
}

// Read and execute schema
const schemaPath = path.join(__dirname, '../src/lib/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  db.exec(schema);
  console.log('Database schema applied successfully!');
  console.log(`Database location: ${DB_PATH}`);

  // Show table info
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log('\nTables created:');
  tables.forEach(t => console.log(`  - ${t.name}`));

} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
