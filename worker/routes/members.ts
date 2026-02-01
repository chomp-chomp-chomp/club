import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { sanitizeText } from '../utils';

export const membersRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all members (admin)
membersRoutes.get('/', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const members = await c.env.DB.prepare(`
    SELECT m.*,
      (SELECT COUNT(*) FROM push_subscriptions WHERE member_id = m.id) as subscription_count
    FROM members m
    ORDER BY m.created_at DESC
  `).all();

  return c.json(members.results);
});

// Update own profile
membersRoutes.patch('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ display_name?: string }>();

  if (body.display_name) {
    const name = sanitizeText(body.display_name, 50);
    if (name.length < 1) {
      return c.json({ error: 'Display name required' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE members SET display_name = ? WHERE id = ?'
    ).bind(name, memberId).run();
  }

  const member = await c.env.DB.prepare(
    'SELECT * FROM members WHERE id = ?'
  ).bind(memberId).first();

  return c.json(member);
});

// Update member (admin)
membersRoutes.patch('/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const targetId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{
    display_name?: string;
    is_active?: boolean;
    is_admin?: boolean;
  }>();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.display_name) {
    updates.push('display_name = ?');
    values.push(sanitizeText(body.display_name, 50));
  }

  if (body.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
  }

  if (body.is_admin !== undefined) {
    updates.push('is_admin = ?');
    values.push(body.is_admin ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided' }, 400);
  }

  values.push(targetId);

  await c.env.DB.prepare(
    `UPDATE members SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const member = await c.env.DB.prepare(
    'SELECT * FROM members WHERE id = ?'
  ).bind(targetId).first();

  return c.json(member);
});
