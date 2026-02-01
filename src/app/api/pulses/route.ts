import { NextRequest } from 'next/server';
import { getCurrentMember, requireMember } from '@/lib/auth';
import { getDb, Pulse, Member } from '@/lib/db';
import { sendPushToAll, PushPayload } from '@/lib/push';
import {
  generateId,
  getPulsesCutoff,
  jsonResponse,
  errorResponse,
  sanitizeText,
} from '@/lib/utils';

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    const db = getDb();
    const cutoff = getPulsesCutoff();

    const pulses = db.prepare(`
      SELECT p.*, m.display_name as member_name
      FROM pulses p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.created_at > ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `).all(cutoff) as (Pulse & { member_name: string | null })[];

    return jsonResponse(pulses);
  } catch {
    return errorResponse('Failed to get pulses', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember();
    const body = await request.json();
    const { note, recipe_slug, recipe_url, send_push } = body;

    const db = getDb();

    // Create bake_started pulse
    const pulseId = generateId();
    const title = `${member.display_name} started baking`;
    const sanitizedNote = note ? sanitizeText(note, 200) : null;

    db.prepare(`
      INSERT INTO pulses (id, type, member_id, title, body, recipe_slug, recipe_url, created_at)
      VALUES (?, 'bake_started', ?, ?, ?, ?, ?, datetime('now'))
    `).run(pulseId, member.id, title, sanitizedNote, recipe_slug || null, recipe_url || null);

    // Send push notification if requested
    if (send_push) {
      const payload: PushPayload = {
        v: 1,
        kind: 'pulse',
        pulse_id: pulseId,
        type: 'bake_started',
        title: title,
        body: sanitizedNote || 'A club member is baking!',
        url: `/pulses/${pulseId}`,
      };

      await sendPushToAll(payload, member.id);
    }

    const pulse = db.prepare('SELECT * FROM pulses WHERE id = ?').get(pulseId);

    return jsonResponse(pulse, 201);
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return errorResponse('Not authenticated', 401);
    }
    console.error('Create pulse error:', error);
    return errorResponse('Failed to create pulse', 500);
  }
}
