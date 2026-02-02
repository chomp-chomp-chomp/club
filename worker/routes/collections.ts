import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId, sanitizeText } from '../utils';

export const collectionsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all collections
collectionsRoutes.get('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const collections = await c.env.DB.prepare(`
    SELECT * FROM collections ORDER BY sort_order ASC
  `).all();

  return c.json(collections.results);
});

// Create collection (admin)
collectionsRoutes.post('/', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{ name: string }>();
  const name = sanitizeText(body.name || '', 100);

  if (name.length < 1) {
    return c.json({ error: 'Collection name required' }, 400);
  }

  const collectionId = generateId();

  // Get max sort order
  const maxOrder = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max FROM collections'
  ).first();

  const sortOrder = ((maxOrder?.max as number) || 0) + 1;

  await c.env.DB.prepare(`
    INSERT INTO collections (id, name, sort_order, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(collectionId, name, sortOrder, new Date().toISOString()).run();

  const collection = await c.env.DB.prepare(
    'SELECT * FROM collections WHERE id = ?'
  ).bind(collectionId).first();

  return c.json(collection, 201);
});

// Update collection (admin)
collectionsRoutes.patch('/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const collectionId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{ name?: string; sort_order?: number }>();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) {
    updates.push('name = ?');
    values.push(sanitizeText(body.name, 100));
  }

  if (body.sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(body.sort_order);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided' }, 400);
  }

  values.push(collectionId);

  await c.env.DB.prepare(
    `UPDATE collections SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const collection = await c.env.DB.prepare(
    'SELECT * FROM collections WHERE id = ?'
  ).bind(collectionId).first();

  return c.json(collection);
});

// Delete collection (admin)
collectionsRoutes.delete('/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const collectionId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  // Remove collection reference from shelf items
  await c.env.DB.prepare(
    'UPDATE club_shelf_items SET collection_id = NULL WHERE collection_id = ?'
  ).bind(collectionId).run();

  // Delete collection
  await c.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId).run();

  return c.json({ success: true });
});
