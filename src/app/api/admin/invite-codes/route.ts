import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb, InviteCode } from '@/lib/db';
import { generateId, generateInviteCode, jsonResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const codes = db.prepare(`
      SELECT ic.*, m.display_name as created_by_name
      FROM invite_codes ic
      LEFT JOIN members m ON ic.created_by = m.id
      ORDER BY ic.created_at DESC
    `).all() as (InviteCode & { created_by_name: string | null })[];

    return jsonResponse(codes);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to get invite codes', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { max_uses, expires_days } = body;

    const db = getDb();
    const codeId = generateId();
    const code = generateInviteCode();

    let expiresAt: string | null = null;
    if (expires_days && expires_days > 0) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + expires_days);
      expiresAt = expiry.toISOString();
    }

    db.prepare(`
      INSERT INTO invite_codes (id, code, created_by, max_uses, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(codeId, code, admin.id, max_uses || 1, expiresAt);

    const inviteCode = db.prepare('SELECT * FROM invite_codes WHERE id = ?').get(codeId);

    return jsonResponse(inviteCode, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to create invite code', 500);
  }
}
