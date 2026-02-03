import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

// Types
interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  RECIPE_API_URL: string;
  APP_URL: string;
}

interface Variables {
  memberId: string | null;
  isAdmin: boolean;
}

// Utility functions
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 16; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 32; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const randomValues = new Uint8Array(8);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 8; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

function getPulsesCutoff(): string {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 72);
  return cutoff.toISOString();
}

function getBulletinExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry.toISOString();
}

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: Variables }>().basePath('/api');

// Auth middleware
app.use('*', async (c, next) => {
  const sessionId = getCookie(c, 'session');

  if (sessionId) {
    const session = await c.env.SESSIONS.get(sessionId, 'json') as { memberId: string; isAdmin: boolean } | null;
    if (session?.memberId) {
      const member = await c.env.DB.prepare(
        'SELECT is_admin, is_active FROM members WHERE id = ?'
      ).bind(session.memberId).first<{ is_admin: number; is_active: number }>();

      if (member && member.is_active === 1) {
        const isAdmin = Boolean(member.is_admin);
        c.set('memberId', session.memberId);
        c.set('isAdmin', isAdmin);

        if (session.isAdmin !== isAdmin) {
          await c.env.SESSIONS.put(sessionId, JSON.stringify({
            memberId: session.memberId,
            isAdmin,
          }), { expirationTtl: 60 * 60 * 24 * 30 });
        }
      } else {
        await c.env.SESSIONS.delete(sessionId);
        deleteCookie(c, 'session', { path: '/' });
        c.set('memberId', null);
        c.set('isAdmin', false);
      }
    } else {
      c.set('memberId', null);
      c.set('isAdmin', false);
    }
  } else {
    c.set('memberId', null);
    c.set('isAdmin', false);
  }

  await next();
});

// ==================== HEALTH CHECK ====================

app.get('/health', async (c) => {
  const checks: Record<string, string> = {};

  // Check D1
  try {
    await c.env.DB.prepare('SELECT 1').run();
    checks.d1 = 'ok';
  } catch (e) {
    checks.d1 = 'error: ' + (e instanceof Error ? e.message : 'unknown');
  }

  // Check KV
  try {
    await c.env.SESSIONS.get('__health_check__');
    checks.kv = 'ok';
  } catch (e) {
    checks.kv = 'error: ' + (e instanceof Error ? e.message : 'unknown');
  }

  // Check env vars
  checks.vapid_public = c.env.VAPID_PUBLIC_KEY ? 'set' : 'missing';
  checks.vapid_private = c.env.VAPID_PRIVATE_KEY ? 'set' : 'missing';
  checks.vapid_subject = c.env.VAPID_SUBJECT ? 'set' : 'missing';

  const allOk = checks.d1 === 'ok' && checks.kv === 'ok';

  return c.json({ status: allOk ? 'healthy' : 'unhealthy', checks }, allOk ? 200 : 500);
});

// ==================== AUTH ROUTES ====================

app.post('/auth/join', async (c) => {
  try {
    const body = await c.req.json<{ invite_code: string; display_name: string; email: string }>();
    const { invite_code, display_name, email } = body;

    if (!invite_code || !display_name || !email) {
      return c.json({ error: 'Invite code, name, and email required' }, 400);
    }

    const code = invite_code.trim().toUpperCase();
    const name = display_name.trim().slice(0, 50);
    const emailClean = email.trim().toLowerCase();

    if (name.length < 1) {
      return c.json({ error: 'Display name required' }, 400);
    }

    if (!emailClean.includes('@')) {
      return c.json({ error: 'Valid email required' }, 400);
    }

    // Check if email already exists
    const existingMember = await c.env.DB.prepare(
      'SELECT id FROM members WHERE email = ? AND is_active = 1'
    ).bind(emailClean).first();

    if (existingMember) {
      return c.json({ error: 'Email already registered. Use magic link to log in.' }, 400);
    }

    const inviteCode = await c.env.DB.prepare(
      'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1'
    ).bind(code).first();

    if (!inviteCode) {
      return c.json({ error: 'Invalid invite code' }, 400);
    }

    if (inviteCode.max_uses && (inviteCode.uses_count as number) >= (inviteCode.max_uses as number)) {
      return c.json({ error: 'Invite code has been used too many times' }, 400);
    }

    // Check if this is the first real member (make them admin)
    const memberCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM members WHERE id != 'admin-001'"
    ).first<{ count: number }>();
    const isFirstMember = !memberCount || memberCount.count === 0;

    const memberId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO members (id, display_name, email, invite_code_id, is_admin, is_active, created_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(memberId, name, emailClean, inviteCode.id, isFirstMember ? 1 : 0, now, now).run();

    await c.env.DB.prepare(`
      INSERT INTO notification_prefs (id, member_id, bake_started, recipe_dropped, club_call)
      VALUES (?, ?, 0, 1, 1)
    `).bind(generateId(), memberId).run();

    await c.env.DB.prepare(
      'UPDATE invite_codes SET uses_count = uses_count + 1 WHERE id = ?'
    ).bind(inviteCode.id).run();

    const sessionId = generateSessionId();
    await c.env.SESSIONS.put(sessionId, JSON.stringify({
      memberId,
      isAdmin: isFirstMember,
    }), { expirationTtl: 60 * 60 * 24 * 30 });

    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return c.json({ success: true, member_id: memberId, is_admin: isFirstMember });
  } catch (err) {
    console.error('Join error:', err);
    return c.json({ error: 'Failed to join. Check D1 database bindings and schema.' }, 500);
  }
});

