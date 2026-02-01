import webpush from 'web-push';
import { getDb, PushSubscription, NotificationPrefs } from './db';

// Configure web-push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@clubchomp.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export type PushType = 'bake_started' | 'recipe_dropped' | 'club_call';

export interface PushPayload {
  v: number;
  kind: 'pulse';
  pulse_id: string;
  type: PushType;
  title: string;
  body: string;
  url: string;
}

export async function sendPushToMember(
  memberId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const db = getDb();

  // Get member's notification preferences
  const prefs = db.prepare(`
    SELECT * FROM notification_prefs WHERE member_id = ?
  `).get(memberId) as NotificationPrefs | undefined;

  // Check if member wants this notification type
  if (prefs) {
    const wantsNotification = prefs[payload.type as keyof NotificationPrefs];
    if (!wantsNotification) {
      return { sent: 0, failed: 0 };
    }
  }

  // Get active subscriptions
  const subscriptions = db.prepare(`
    SELECT * FROM push_subscriptions
    WHERE member_id = ? AND is_active = 1
  `).all(memberId) as PushSubscription[];

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // Handle gone subscriptions (404, 410)
      if (statusCode === 404 || statusCode === 410) {
        db.prepare(`
          UPDATE push_subscriptions SET is_active = 0 WHERE id = ?
        `).run(sub.id);
      }
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendPushToAll(
  payload: PushPayload,
  excludeMemberId?: string
): Promise<{ sent: number; failed: number }> {
  const db = getDb();

  // Get all members who want this notification type
  const prefColumn = payload.type;
  const members = db.prepare(`
    SELECT m.id FROM members m
    LEFT JOIN notification_prefs np ON m.id = np.member_id
    WHERE m.is_disabled = 0
    AND (np.${prefColumn} = 1 OR np.${prefColumn} IS NULL)
    ${excludeMemberId ? 'AND m.id != ?' : ''}
  `).all(excludeMemberId ? [excludeMemberId] : []) as { id: string }[];

  let totalSent = 0;
  let totalFailed = 0;

  for (const member of members) {
    const result = await sendPushToMember(member.id, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { sent: totalSent, failed: totalFailed };
}

export function getVapidPublicKey(): string {
  return vapidPublicKey || '';
}
