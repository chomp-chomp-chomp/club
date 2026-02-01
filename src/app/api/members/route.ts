import { NextRequest } from 'next/server';
import { requireMember, requireAdmin } from '@/lib/auth';
import { getDb, Member, PushSubscription } from '@/lib/db';
import { jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const members = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM push_subscriptions ps WHERE ps.member_id = m.id AND ps.is_active = 1) as active_subscriptions
      FROM members m
      ORDER BY m.created_at DESC
    `).all() as (Member & { active_subscriptions: number })[];

    return jsonResponse(members);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to get members', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { display_name } = body;

    if (!display_name) {
      return errorResponse('Display name required', 400);
    }

    const sanitizedName = sanitizeText(display_name, 50);
    if (sanitizedName.length < 1) {
      return errorResponse('Display name required', 400);
    }

    const db = getDb();
    db.prepare(`UPDATE members SET display_name = ? WHERE id = ?`).run(sanitizedName, member.id);

    const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(member.id);

    return jsonResponse(updated);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to update profile', 500);
  }
}