// Request magic link for login
app.post('/auth/magic-link', async (c) => {
  try {
    const body = await c.req.json<{ email: string }>();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return c.json({ error: 'Valid email required' }, 400);
    }

    const member = await c.env.DB.prepare(
      'SELECT id, display_name, is_admin FROM members WHERE email = ? AND is_active = 1'
    ).bind(email).first<{ id: string; display_name: string; is_admin: number }>();

    if (!member) {
      // Don't reveal if email exists
      return c.json({ success: true, message: 'If this email is registered, a login link will be sent.' });
    }

    // Generate magic link token
    const token = generateSessionId();
    await c.env.SESSIONS.put(`magic:${token}`, JSON.stringify({
      memberId: member.id,
      isAdmin: Boolean(member.is_admin),
    }), { expirationTtl: 60 * 15 }); // 15 minutes

    // Send email via Resend
    const appUrl = c.env.APP_URL || 'https://club-chomp.pages.dev';
    const magicUrl = `${appUrl}/magic?token=${token}`;

    if (c.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: c.env.RESEND_FROM || 'Club Chomp <noreply@resend.dev>',
          to: email,
          subject: 'Your Club Chomp login link',
          html: `
            <h2>Welcome back, ${member.display_name}!</h2>
            <p>Click the link below to log in to Club Chomp:</p>
            <p><a href="${magicUrl}" style="display:inline-block;padding:12px 24px;background:#e73b42;color:white;text-decoration:none;border-radius:8px;">Log in to Club Chomp</a></p>
            <p>Or copy this link: ${magicUrl}</p>
            <p>This link expires in 15 minutes.</p>
            <p>If you didn't request this, you can ignore this email.</p>
          `,
        }),
      });

      if (!response.ok) {
        console.error('Resend error:', await response.text());
        return c.json({ error: 'Failed to send email' }, 500);
      }
    }

    return c.json({ success: true, message: 'If this email is registered, a login link will be sent.' });
  } catch (err) {
    console.error('Magic link error:', err);
    return c.json({ error: 'Failed to send magic link' }, 500);
  }
});

