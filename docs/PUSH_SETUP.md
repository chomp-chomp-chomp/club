# Push Notification Setup

## Overview

Club Chomp uses Web Push (RFC 8030) for notifications. This requires:
- HTTPS in production
- VAPID keys for authentication
- Service Worker for receiving pushes

## VAPID Keys

VAPID (Voluntary Application Server Identification) keys authenticate your server to push services.

### Generate Keys

```bash
npm run generate-vapid
```

Output:
```
VAPID_PUBLIC_KEY=BNxU...
VAPID_PRIVATE_KEY=abc...
```

### Configure Environment

Add to `.env`:
```env
VAPID_PUBLIC_KEY=BNxU...
VAPID_PRIVATE_KEY=abc...
VAPID_SUBJECT=mailto:admin@clubchomp.app
```

The subject should be a mailto: or https: URL identifying your app.

## Push Types

Only 3 push types exist:

| Type | Default | Sent When |
|------|---------|-----------|
| `recipe_dropped` | ON | Admin drops a recipe |
| `club_call` | ON | Admin sends club call |
| `bake_started` | OFF | Member starts baking (optional) |

## Push Payload Format

```json
{
  "v": 1,
  "kind": "pulse",
  "pulse_id": "abc123",
  "type": "recipe_dropped",
  "title": "New recipe dropped",
  "body": "Principessa Nascosta",
  "url": "/pulses/abc123"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `v` | number | Payload version (always 1) |
| `kind` | string | Always "pulse" |
| `pulse_id` | string | ID of the pulse |
| `type` | string | bake_started, recipe_dropped, club_call |
| `title` | string | Notification title |
| `body` | string | Notification body |
| `url` | string | Deep link when clicked |

## Service Worker

Located at `/public/sw.js`.

### Push Event Handler

```javascript
self.addEventListener('push', (event) => {
  const payload = event.data.json();

  if (payload.v !== 1 || payload.kind !== 'pulse') {
    return; // Invalid payload
  }

  self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icons/icon-192.png',
    tag: payload.pulse_id,
    data: { url: payload.url }
  });
});
```

### Click Handler

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Open or focus app window
  clients.openWindow(event.notification.data.url);
});
```

## Subscription Flow

### 1. Get VAPID Key

```javascript
const { vapid_public_key } = await fetch('/api/notifications/subscribe').then(r => r.json());
```

### 2. Request Permission

```javascript
const permission = await Notification.requestPermission();
if (permission !== 'granted') {
  // Handle denial
}
```

### 3. Subscribe

```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(vapid_public_key)
});
```

### 4. Register with Server

```javascript
await fetch('/api/notifications/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(subscription.toJSON())
});
```

## Server-Side Sending

### Send to Member

```typescript
import { sendPushToMember } from '@/lib/push';

await sendPushToMember(memberId, {
  v: 1,
  kind: 'pulse',
  pulse_id: 'abc123',
  type: 'recipe_dropped',
  title: 'New recipe dropped',
  body: 'Chocolate Cake',
  url: '/pulses/abc123'
});
```

### Send to All

```typescript
import { sendPushToAll } from '@/lib/push';

await sendPushToAll(payload, excludeMemberId);
```

The second argument optionally excludes a member (useful for not notifying the sender).

## Error Handling

### 404/410 Errors

When push fails with 404 or 410:
- Subscription is marked as inactive
- Future sends skip this subscription
- User needs to re-subscribe

### Rate Limiting

- Push services may rate limit
- Avoid sending too frequently
- Group notifications when possible

## Preference Checking

Before sending, the server checks member preferences:

```typescript
const prefs = db.prepare(`
  SELECT * FROM notification_prefs WHERE member_id = ?
`).get(memberId);

if (!prefs[pushType]) {
  return; // Member opted out
}
```

## Debugging

### Check Subscription Status

In browser console:
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
  });
});
```

### Verify Service Worker

```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

### Test Push (Admin)

Use the Club Call feature to send a test push:
1. Go to Admin → Send Club Call
2. Enter test message
3. Verify notification appears

## Production Checklist

- [ ] HTTPS enabled
- [ ] VAPID keys generated and configured
- [ ] Service worker registered
- [ ] manifest.json includes icons
- [ ] Error handling for failed pushes
- [ ] Subscription cleanup for gone endpoints
- [ ] Rate limiting in place
