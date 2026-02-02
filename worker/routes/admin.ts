import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId, generateInviteCode, sanitizeText } from '../utils';
import { sendPushToMembers, PushPayload } from '../push';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Admin middleware
adminRoutes.use('*', async (c, next) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
});

// Drop recipe
adminRoutes.post('/drop-recipe', async (c) => {
  const memberId = c.get('memberId');

  const body = await c.req.json<{
    recipe_slug?: string;
    custom_title?: string;
    custom_url?: string;
  }>();

  let title: string;
  let url: string;

  if (body.recipe_slug) {
    // Get from cache
    const recipe = await c.env.DB.prepare(
      'SELECT title, url FROM recipes_cache WHERE slug = ?'
    ).bind(body.recipe_slug).first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found in cache' }, 404);
    }

    title = recipe.title as string;
    url = recipe.url as string;
  } else if (body.custom_title && body.custom_url) {
    title = sanitizeText(body.custom_title, 200);
    url = body.custom_url;
  } else {
    return c.json({ error: 'Recipe slug or custom title/url required' }, 400);
  }

  // Create pulse
  const pulseId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, recipe_slug, created_at)
    VALUES (?, 'recipe_dropped', ?, ?, ?, ?, ?)
  `).bind(
    pulseId,
    memberId,
    'New recipe dropped',
    title,
    body.recipe_slug || null,
    now
  ).run();

  // Send push
  const payload: PushPayload = {
    v: 1,
    kind: 'pulse',
    pulse_id: pulseId,
    type: 'recipe_dropped',
    title: 'New recipe dropped',
    body: title,
    url: url,
  };

  const pushResult = await sendPushToMembers(c.env, 'recipe_dropped', payload);

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json({ pulse, push: pushResult }, 201);
});

// Send club call
adminRoutes.post('/club-call', async (c) => {
  const memberId = c.get('memberId');

  const body = await c.req.json<{ message: string }>();
  const message = sanitizeText(body.message || '', 280);

  if (message.length < 1) {
    return c.json({ error: 'Message required' }, 400);
  }

  // Create pulse
  const pulseId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, created_at)
    VALUES (?, 'club_call', ?, ?, ?, ?)
  `).bind(pulseId, memberId, 'Club call', message, now).run();

  // Send push
  const payload: PushPayload = {
    v: 1,
    kind: 'pulse',
    pulse_id: pulseId,
    type: 'club_call',
    title: 'Club call',
    body: message,
    url: '/',
  };

  const pushResult = await sendPushToMembers(c.env, 'club_call', payload);

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json({ pulse, push: pushResult }, 201);
});

// List invite codes
adminRoutes.get('/invite-codes', async (c) => {
  const codes = await c.env.DB.prepare(`
    SELECT * FROM invite_codes ORDER BY created_at DESC
  `).all();

  return c.json(codes.results);
});

// Generate invite code
adminRoutes.post('/invite-codes', async (c) => {
  const memberId = c.get('memberId');

  const body = await c.req.json<{ max_uses?: number }>();

  const codeId = generateId();
  const code = generateInviteCode();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO invite_codes (id, code, created_by, max_uses, uses_count, is_active, created_at)
    VALUES (?, ?, ?, ?, 0, 1, ?)
  `).bind(codeId, code, memberId, body.max_uses || null, now).run();

  const inviteCode = await c.env.DB.prepare(
    'SELECT * FROM invite_codes WHERE id = ?'
  ).bind(codeId).first();

  return c.json(inviteCode, 201);
});

// Revoke invite code
adminRoutes.delete('/invite-codes/:id', async (c) => {
  const codeId = c.req.param('id');

  await c.env.DB.prepare(
    'UPDATE invite_codes SET is_active = 0 WHERE id = ?'
  ).bind(codeId).run();

  return c.json({ success: true });
});
