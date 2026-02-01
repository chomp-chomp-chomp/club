import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb, RecipeCache } from '@/lib/db';
import { jsonResponse, errorResponse } from '@/lib/utils';

const RECIPE_API_URL = process.env.RECIPE_API_URL || 'https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    const db = getDb();

    let recipes: RecipeCache[];
    if (search) {
      recipes = db.prepare(`
        SELECT * FROM recipes_cache
        WHERE title LIKE ? OR tags LIKE ?
        ORDER BY title ASC
        LIMIT 50
      `).all(`%${search}%`, `%${search}%`) as RecipeCache[];
    } else {
      recipes = db.prepare(`
        SELECT * FROM recipes_cache
        ORDER BY cached_at DESC
        LIMIT 100
      `).all() as RecipeCache[];
    }

    return jsonResponse(recipes);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    return errorResponse('Failed to get recipes', 500);
  }
}

export async function POST() {
  try {
    await requireAdmin();

    // Fetch recipes from external API
    const response = await fetch(RECIPE_API_URL);
    if (!response.ok) {
      return errorResponse('Failed to fetch recipes from external API', 502);
    }

    const recipes = await response.json();
    const db = getDb();

    let updated = 0;
    for (const recipe of recipes) {
      db.prepare(`
        INSERT INTO recipes_cache (slug, title, url, tags, excerpt, updated_at, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          url = excluded.url,
          tags = excluded.tags,
          excerpt = excluded.excerpt,
          updated_at = excluded.updated_at,
          cached_at = datetime('now')
      `).run(
        recipe.slug,
        recipe.title,
        recipe.url,
        JSON.stringify(recipe.tags || []),
        recipe.excerpt || null,
        recipe.updated_at || null
      );
      updated++;
    }

    return jsonResponse({ success: true, updated });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    console.error('Refresh cache error:', error);
    return errorResponse('Failed to refresh cache', 500);
  }
}
