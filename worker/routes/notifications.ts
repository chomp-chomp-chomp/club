import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId } from '../utils';

export const notificationsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get VAPID public key
notificationsRoutes.get('/subscribe', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  return c.json({
    vapid_public_key: c.env.VAPID_PUBLIC_KEY || null,
  });
});

// Subscribe to push notifications
notificationsRoutes.post('/subscribe', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'Invalid subscription data' }, 400);
  }

  // Delete existing subscriptions for this endpoint
  await c.env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE endpoint = ?'
  ).bind(body.endpoint).run();

  // Create new subscription
  const subId = generateId();

  await c.env.DB.prepare(`
    INSERT INTO push_subscriptions (id, member_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    subId,
    memberId,
    body.endpoint,
    body.keys.p256dh,
    body.keys.auth,
    new Date().toISOString()
  ).run();

  return c.json({ success: true }, 201);
});

// Unsubscribe from push notifications
notificationsRoutes.delete('/subscribe', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ endpoint: string }>();

  if (body.endpoint) {
    await c.env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE member_id = ? AND endpoint = ?'
    ).bind(memberId, body.endpoint).run();
  } else {
    // Delete all subscriptions for this member
    await c.env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE member_id = ?'
    ).bind(memberId).run();
  }

  return c.json({ success: true });
});

// Get notification preferences
notificationsRoutes.get('/prefs', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const prefs = await c.env.DB.prepare(
    'SELECT bake_started, recipe_dropped, club_call FROM notification_prefs WHERE member_id = ?'
  ).bind(memberId).first();

  if (!prefs) {
    return c.json({
      bake_started: false,
      recipe_dropped: true,
      club_call: true,
    });
  }

  return c.json({
    bake_started: Boolean(prefs.bake_started),
    recipe_dropped: Boolean(prefs.recipe_dropped),
    club_call: Boolean(prefs.club_call),
  });
});

// Update notification preferences
notificationsRoutes.patch('/prefs', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{
    bake_started?: boolean;
    recipe_dropped?: boolean;
    club_call?: boolean;
  }>();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.bake_started !== undefined) {
    updates.push('bake_started = ?');
    values.push(body.bake_started ? 1 : 0);
  }

  if (body.recipe_dropped !== undefined) {
    updates.push('recipe_dropped = ?');
    values.push(body.recipe_dropped ? 1 : 0);
  }

  if (body.club_call !== undefined) {
    updates.push('club_call = ?');
    values.push(body.club_call ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No updates provided' }, 400);
  }

  values.push(memberId);

  // Upsert
  await c.env.DB.prepare(`
    INSERT INTO notification_prefs (id, member_id, bake_started, recipe_dropped, club_call)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(member_id) DO UPDATE SET ${updates.join(', ')}
  `).bind(
    generateId(),
    memberId,
    body.bake_started ? 1 : 0,
    body.recipe_dropped !== false ? 1 : 0,
    body.club_call !== false ? 1 : 0
  ).run();

  const prefs = await c.env.DB.prepare(
    'SELECT bake_started, recipe_dropped, club_call FROM notification_prefs WHERE member_id = ?'
  ).bind(memberId).first();

  return c.json({
    bake_started: Boolean(prefs?.bake_started),
    recipe_dropped: Boolean(prefs?.recipe_dropped),
    club_call: Boolean(prefs?.club_call),
  });
});
