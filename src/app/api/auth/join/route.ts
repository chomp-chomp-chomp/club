import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invite_code, display_name } = body;

    if (!invite_code || !display_name) {
      return errorResponse('Invite code and display name required', 400);
    }

    const sanitizedName = sanitizeText(display_name, 50);
    if (sanitizedName.length < 1) {
      return errorResponse('Display name required', 400);
    }

    const db = getDb();

    // Find and validate invite code
    const code = db.prepare(`
      SELECT * FROM invite_codes
      WHERE code = ? AND is_revoked = 0
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (max_uses = 0 OR use_count < max_uses)
    `).get(invite_code.toUpperCase());

    if (!code) {
      return errorResponse('Invalid or expired invite code', 400);
    }

    // Create member
    const memberId = generateId();

    db.prepare(`
      INSERT INTO members (id, display_name, invite_code_id, created_at, last_seen_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(memberId, sanitizedName, (code as { id: string }).id);

    // Create default notification prefs
    db.prepare(`
      INSERT INTO notification_prefs (member_id, bake_started, recipe_dropped, club_call)
      VALUES (?, 0, 1, 1)
    `).run(memberId);

    // Increment invite code usage
    db.prepare(`
      UPDATE invite_codes SET use_count = use_count + 1 WHERE id = ?
    `).run((code as { id: string }).id);

    // Create session
    const sessionId = createSession(memberId);
    await setSessionCookie(sessionId);

    return jsonResponse({
      success: true,
      member: {
        id: memberId,
        display_name: sanitizedName,
      },
    });
  } catch (error) {
    console.error('Join error:', error);
    return errorResponse('Failed to join', 500);
  }
}