// Verify magic link token
app.post('/auth/magic-verify', async (c) => {
  try {
    const body = await c.req.json<{ token: string }>();
    const token = (body.token || '').trim();

    if (!token) {
      return c.json({ error: 'Token required' }, 400);
    }

    const data = await c.env.SESSIONS.get(`magic:${token}`, 'json') as { memberId: string; isAdmin: boolean } | null;

    if (!data) {
      return c.json({ error: 'Invalid or expired link' }, 400);
    }

    // Delete the magic token so it can't be reused
    await c.env.SESSIONS.delete(`magic:${token}`);

    // Create a new session
    const sessionId = generateSessionId();
    await c.env.SESSIONS.put(sessionId, JSON.stringify({
      memberId: data.memberId,
      isAdmin: data.isAdmin,
    }), { expirationTtl: 60 * 60 * 24 * 30 });

    setCookie(c, 'session', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return c.json({ success: true });
  } catch (err) {
    console.error('Magic verify error:', err);
    return c.json({ error: 'Failed to verify link' }, 500);
  }
});

app.get('/auth/me', async (c) => {
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

app.post('/auth/logout', async (c) => {
  const sessionId = getCookie(c, 'session');

  if (sessionId) {
    await c.env.SESSIONS.delete(sessionId);
  }

  deleteCookie(c, 'session', { path: '/' });

  return c.json({ success: true });
});

// Generate a login code for multi-device login
app.post('/auth/login-code', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  // Store in KV with 5-minute expiry
  await c.env.SESSIONS.put(`login_code:${code}`, JSON.stringify({
    memberId,
    isAdmin,
  }), { expirationTtl: 300 });

  return c.json({ code, expires_in: 300 });
});

// Login with a code from another device
app.post('/auth/login-with-code', async (c) => {
  const body = await c.req.json<{ code: string }>();
  const code = (body.code || '').trim().toUpperCase();

  if (!code || code.length !== 6) {
    return c.json({ error: 'Invalid code format' }, 400);
  }

  const data = await c.env.SESSIONS.get(`login_code:${code}`, 'json') as { memberId: string; isAdmin: boolean } | null;

  if (!data) {
    return c.json({ error: 'Invalid or expired code' }, 400);
  }

  // Delete the code so it can't be reused
  await c.env.SESSIONS.delete(`login_code:${code}`);

  // Create a new session
  const sessionId = generateSessionId();
  await c.env.SESSIONS.put(sessionId, JSON.stringify({
    memberId: data.memberId,
    isAdmin: data.isAdmin,
  }), { expirationTtl: 60 * 60 * 24 * 30 });

  setCookie(c, 'session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return c.json({ success: true });
});

// ==================== PULSES ROUTES ====================

app.get('/pulses', async (c) => {
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

app.post('/pulses', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ note?: string; send_push?: boolean }>();
  const note = body.note ? sanitizeText(body.note, 200) : null;

  const member = await c.env.DB.prepare(
    'SELECT display_name FROM members WHERE id = ?'
  ).bind(memberId).first();

  if (!member) {
    return c.json({ error: 'Member not found' }, 404);
  }

  const pulseId = generateId();
  const title = `${member.display_name} started baking`;

  await c.env.DB.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, recipe_slug, created_at)
    VALUES (?, 'bake_started', ?, ?, ?, NULL, ?)
  `).bind(pulseId, memberId, title, note, new Date().toISOString()).run();

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json(pulse, 201);
});

// ==================== BULLETINS ROUTES ====================

app.get('/bulletins', async (c) => {
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

app.post('/bulletins', async (c) => {
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

app.get('/bulletins/:id', async (c) => {
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

app.delete('/bulletins/:id', async (c) => {
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

app.post('/bulletins/:id/replies', async (c) => {
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

  const bulletin = await c.env.DB.prepare(
    'SELECT * FROM bulletins WHERE id = ? AND expires_at > ?'
  ).bind(bulletinId, new Date().toISOString()).first();

  if (!bulletin) {
    return c.json({ error: 'Bulletin not found or expired' }, 404);
  }

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

// ==================== RECIPES ROUTES ====================

app.get('/recipes/shelf', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const featured = await c.env.DB.prepare(`
    SELECT s.*, rc.title as cached_title, rc.url as cached_url
    FROM club_shelf_items s
    LEFT JOIN recipes_cache rc ON rc.slug = s.recipe_slug
    WHERE s.is_featured = 1
    ORDER BY s.sort_order ASC
  `).all();

  const collections = await c.env.DB.prepare(`
    SELECT * FROM collections ORDER BY sort_order ASC
  `).all();

  const collectionsWithItems = await Promise.all(
    (collections.results as any[]).map(async (collection) => {
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

app.post('/recipes/shelf', async (c) => {
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

app.patch('/recipes/shelf/:id', async (c) => {
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

app.delete('/recipes/shelf/:id', async (c) => {
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

app.get('/recipes/cache', async (c) => {
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

app.post('/recipes/cache', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const apiUrl = c.env.RECIPE_API_URL || 'https://chompchomp.cc/data/recipes.json';

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

// ==================== NOTIFICATIONS ROUTES ====================

app.get('/notifications/subscribe', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  return c.json({
    vapid_public_key: c.env.VAPID_PUBLIC_KEY || null,
  });
});

app.post('/notifications/subscribe', async (c) => {
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

  await c.env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE endpoint = ?'
  ).bind(body.endpoint).run();

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

app.delete('/notifications/subscribe', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const body = await c.req.json<{ endpoint?: string }>();

  if (body.endpoint) {
    await c.env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE member_id = ? AND endpoint = ?'
    ).bind(memberId, body.endpoint).run();
  } else {
    await c.env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE member_id = ?'
    ).bind(memberId).run();
  }

  return c.json({ success: true });
});

app.get('/notifications/prefs', async (c) => {
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

app.patch('/notifications/prefs', async (c) => {
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

  if (updates.length > 0) {
    values.push(memberId);
    await c.env.DB.prepare(
      `UPDATE notification_prefs SET ${updates.join(', ')} WHERE member_id = ?`
    ).bind(...values).run();
  }

  const prefs = await c.env.DB.prepare(
    'SELECT bake_started, recipe_dropped, club_call FROM notification_prefs WHERE member_id = ?'
  ).bind(memberId).first();

  return c.json({
    bake_started: Boolean(prefs?.bake_started),
    recipe_dropped: Boolean(prefs?.recipe_dropped),
    club_call: Boolean(prefs?.club_call),
  });
});

// ==================== MEMBERS ROUTES ====================

app.get('/members', async (c) => {
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

app.patch('/members', async (c) => {
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

app.patch('/members/:id', async (c) => {
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

// ==================== COLLECTIONS ROUTES ====================

app.get('/collections', async (c) => {
  const memberId = c.get('memberId');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const collections = await c.env.DB.prepare(`
    SELECT * FROM collections ORDER BY sort_order ASC
  `).all();

  return c.json(collections.results);
});

app.post('/collections', async (c) => {
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

app.patch('/collections/:id', async (c) => {
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

app.delete('/collections/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const collectionId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE club_shelf_items SET collection_id = NULL WHERE collection_id = ?'
  ).bind(collectionId).run();

  await c.env.DB.prepare('DELETE FROM collections WHERE id = ?').bind(collectionId).run();

  return c.json({ success: true });
});

// ==================== ADMIN ROUTES ====================

app.post('/admin/drop-recipe', async (c) => {
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
  }>();

  let title: string;

  if (body.recipe_slug) {
    const recipe = await c.env.DB.prepare(
      'SELECT title, url FROM recipes_cache WHERE slug = ?'
    ).bind(body.recipe_slug).first();

    if (!recipe) {
      return c.json({ error: 'Recipe not found in cache' }, 404);
    }

    title = recipe.title as string;
  } else if (body.custom_title && body.custom_url) {
    title = sanitizeText(body.custom_title, 200);
  } else {
    return c.json({ error: 'Recipe slug or custom title/url required' }, 400);
  }

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

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json({ pulse }, 201);
});

app.post('/admin/club-call', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{ message: string }>();
  const message = sanitizeText(body.message || '', 280);

  if (message.length < 1) {
    return c.json({ error: 'Message required' }, 400);
  }

  const pulseId = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO pulses (id, type, member_id, title, body, created_at)
    VALUES (?, 'club_call', ?, ?, ?, ?)
  `).bind(pulseId, memberId, 'Club call', message, now).run();

  const pulse = await c.env.DB.prepare(
    'SELECT * FROM pulses WHERE id = ?'
  ).bind(pulseId).first();

  return c.json({ pulse }, 201);
});

app.get('/admin/invite-codes', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const codes = await c.env.DB.prepare(`
    SELECT * FROM invite_codes ORDER BY created_at DESC
  `).all();

  return c.json(codes.results);
});

