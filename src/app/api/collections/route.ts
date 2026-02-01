import { NextRequest } from 'next/server';
import { getCurrentMember, requireAdmin } from '@/lib/auth';
import { getDb, Collection } from '@/lib/db';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const db = getDb();
    const collections = db.prepare(`
      SELECT * FROM collections ORDER BY sort_order ASC
    `).all() as Collection[];

    return jsonResponse(collections);
  } catch {
    return errorResponse('Failed to get collections', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return errorResponse('Name required', 400);
    }

    const sanitizedName = sanitizeText(name, 100);
    if (sanitizedName.length < 1) {
      return errorResponse('Name required', 400);
    }

    const db = getDb();
    const collectionId = generateId();
    const sanitizedDesc = description ? sanitizeText(description, 500) : null;

    // Get next sort order
    const last = db.prepare(`
      SELECT MAX(sort_order) as max_order FROM collections
    `).get() as { max_order: number | null };
    const sortOrder = (last.max_order ?? -1) + 1;

    db.prepare(`
      INSERT INTO collections (id, name, description, sort_order, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(collectionId, sanitizedName, sanitizedDesc, sortOrder, admin.id);

    const collection = db.prepare('SELECT * FROM collections WHERE id = ?').get(collectionId);

    return jsonResponse(collection, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to create collection', 500);
  }
}
