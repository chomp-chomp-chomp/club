import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid(16);
}

export function generateInviteCode(): string {
  return nanoid(8).toUpperCase();
}

// Get pulses from last 72 hours
export function getPulsesCutoff(): string {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 72);
  return cutoff.toISOString();
}

// Get bulletin expiry (7 days from now)
export function getBulletinExpiry(): string {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry.toISOString();
}

// Format relative time
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}

// Format expiry countdown
export function formatExpiry(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays >= 1) return `${diffDays}d left`;
  if (diffHours >= 1) return `${diffHours}h left`;

  const diffMins = Math.floor(diffMs / 60000);
  return `${diffMins}m left`;
}

// Sanitize user input
export function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

// API response helpers
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
