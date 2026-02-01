import { clearSession } from '@/lib/auth';
import { jsonResponse, errorResponse } from '@/lib/utils';

export async function POST() {
  try {
    await clearSession();
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Failed to logout', 500);
  }
}
