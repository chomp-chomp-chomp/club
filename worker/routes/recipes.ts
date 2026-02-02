import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId } from '../utils';

export const recipesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get curated shelf
recipesRoutes.get('/shelf', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Get featured items
  const featured = await c.env.DB.prepare(`
    SELECT s.*, rc.title as cached_title, rc.url as cached_url
    FROM club_shelf_items s
    LEFT JOIN recipes_cache rc ON rc.slug = s.recipe_slug
    WHERE s.is_featured = 1
    ORDER BY s.sort_order ASC
  `).all();

  // Get collections with their items
  const collections = await c.env.DB.prepare(`
    SELECT * FROM collections ORDER BY sort_order ASC
  `).all();

  const collectionsWithItems = await Promise.all(
    collections.results.map(async (collection: any) => {
      const items = await c.env.DB.prepare(`
        SELECT s.*, rc.title as cached_title, rc.url as cached_url
        FROM club_shelf_items s
        LEFT JOIN recipes_cache rc ON rc.slug = s.recipe_slug
        WHERE s.collection_id = ?
        ORDER BY s.sort_order ASC
      `).bind(collection.id).all();

      return {
        ...collection,
        items: items.results,
      };
    })
  );

  return c.json({
    featured: featured.results,
    collections: collectionsWithItems,
  });
});

// Add to shelf (admin)
recipesRoutes.post('/shelf', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{
    recipe_slug?: string;
    custom_title?: string;
    custom_url?: string;
    collection_id?: string;
    is_featured?: boolean;
  }>();

  if (!body.recipe_slug && !body.custom_title) {
    return c.json({ error: 'Recipe slug or custom title required' }, 400);
  }

  const itemId = generateId();

  // Get max sort order
  const maxOrder = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max FROM club_shelf_items'
  ).first();

  const sortOrder = ((maxOrder?.max as number) || 0) + 1;

  await c.env.DB.prepare(`
    INSERT INTO club_shelf_items (id, recipe_slug, custom_title, custom_url, collection_id, is_featured, sort_order, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    itemId,
    body.recipe_slug || null,
    body.custom_title || null,
    body.custom_url || null,
    body.collection_id || null,
    body.is_featured ? 1 : 0,
    sortOrder,
    new Date().toISOString()
  ).run();

  const item = await c.env.DB.prepare(
    'SELECT * FROM club_shelf_items WHERE id = ?'
  ).bind(itemId).first();

  return c.json(item, 201);
});

// Update shelf item (admin)
recipesRoutes.patch('/shelf/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const itemId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{
    collection_id?: string | null;
    is_featured?: number;
    sort_order?: number;
  }>();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.collection_id !== undefined) {
    updates.push('collection_id = ?');
    values.push(body.collection_id);
  }

  if (body.is_featured !== undefined) {
    updates.push('is_featured = ?');
    values.push(body.is_featured);
  }

  if (body.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(body.sort_order);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided' }, 400);
  }

  values.push(itemId);

  await c.env.DB.prepare(
    `UPDATE club_shelf_items SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const item = await c.env.DB.prepare(
    'SELECT * FROM club_shelf_items WHERE id = ?'
  ).bind(itemId).first();

  return c.json(item);
});

// Remove from shelf (admin)
recipesRoutes.delete('/shelf/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const itemId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM club_shelf_items WHERE id = ?').bind(itemId).run();

  return c.json({ success: true });
});

// Get cached recipes (admin)
recipesRoutes.get('/cache', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const search = c.req.query('search') || '';

  let recipes;
  if (search) {
    recipes = await c.env.DB.prepare(`
      SELECT * FROM recipes_cache
      WHERE title LIKE ? OR tags LIKE ?
      ORDER BY title ASC
      LIMIT 50
    `).bind(`%${search}%`, `%${search}%`).all();
  } else {
    recipes = await c.env.DB.prepare(`
      SELECT * FROM recipes_cache
      ORDER BY cached_at DESC
      LIMIT 100
    `).all();
  }

  return c.json(recipes.results);
});

// Refresh cache from external API (admin)
recipesRoutes.post('/cache', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const apiUrl = c.env.RECIPE_API_URL || 'https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json';

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return c.json({ error: 'Failed to fetch recipes from external API' }, 502);
    }

    const recipes = await response.json() as any[];
    let updated = 0;

    for (const recipe of recipes) {
      await c.env.DB.prepare(`
        INSERT INTO recipes_cache (slug, title, url, tags, excerpt, updated_at, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
          title = excluded.title,
          url = excluded.url,
          tags = excluded.tags,
          excerpt = excluded.excerpt,
          updated_at = excluded.updated_at,
          cached_at = excluded.cached_at
      `).bind(
        recipe.slug,
        recipe.title,
        recipe.url,
        JSON.stringify(recipe.tags || []),
        recipe.excerpt || null,
        recipe.updated_at || null,
        new Date().toISOString()
      ).run();
      updated++;
    }

    return c.json({ success: true, updated });
  } catch (error) {
    console.error('Refresh cache error:', error);
    return c.json({ error: 'Failed to refresh cache' }, 500);
  }
});
