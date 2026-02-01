import { NextRequest } from 'next/server';
import { getCurrentMember, requireAdmin } from '@/lib/auth';
import { getDb, ClubShelfItem, RecipeCache, Collection } from '@/lib/db';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const db = getDb();

    // Get featured items
    const featured = db.prepare(`
      SELECT s.*, r.title as cached_title, r.url as cached_url, r.excerpt, r.tags
      FROM club_shelf_items s
      LEFT JOIN recipes_cache r ON s.recipe_slug = r.slug
      WHERE s.is_featured = 1
      ORDER BY s.sort_order ASC
    `).all() as (ClubShelfItem & { cached_title: string; cached_url: string; excerpt: string; tags: string })[];

    // Get collections with items
    const collections = db.prepare(`
      SELECT * FROM collections ORDER BY sort_order ASC
    `).all() as Collection[];

    const collectionsWithItems = collections.map((collection) => {
      const items = db.prepare(`
        SELECT s.*, r.title as cached_title, r.url as cached_url, r.excerpt, r.tags
        FROM club_shelf_items s
        LEFT JOIN recipes_cache r ON s.recipe_slug = r.slug
        WHERE s.collection_id = ?
        ORDER BY s.sort_order ASC
      `).all(collection.id) as (ClubShelfItem & { cached_title: string; cached_url: string; excerpt: string; tags: string })[];

      return { ...collection, items };
    });

    return jsonResponse({ featured, collections: collectionsWithItems });
  } catch {
    return errorResponse('Failed to get shelf', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { recipe_slug, custom_title, custom_url, collection_id, is_featured } = body;

    if (!recipe_slug && !custom_title) {
      return errorResponse('Recipe slug or custom title required', 400);
    }

    const db = getDb();
    const itemId = generateId();

    const sanitizedTitle = custom_title ? sanitizeText(custom_title, 200) : null;

    db.prepare(`
      INSERT INTO club_shelf_items
      (id, recipe_slug, custom_title, custom_url, collection_id, is_featured, added_by, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      itemId,
      recipe_slug || null,
      sanitizedTitle,
      custom_url || null,
      collection_id || null,
      is_featured ? 1 : 0,
      admin.id
    );

    const item = db.prepare('SELECT * FROM club_shelf_items WHERE id = ?').get(itemId);

    return jsonResponse(item, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to add to shelf', 500);
  }
}
