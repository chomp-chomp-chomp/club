import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';

import { authRoutes } from './routes/auth';
import { pulsesRoutes } from './routes/pulses';
import { bulletinsRoutes } from './routes/bulletins';
import { recipesRoutes } from './routes/recipes';
import { notificationsRoutes } from './routes/notifications';
import { membersRoutes } from './routes/members';
import { collectionsRoutes } from './routes/collections';
import { adminRoutes } from './routes/admin';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  RECIPE_API_URL: string;
  APP_URL: string;
}

export interface Variables {
  memberId: string | null;
  isAdmin: boolean;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for development
app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8787'],
  credentials: true,
}));

// Auth middleware
app.use('/api/*', async (c, next) => {
  const sessionId = getCookie(c, 'session');

  if (sessionId) {
    const session = await c.env.SESSIONS.get(sessionId, 'json') as { memberId: string; isAdmin: boolean } | null;
    if (session) {
      c.set('memberId', session.memberId);
      c.set('isAdmin', session.isAdmin);
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

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/pulses', pulsesRoutes);
app.route('/api/bulletins', bulletinsRoutes);
app.route('/api/recipes', recipesRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/members', membersRoutes);
app.route('/api/collections', collectionsRoutes);
app.route('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;

// Helper exports for routes
export { getCookie, setCookie, deleteCookie };
