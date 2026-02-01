import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId, getBulletinExpiry, sanitizeText } from '../utils';

export const bulletinsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get active bulletins
bulletinsRoutes.get('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const now = new Date().toISOString();

  const bulletins = await c.env.DB.prepare(`
    SELECT b.*, m.display_name as author_name,
      (SELECT COUNT(*) FROM bulletin_replies WHERE bulletin_id = b.id) as reply_count
    FROM bulletins b
    LEFT JOIN members m ON m.id = b.member_id
    WHERE b.expires_at > ?
    ORDER BY b.created_at DESC
    LIMIT 50
  `).bind(now).all();

  return c.json(bulletins.results);
});

// Create bulletin
bulletinsRoutes.post('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ content: string }>();
  const content = sanitizeText(body.content || '', 280);

  if (content.length < 1) {
    return c.json({ error: 'Content required' }, 400);
  }

  const bulletinId = generateId();
  const now = new Date().toISOString();
  const expiresAt = getBulletinExpiry();

  await c.env.DB.prepare(`
    INSERT INTO bulletins (id, member_id, content, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(bulletinId, memberId, content, now, expiresAt).run();

  const bulletin = await c.env.DB.prepare(`
    SELECT b.*, m.display_name as author_name
    FROM bulletins b
    LEFT JOIN members m ON m.id = b.member_id
    WHERE b.id = ?
  `).bind(bulletinId).first();

  return c.json(bulletin, 201);
});

// Get single bulletin with replies
bulletinsRoutes.get('/:id', async (c) => {
  const memberId = c.get('memberId');
  const bulletinId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const bulletin = await c.env.DB.prepare(`
    SELECT b.*, m.display_name as author_name
    FROM bulletins b
    LEFT JOIN members m ON m.id = b.member_id
    WHERE b.id = ?
  `).bind(bulletinId).first();

  if (!bulletin) {
    return c.json({ error: 'Bulletin not found' }, 404);
  }

  const replies = await c.env.DB.prepare(`
    SELECT r.*, m.display_name as author_name
    FROM bulletin_replies r
    LEFT JOIN members m ON m.id = r.member_id
    WHERE r.bulletin_id = ?
    ORDER BY r.created_at ASC
  `).bind(bulletinId).all();

  return c.json({
    ...bulletin,
    replies: replies.results,
  });
});

// Delete bulletin (admin only)
bulletinsRoutes.delete('/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const bulletinId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM bulletin_replies WHERE bulletin_id = ?').bind(bulletinId).run();
  await c.env.DB.prepare('DELETE FROM bulletins WHERE id = ?').bind(bulletinId).run();

  return c.json({ success: true });
});

// Add reply to bulletin
bulletinsRoutes.post('/:id/replies', async (c) => {
  const memberId = c.get('memberId');
  const bulletinId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ content: string }>();
  const content = sanitizeText(body.content || '', 140);

  if (content.length < 1) {
    return c.json({ error: 'Content required' }, 400);
  }

  // Check bulletin exists and not expired
  const bulletin = await c.env.DB.prepare(
    'SELECT * FROM bulletins WHERE id = ? AND expires_at > ?'
  ).bind(bulletinId, new Date().toISOString()).first();

  if (!bulletin) {
    return c.json({ error: 'Bulletin not found or expired' }, 404);
  }

  // Check reply count (max 7)
  const replyCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM bulletin_replies WHERE bulletin_id = ?'
  ).bind(bulletinId).first();

  if (replyCount && (replyCount.count as number) >= 7) {
    return c.json({ error: 'Maximum replies reached' }, 400);
  }

  const replyId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO bulletin_replies (id, bulletin_id, member_id, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(replyId, bulletinId, memberId, content, now).run();

  const reply = await c.env.DB.prepare(`
    SELECT r.*, m.display_name as author_name
    FROM bulletin_replies r
    LEFT JOIN members m ON m.id = r.member_id
    WHERE r.id = ?
  `).bind(replyId).first();

  return c.json(reply, 201);
});
