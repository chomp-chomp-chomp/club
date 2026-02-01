import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb, RecipeCache } from '@/lib/db';
import { sendPushToAll, PushPayload } from '@/lib/push';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { recipe_slug, custom_title, custom_url } = body;

    if (!recipe_slug && !custom_title) {
      return errorResponse('Recipe slug or custom title required', 400);
    }

    const db = getDb();
    let title: string;
    let url: string | null = null;

    if (recipe_slug) {
      // Get from cache
      const cached = db.prepare('SELECT * FROM recipes_cache WHERE slug = ?').get(recipe_slug) as RecipeCache | undefined;
      if (!cached) {
        return errorResponse('Recipe not found in cache', 404);
      }
      title = cached.title;
      url = cached.url;
    } else {
      title = sanitizeText(custom_title, 200);
      url = custom_url || null;
    }

    // Create pulse
    const pulseId = generateId();

    db.prepare(`
      INSERT INTO pulses (id, type, member_id, title, body, recipe_slug, recipe_url, created_at)
      VALUES (?, 'recipe_dropped', ?, ?, ?, ?, ?, datetime('now'))
    `).run(pulseId, admin.id, 'New recipe dropped', title, recipe_slug || null, url);

    // Send push to all members
    const payload: PushPayload = {
      v: 1,
      kind: 'pulse',
      pulse_id: pulseId,
      type: 'recipe_dropped',
      title: 'New recipe dropped',
      body: title,
      url: url || `/pulses/${pulseId}`,
    };

    const pushResult = await sendPushToAll(payload);

    const pulse = db.prepare('SELECT * FROM pulses WHERE id = ?').get(pulseId);

    return jsonResponse({ pulse, push: pushResult }, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    console.error('Drop recipe error:', error);
    return errorResponse('Failed to drop recipe', 500);
  }
}
