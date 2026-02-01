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
    const { name, description, sort_order } = body;

    const db = getDb();

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(sanitizeText(name, 100));
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ? sanitizeText(description, 500) : null);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return errorResponse('No updates provided', 400);
    }

    values.push(id);
    db.prepare(`UPDATE collections SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(id);

    return jsonResponse(collection);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to update collection', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getDb();

    // Remove collection from shelf items first
    db.prepare('UPDATE club_shelf_items SET collection_id = NULL WHERE collection_id = ?').run(id);

    // Delete collection
    db.prepare('DELETE FROM collections WHERE id = ?').run(id);

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to delete collection', 500);
  }
}