app.post('/admin/invite-codes', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const body = await c.req.json<{ max_uses?: number; email?: string; count?: number }>();
  const count = Math.min(Math.max(body.count || 1, 1), 50); // 1-50 codes at a time
  const now = new Date().toISOString();

  const codes = [];
  for (let i = 0; i < count; i++) {
    const codeId = generateId();
    const code = generateInviteCode();

    // Try with email column, fall back to without if column doesn't exist
    try {
      await c.env.DB.prepare(`
        INSERT INTO invite_codes (id, code, created_by, max_uses, uses_count, is_active, created_at, email)
        VALUES (?, ?, ?, ?, 0, 1, ?, ?)
      `).bind(codeId, code, memberId, body.max_uses ?? 1, now, body.email || null).run();
    } catch {
      // Fallback without email column
      await c.env.DB.prepare(`
        INSERT INTO invite_codes (id, code, created_by, max_uses, uses_count, is_active, created_at)
        VALUES (?, ?, ?, ?, 0, 1, ?)
      `).bind(codeId, code, memberId, body.max_uses ?? 1, now).run();
    }

    const inviteCode = await c.env.DB.prepare(
      'SELECT * FROM invite_codes WHERE id = ?'
    ).bind(codeId).first();

    codes.push(inviteCode);
  }

  return c.json(count === 1 ? codes[0] : codes, 201);
});

app.delete('/admin/invite-codes/:id', async (c) => {
  const memberId = c.get('memberId');
  const isAdmin = c.get('isAdmin');
  const codeId = c.req.param('id');

  if (!memberId) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  if (!isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await c.env.DB.prepare(
    'UPDATE invite_codes SET is_active = 0 WHERE id = ?'
  ).bind(codeId).run();

  return c.json({ success: true });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Export for Pages Functions
export const onRequest = handle(app);
