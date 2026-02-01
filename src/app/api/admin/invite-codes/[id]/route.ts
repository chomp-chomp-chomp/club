import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();

    db.prepare('UPDATE invite_codes SET is_revoked = 1 WHERE id = ?').run(id);

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to revoke invite code', 500);
  }
}
