import { NextRequest } from 'next/server';
import { requireMember } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getVapidPublicKey } from '@/lib/push';
import { generateId, jsonResponse, errorResponse } from '@/lib/utils';

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return jsonResponse({ vapid_public_key: publicKey });
  } catch {
    return errorResponse('Failed to get VAPID key', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return errorResponse('Invalid subscription data', 400);
    }

    const db = getDb();

    // Check if subscription already exists
    const existing = db.prepare(`
      SELECT id FROM push_subscriptions WHERE endpoint = ?
    `).get(endpoint) as { id: string } | undefined;

    if (existing) {
      // Update existing subscription
      db.prepare(`
        UPDATE push_subscriptions
        SET member_id = ?, p256dh = ?, auth = ?, is_active = 1
        WHERE id = ?
      `).run(member.id, keys.p256dh, keys.auth, existing.id);

      return jsonResponse({ success: true, id: existing.id });
    }

    // Create new subscription
    const subId = generateId();
    db.prepare(`
      INSERT INTO push_subscriptions (id, member_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
    `).run(subId, member.id, endpoint, keys.p256dh, keys.auth);

    return jsonResponse({ success: true, id: subId }, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    console.error('Subscribe error:', error);
    return errorResponse('Failed to subscribe', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return errorResponse('Endpoint required', 400);
    }

    const db = getDb();
    db.prepare(`
      UPDATE push_subscriptions SET is_active = 0
      WHERE member_id = ? AND endpoint = ?
    `).run(member.id, endpoint);

    return jsonResponse({ success: true });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    return errorResponse('Failed to unsubscribe', 500);
  }
}
