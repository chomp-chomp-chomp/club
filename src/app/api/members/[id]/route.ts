import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { is_disabled, is_admin } = body;

    const db = getDb();

    const updates: string[] = [];
    const values: (number | string)[] = [];

    if (is_disabled !== undefined) {
      updates.push('is_disabled = ?');
      values.push(is_disabled ? 1 : 0);
    }
    if (is_admin !== undefined) {
      updates.push('is_admin = ?');
      values.push(is_admin ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse('No updates provided', 400);
    }

    values.push(id);
    db.prepare(`UPDATE members SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);

    return jsonResponse(member);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to update member', 500);
  }
}
