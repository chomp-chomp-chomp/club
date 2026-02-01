import { NextRequest } from 'next/server';
import { requireMember } from '@/lib/auth';
import { getDb, NotificationPrefs } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const member = await requireMember();
    const db = getDb();

    const prefs = db.prepare(`
      SELECT * FROM notification_prefs WHERE member_id = ?
    `).get(member.id) as NotificationPrefs | undefined;

    return jsonResponse(
      prefs
        ? {
            bake_started: prefs.bake_started === 1,
            recipe_dropped: prefs.recipe_dropped === 1,
            club_call: prefs.club_call === 1,
          }
        : {
            bake_started: false,
            recipe_dropped: true,
            club_call: true,
          }
    );
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to get preferences', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { bake_started, recipe_dropped, club_call } = body;

    const db = getDb();

    // Upsert preferences
    db.prepare(`
      INSERT INTO notification_prefs (member_id, bake_started, recipe_dropped, club_call, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(member_id) DO UPDATE SET
        bake_started = COALESCE(?, bake_started),
        recipe_dropped = COALESCE(?, recipe_dropped),
        club_call = COALESCE(?, club_call),
        updated_at = datetime('now')
    `).run(
      member.id,
      bake_started !== undefined ? (bake_started ? 1 : 0) : 0,
      recipe_dropped !== undefined ? (recipe_dropped ? 1 : 0) : 1,
      club_call !== undefined ? (club_call ? 1 : 0) : 1,
      bake_started !== undefined ? (bake_started ? 1 : 0) : null,
      recipe_dropped !== undefined ? (recipe_dropped ? 1 : 0) : null,
      club_call !== undefined ? (club_call ? 1 : 0) : null
    );

    const prefs = db.prepare(`
      SELECT * FROM notification_prefs WHERE member_id = ?
    `).get(member.id) as NotificationPrefs;

    return jsonResponse({
      bake_started: prefs.bake_started === 1,
      recipe_dropped: prefs.recipe_dropped === 1,
      club_call: prefs.club_call === 1,
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to update preferences', 500);
  }
}
