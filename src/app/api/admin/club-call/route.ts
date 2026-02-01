import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sendPushToAll, PushPayload } from '@/lib/push';
import { generateId, jsonResponse, errorResponse, sanitizeText } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return errorResponse('Message required', 400);
    }

    const sanitizedMessage = sanitizeText(message, 280);
    if (sanitizedMessage.length < 1) {
      return errorResponse('Message required', 400);
    }

    const db = getDb();

    // Create pulse
    const pulseId = generateId();

    db.prepare(`
      INSERT INTO pulses (id, type, member_id, title, body, created_at)
      VALUES (?, 'club_call', ?, ?, ?, datetime('now'))
    `).run(pulseId, admin.id, 'Club call', sanitizedMessage);

    // Send push to all members
    const payload: PushPayload = {
      v: 1,
      kind: 'pulse',
      pulse_id: pulseId,
      type: 'club_call',
      title: 'Club call',
      body: sanitizedMessage,
      url: `/pulses/${pulseId}`,
    };

    const pushResult = await sendPushToAll(payload);

    const pulse = db.prepare('SELECT * FROM pulses WHERE id = ?').get(pulseId);

    return jsonResponse({ pulse, push: pushResult }, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    if ((error as Error).message === 'Forbidden') {
      return errorResponse('Admin access required', 403);
    }
    console.error('Club call error:', error);
    return errorResponse('Failed to send club call', 500);
  }
}
