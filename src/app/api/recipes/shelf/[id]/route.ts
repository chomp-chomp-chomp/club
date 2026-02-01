import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { collection_id, is_featured, sort_order, custom_title } = body;

    const db = getDb();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (collection_id !== undefined) {
      updates.push('collection_id = ?');
      values.push(collection_id);
    }
    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      values.push(is_featured ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }
    if (custom_title !== undefined) {
      updates.push('custom_title = ?');
      values.push(custom_title ? sanitizeText(custom_title, 200) : null);
    }

    if (updates.length === 0) {
      return errorResponse('No updates provided', 400);
    }

    values.push(id);
    db.prepare(`UPDATE club_shelf_items SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const item = db.prepare('SELECT * FROM club_shelf_items WHERE id = ?').get(id);

    return jsonResponse(item);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to update shelf item', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();

    db.prepare('DELETE FROM club_shelf_items WHERE id = ?').run(id);

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to delete shelf item', 500);
  }
}
