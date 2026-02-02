import type { Env } from './index';
import { base64UrlDecode, base64UrlEncode } from './utils';

export interface PushPayload {
  v: number;
  kind: string;
  pulse_id: string;
  type: string;
  title: string;
  body: string;
  url: string;
}

interface PushSubscription {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send push to all members who have the preference enabled
export async function sendPushToMembers(
  env: Env,
  pushType: 'bake_started' | 'recipe_dropped' | 'club_call',
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Get subscriptions for members with this preference enabled
  const subs = await env.DB.prepare(`
    SELECT ps.*
    FROM push_subscriptions ps
    JOIN notification_prefs np ON np.member_id = ps.member_id
    JOIN members m ON m.id = ps.member_id
    WHERE np.${pushType} = 1 AND m.is_active = 1
  `).all();

  const subscriptions = subs.results as unknown as PushSubscription[];

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      const success = await sendPush(env, sub, payload);
      if (success) {
        sent++;
      } else {
        failed++;
        // Remove stale subscription
        await env.DB.prepare(
          'DELETE FROM push_subscriptions WHERE id = ?'
        ).bind(sub.id).run();
      }
    } catch (error) {
      console.error('Push error:', error);
      failed++;
    }
  }

  return { sent, failed };
}

// Send a single push notification using Web Push protocol
async function sendPush(
  env: Env,
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  try {
    const vapidKeys = {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
      subject: env.VAPID_SUBJECT,
    };

    // Create JWT for VAPID
    const jwt = await createVapidJwt(subscription.endpoint, vapidKeys);

    // Encrypt the payload
    const encrypted = await encryptPayload(
      JSON.stringify(payload),
      subscription.p256dh,
      subscription.auth
    );

    // Send the push
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
      },
      body: encrypted,
    });

    if (response.status === 201) {
      return true;
    }

    // 404 or 410 means subscription is gone
    if (response.status === 404 || response.status === 410) {
      return false;
    }

    console.error(`Push failed: ${response.status} ${await response.text()}`);
    return false;
  } catch (error) {
    console.error('Push error:', error);
    return false;
  }
}

// Create VAPID JWT
async function createVapidJwt(
  endpoint: string,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: audience,
    exp: now + 60 * 60 * 12, // 12 hours
    sub: vapidKeys.subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64UrlDecode(vapidKeys.privateKey);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(signature);
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<ArrayBuffer> {
  // Generate ephemeral key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKeyBytes = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);

  // Derive encryption key using HKDF
  const authSecretBytes = base64UrlDecode(authSecret);

  // Create info for HKDF
  const encoder = new TextEncoder();

  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prkKey = await crypto.subtle.importKey(
    'raw',
    authSecretBytes,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // IKM = HKDF(auth, ecdh, "WebPush: info\0" || client_public || server_public)
  const keyInfo = new Uint8Array([
    ...encoder.encode('WebPush: info\0'),
    ...new Uint8Array(subscriberPublicKeyBytes),
    ...new Uint8Array(localPublicKeyBytes),
  ]);

  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: new Uint8Array(sharedSecret),
      info: keyInfo,
      hash: 'SHA-256',
    },
    prkKey,
    256
  );

  // Content encryption key
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);

  const cek = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: new Uint8Array(0),
      info: cekInfo,
      hash: 'SHA-256',
    },
    ikmKey,
    128
  );

  // Nonce
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      salt: new Uint8Array(0),
      info: nonceInfo,
      hash: 'SHA-256',
    },
    ikmKey,
    96
  );

  // Encrypt with AES-GCM
  const contentKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

  const paddedPayload = new Uint8Array([
    ...encoder.encode(payload),
    2, // Delimiter
  ]);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce), tagLength: 128 },
    contentKey,
    paddedPayload
  );

  // Build the encrypted content coding header
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const recordSize = 4096;
  const idLen = 65; // Uncompressed public key length

  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = idLen;
  header.set(new Uint8Array(localPublicKeyBytes), 21);

  // Combine header and encrypted data
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);

  return result.buffer;
}
