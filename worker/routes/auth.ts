import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, Variables } from '../index';
import { generateId, generateSessionId } from '../utils';

export const authRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Join with invite code
authRoutes.post('/join', async (c) => {
  const body = await c.req.json<{ invite_code: string; display_name: string }>();
  const { invite_code, display_name } = body;

  if (!invite_code || !display_name) {
    return c.json({ error: 'Invite code and display name required' }, 400);
  }

  const code = invite_code.trim().toUpperCase();
  const name = display_name.trim().slice(0, 50);

  if (name.length < 1) {
    return c.json({ error: 'Display name required' }, 400);
  }

  // Validate invite code
  const inviteCode = await c.env.DB.prepare(
    'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1'
  ).bind(code).first();

  if (!inviteCode) {
    return c.json({ error: 'Invalid invite code' }, 400);
  }

  // Check usage limit
  if (inviteCode.max_uses && inviteCode.uses_count >= inviteCode.max_uses) {
    return c.json({ error: 'Invite code has been used too many times' }, 400);
  }

  // Create member
  const memberId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO members (id, display_name, invite_code_id, is_admin, is_active, created_at, last_seen_at)
    VALUES (?, ?, ?, 0, 1, ?, ?)
  `).bind(memberId, name, inviteCode.id, now, now).run();

  // Create default notification prefs
  await c.env.DB.prepare(`
    INSERT INTO notification_prefs (id, member_id, bake_started, recipe_dropped, club_call)
    VALUES (?, ?, 0, 1, 1)
  `).bind(generateId(), memberId).run();

  // Increment invite code usage
  await c.env.DB.prepare(
    'UPDATE invite_codes SET uses_count = uses_count + 1 WHERE id = ?'
  ).bind(inviteCode.id).run();

  // Create session
  const sessionId = generateSessionId();
  await c.env.SESSIONS.put(sessionId, JSON.stringify({
    memberId,
    isAdmin: false,
  }), { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days

  setCookie(c, 'session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return c.json({ success: true, member_id: memberId });
});

// Get current member
authRoutes.get('/me', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const member = await c.env.DB.prepare(`
    SELECT m.*, np.bake_started, np.recipe_dropped, np.club_call
    FROM members m
    LEFT JOIN notification_prefs np ON np.member_id = m.id
    WHERE m.id = ? AND m.is_active = 1
  `).bind(memberId).first();

  if (!member) {
    return c.json({ error: 'Member not found' }, 404);
  }

  // Update last seen
  await c.env.DB.prepare(
    'UPDATE members SET last_seen_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), memberId).run();

  return c.json({
    id: member.id,
    display_name: member.display_name,
    is_admin: Boolean(member.is_admin),
    notification_prefs: {
      bake_started: Boolean(member.bake_started),
      recipe_dropped: Boolean(member.recipe_dropped),
      club_call: Boolean(member.club_call),
    },
  });
});

// Logout
authRoutes.post('/logout', async (c) => {
  const sessionId = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];

  if (sessionId) {
    await c.env.SESSIONS.delete(sessionId);
  }

  deleteCookie(c, 'session', { path: '/' });

  return c.json({ success: true });
});
