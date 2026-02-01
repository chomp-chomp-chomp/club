# iPhone Onboarding Notes

## Why iPhone-First?

Club Chomp is designed as an iPhone-first PWA because:
- Primary users are iPhone owners
- Push notifications require Add to Home Screen on iOS
- PWA provides native-like experience without App Store

## Prerequisites

- iOS 16.4 or later (required for Web Push)
- Safari browser
- Stable internet connection

## Onboarding Flow

### 1. Welcome Screen
User lands on the welcome page explaining:
- What Club Chomp is
- Ambient presence concept
- No social media patterns

**CTA**: "Get Started"

### 2. Add to Home Screen
If app is not running in standalone mode:

Instructions displayed:
1. Tap the Share button in Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm
4. Open the app from your Home Screen

**Why this matters**:
- Required for push notifications
- Full-screen experience
- Faster loading
- Better UX

User can skip but will see a reminder.

### 3. Enter Invite Code
Form fields:
- Invite code (8 characters, auto-uppercase)
- Display name (your name in the club)

Validation:
- Code must be valid and not expired
- Code must have uses remaining
- Name is required (1-50 characters)

### 4. Notification Permission
After successful join:

Explains benefits:
- New recipe notifications
- Club call announcements
- Bake alerts (optional)

**Button**: "Enable Notifications"

This triggers the browser permission prompt.

User can skip - notifications can be enabled later in Settings.

### 5. Complete
Confirmation screen:
- Welcome message
- Brief instructions
- Enter the club button

## Technical Details

### Standalone Detection

```javascript
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
```

### Push Registration

After permission granted:
1. Get VAPID public key from server
2. Register service worker
3. Subscribe to push manager
4. Send subscription to server

### Session Management

- Session cookie set on join
- 30-day expiry
- Automatically renewed on activity

## Troubleshooting

### "Not receiving notifications"

1. **Check standalone mode**: App must be opened from Home Screen icon
2. **Check iOS version**: Requires iOS 16.4+
3. **Check system settings**: Settings → Notifications → Chomp Club
4. **Re-register**: Settings → "Re-enable notifications"

### "Add to Home Screen missing"

- Only available in Safari (not Chrome, Firefox)
- Must be HTTPS
- Some iOS restrictions on certain domains

### "Invite code invalid"

- Check capitalization (auto-converts)
- Code may be expired
- Code may have reached max uses
- Code may be revoked

### "App not loading"

- Check internet connection
- Try closing and reopening
- Clear Safari cache if needed
- Check if site is down

## Best Practices

### For Club Admins

1. Generate invite codes with reasonable limits
2. Set expiry for time-sensitive invites
3. Monitor member list for issues
4. Keep recipe catalog fresh

### For Members

1. Add to Home Screen immediately
2. Enable notifications for full experience
3. Check Settings if notifications stop working
4. Report issues to club admin

## iOS-Specific Considerations

### PWA Limitations

- No background sync
- No badge counts
- Limited offline functionality
- Push requires user action to enable

### Performance

- Service worker caches app shell
- API calls use network-first strategy
- Fallback to cache on network failure

### UI Adaptations

- Safe area insets for notch
- Viewport fit cover
- Touch-friendly tap targets
- No hover states (touch device)
