import { NextRequest } from 'next/server';
import { requireMember } from '@/lib/auth';
import { getDb, Bulletin } from '@/lib/db';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

const MAX_REPLIES = 7;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await requireMember();
    const { id: bulletinId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return errorResponse('Content required', 400);
    }

    const sanitizedContent = sanitizeText(content, 140);
    if (sanitizedContent.length < 1) {
      return errorResponse('Content required', 400);
    }

    const db = getDb();

    // Check bulletin exists and is not expired
    const bulletin = db.prepare(`
      SELECT * FROM bulletins
      WHERE id = ? AND is_removed = 0 AND expires_at > datetime('now')
    `).get(bulletinId) as Bulletin | undefined;

    if (!bulletin) {
      return errorResponse('Bulletin not found or expired', 404);
    }

    // Check reply limit
    if (bulletin.reply_count >= MAX_REPLIES) {
      return errorResponse('Maximum replies reached', 400);
    }

    const replyId = generateId();

    db.prepare(`
      INSERT INTO bulletin_replies (id, bulletin_id, member_id, content, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(replyId, bulletinId, member.id, sanitizedContent);

    db.prepare(`
      UPDATE bulletins SET reply_count = reply_count + 1 WHERE id = ?
    `).run(bulletinId);

    const reply = db.prepare(`
      SELECT r.*, m.display_name as member_name
      FROM bulletin_replies r
      JOIN members m ON r.member_id = m.id
      WHERE r.id = ?
    `).get(replyId);

    return jsonResponse(reply, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to create reply', 500);
  }
}
