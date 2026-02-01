import { cookies } from 'next/headers';
import { getDb, Member, Session } from './db';
import { nanoid } from 'nanoid';

const SESSION_COOKIE = 'club_session';
const SESSION_DURATION_DAYS = 30;

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const db = getDb();
  const session = db.prepare(`
    SELECT * FROM sessions
    WHERE id = ? AND expires_at > datetime('now')
  `).get(sessionId) as Session | undefined;

  return session || null;
}

export async function getCurrentMember(): Promise<Member | null> {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();

  // Update last seen
  db.prepare(`
    UPDATE members SET last_seen_at = datetime('now')
    WHERE id = ?
  `).run(session.member_id);

  const member = db.prepare(`
    SELECT * FROM members WHERE id = ? AND is_disabled = 0
  `).get(session.member_id) as Member | undefined;

  return member || null;
}

export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error('Unauthorized');
  }
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (!member.is_admin) {
    throw new Error('Forbidden');
  }
  return member;
}

export function createSession(memberId: string): string {
  const db = getDb();
  const sessionId = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  db.prepare(`
    INSERT INTO sessions (id, member_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, memberId, expiresAt.toISOString());

  return sessionId;
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
}

export function cleanExpiredSessions(): void {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}
