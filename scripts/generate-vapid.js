#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push
 * Run with: npm run generate-vapid
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Generated VAPID Keys:');
console.log('');
console.log('Add these to your .env file:');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');
console.log('Public key (for client-side):');
console.log(vapidKeys.publicKey);
