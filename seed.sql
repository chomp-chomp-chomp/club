-- Club Chomp Seed Data
-- Initial admin user and invite code

-- Create initial admin member
INSERT OR IGNORE INTO members (id, display_name, invite_code_id, is_admin, is_active, created_at, last_seen_at)
VALUES ('admin-001', 'Admin', NULL, 1, 1, datetime('now'), datetime('now'));

-- Create initial notification prefs for admin
INSERT OR IGNORE INTO notification_prefs (id, member_id, bake_started, recipe_dropped, club_call)
VALUES ('prefs-001', 'admin-001', 1, 1, 1);

-- Create initial invite code
INSERT OR IGNORE INTO invite_codes (id, code, created_by, max_uses, uses_count, is_active, created_at)
VALUES ('code-001', 'WELCOME1', 'admin-001', 10, 0, 1, datetime('now'));

-- Create a sample pulse
INSERT OR IGNORE INTO pulses (id, type, member_id, title, body, created_at)
VALUES ('pulse-001', 'club_call', 'admin-001', 'Welcome to the club!', 'Your baking journey begins here.', datetime('now'));
