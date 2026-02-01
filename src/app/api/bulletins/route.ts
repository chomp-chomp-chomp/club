import { NextRequest } from 'next/server';
import { getCurrentMember, requireMember } from '@/lib/auth';
import { getDb, Bulletin, Member } from '@/lib/db';
import {
  generateId,
  getBulletinExpiry,
  jsonResponse,
  errorResponse,
  sanitizeText,
} from '@/lib/utils';

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const db = getDb();

    const bulletins = db.prepare(`
      SELECT b.*, m.display_name as member_name
      FROM bulletins b
      JOIN members m ON b.member_id = m.id
      WHERE b.is_removed = 0 AND b.expires_at > datetime('now')
      ORDER BY b.created_at DESC
      LIMIT 50
    `).all() as (Bulletin & { member_name: string })[];

    return jsonResponse(bulletins);
  } catch {
    return errorResponse('Failed to get bulletins', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return errorResponse('Content required', 400);
    }

    const sanitizedContent = sanitizeText(content, 280);
    if (sanitizedContent.length < 1) {
      return errorResponse('Content required', 400);
    }

    const db = getDb();

    const bulletinId = generateId();
    const expiresAt = getBulletinExpiry();

    db.prepare(`
      INSERT INTO bulletins (id, member_id, content, expires_at, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(bulletinId, member.id, sanitizedContent, expiresAt);

    const bulletin = db.prepare(`
      SELECT b.*, m.display_name as member_name
      FROM bulletins b
      JOIN members m ON b.member_id = m.id
      WHERE b.id = ?
    `).get(bulletinId);

    return jsonResponse(bulletin, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to create bulletin', 500);
  }
}
