import { getCurrentMember } from '@/lib/auth';
import { getDb, NotificationPrefs } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const member = await getCurrentMember();

    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const db = getDb();
    const prefs = db.prepare(`
      SELECT * FROM notification_prefs WHERE member_id = ?
    `).get(member.id) as NotificationPrefs | undefined;

    return jsonResponse({
      id: member.id,
      display_name: member.display_name,
      is_admin: member.is_admin === 1,
      notification_prefs: prefs
        ? {
            bake_started: prefs.bake_started === 1,
            recipe_dropped: prefs.recipe_dropped === 1,
            club_call: prefs.club_call === 1,
          }
        : {
            bake_started: false,
            recipe_dropped: true,
            club_call: true,
          },
    });
  } catch {
    return errorResponse('Failed to get user', 500);
  }
}
