import { Hono } from 'hono';
import type { Env, Variables } from '../index';
import { generateId, getPulsesCutoff, sanitizeText } from '../utils';
import { sendPushToMembers } from '../push';

export const pulsesRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get recent pulses (last 72 hours)
pulsesRoutes.get('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const cutoff = getPulsesCutoff();

  const pulses = await c.env.DB.prepare(`
    SELECT p.*, m.display_name as member_name
    FROM pulses p
    LEFT JOIN members m ON m.id = p.member_id
    WHERE p.created_at > ?
    ORDER BY p.created_at DESC
    LIMIT 100
  `).bind(cutoff).all();

  return c.json(pulses.results);
});

// Create bake_started pulse
pulsesRoutes.post('/', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ note?: string; send_push?: boolean }>();
  const note = body.note ? sanitizeText(body.note, 200) : null;
  const sendPush = body.send_push ?? false;

  // Get member name
  const member = await c.env.DB.prepare(
    'SELECT display_name FROM members WHERE id = ?'
  ).bind(memberId).first();

  if (!member) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Create pulse
  const pulseId = generateId();
  const title = `${member.display_name} started baking`;
  const pulseBody = note || null;

  await c.env.DB.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, recipe_slug, created_at)
    VALUES (?, 'bake_started', ?, ?, ?, NULL, ?)
  `).bind(pulseId, memberId, title, pulseBody, new Date().toISOString()).run();

  // Send push if requested
  if (sendPush) {
    await sendPushToMembers(c.env, 'bake_started', {
      v: 1,
      kind: 'pulse',
      pulse_id: pulseId,
      type: 'bake_started',
      title: 'Someone is baking',
      body: title,
      url: '/',
    });
  }

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json(pulse, 201);
});
