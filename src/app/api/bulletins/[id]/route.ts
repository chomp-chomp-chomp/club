import { NextRequest } from 'next/server';
import { getCurrentMember, requireAdmin } from '@/lib/auth';
import { getDb, Bulletin, BulletinReply } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const { id } = await params;
    const db = getDb();

    const bulletin = db.prepare(`
      SELECT b.*, m.display_name as member_name
      FROM bulletins b
      JOIN members m ON b.member_id = m.id
      WHERE b.id = ? AND b.is_removed = 0
    `).get(id) as (Bulletin & { member_name: string }) | undefined;

    if (!bulletin) {
      return errorResponse('Bulletin not found', 404);
    }

    const replies = db.prepare(`
      SELECT r.*, m.display_name as member_name
      FROM bulletin_replies r
      JOIN members m ON r.member_id = m.id
      WHERE r.bulletin_id = ?
      ORDER BY r.created_at ASC
    `).all(id) as (BulletinReply & { member_name: string })[];

    return jsonResponse({ ...bulletin, replies });
  } catch {
    return errorResponse('Failed to get bulletin', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();

    db.prepare(`UPDATE bulletins SET is_removed = 1 WHERE id = ?`).run(id);

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to delete bulletin', 500);
  }
}
