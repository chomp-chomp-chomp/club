# Club Chomp

A calm, curated baking club app. iPhone-first PWA with push notifications.

## Philosophy

Club Chomp is **ambient presence**, not conversation.

Members feel:
- "Someone is baking."
- "A recipe dropped."
- "Club call this weekend."

No scrolling addiction. No engagement bait. No gamification.

## Features

- **Pulses**: Last 72 hours of club activity
- **Recipes**: Curated shelf managed by admin
- **Bulletin**: Ephemeral chalkboard (posts expire in 7 days)
- **Push Notifications**: 3 types only (bake_started, recipe_dropped, club_call)

## Tech Stack

- **Next.js 14** - React framework with App Router
- **SQLite** - Database (via better-sqlite3)
- **Web Push** - Push notifications
- **PWA** - Installable on iOS/Android

## Quick Start

```bash
# Install dependencies
npm install

# Generate VAPID keys for push notifications
npm run generate-vapid

# Copy and configure environment
cp .env.example .env
# Add VAPID keys to .env

# Initialize database
npm run db:migrate

# Seed initial data (creates admin + invite code)
npm run db:seed

# Start development server
npm run dev
```

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `members` | Club members with display name, admin flag |
| `invite_codes` | Join codes with usage limits |
| `push_subscriptions` | Web Push subscriptions per member |
| `notification_prefs` | Per-member notification toggles |
| `pulses` | Activity feed (72h retention in UI) |
| `bulletins` | Ephemeral posts (7-day expiry) |
| `bulletin_replies` | Replies to bulletins (max 7) |
| `recipes_cache` | Cached recipes from external API |
| `club_shelf_items` | Curated recipe shelf |
| `collections` | Recipe collections |
| `sessions` | Member authentication sessions |

## API Routes

### Authentication
- `POST /api/auth/join` - Join with invite code
- `GET /api/auth/me` - Get current member
- `POST /api/auth/logout` - Log out

### Pulses
- `GET /api/pulses` - List recent pulses
- `POST /api/pulses` - Create bake_started pulse

### Bulletins
- `GET /api/bulletins` - List active bulletins
- `POST /api/bulletins` - Create bulletin
- `GET /api/bulletins/:id` - Get bulletin with replies
- `DELETE /api/bulletins/:id` - Remove bulletin (admin)
- `POST /api/bulletins/:id/replies` - Add reply

### Recipes
- `GET /api/recipes/shelf` - Get curated shelf
- `POST /api/recipes/shelf` - Add to shelf (admin)
- `PATCH /api/recipes/shelf/:id` - Update shelf item (admin)
- `DELETE /api/recipes/shelf/:id` - Remove from shelf (admin)
- `GET /api/recipes/cache` - Search cached recipes (admin)
- `POST /api/recipes/cache` - Refresh cache from API (admin)

### Notifications
- `GET /api/notifications/subscribe` - Get VAPID public key
- `POST /api/notifications/subscribe` - Register push subscription
- `DELETE /api/notifications/subscribe` - Unsubscribe
- `GET /api/notifications/prefs` - Get notification prefs
- `PATCH /api/notifications/prefs` - Update notification prefs

### Members
- `GET /api/members` - List all members (admin)
- `PATCH /api/members` - Update own profile
- `PATCH /api/members/:id` - Update member (admin)

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection (admin)
- `PATCH /api/collections/:id` - Update collection (admin)
- `DELETE /api/collections/:id` - Delete collection (admin)

### Admin
- `POST /api/admin/drop-recipe` - Drop a recipe (creates pulse + push)
- `POST /api/admin/club-call` - Send club call (creates pulse + push)
- `GET /api/admin/invite-codes` - List invite codes
- `POST /api/admin/invite-codes` - Generate invite code
- `DELETE /api/admin/invite-codes/:id` - Revoke invite code

## Push Setup

1. Generate VAPID keys:
   ```bash
   npm run generate-vapid
   ```

2. Add keys to `.env`:
   ```
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_SUBJECT=mailto:admin@yoursite.com
   ```

3. Push notifications require HTTPS in production.

## Deployment

### Environment Variables

```env
DATABASE_PATH=./data/club.db
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@clubchomp.app
RECIPE_API_URL=https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json
APP_URL=https://clubchomp.app
```

### Production Build

```bash
npm run build
npm start
```

### Platform Notes

**Vercel**: Works out of the box. Use Vercel KV or external SQLite (Turso).

**Fly.io**: Good for persistent SQLite. Use volumes for database.

**Railway/Render**: Works with persistent storage for SQLite.

## iPhone Onboarding Notes

1. User opens Safari, visits app URL
2. Welcome screen explains club concept
3. Guide to Add to Home Screen (required for push)
4. User opens from Home Screen icon
5. Enter invite code
6. Request notification permission (button-triggered)
7. Show sample pulses if feed is empty

### Why Add to Home Screen?

- Required for push notifications on iOS
- Full-screen experience (no Safari UI)
- Faster loading from cache
- Feels like a native app

### Troubleshooting iOS Push

- Must be opened from Home Screen, not Safari
- iOS 16.4+ required for Web Push
- Check Settings → Notifications → Chomp Club
- Try "Re-enable notifications" in Settings

## Admin Access

Admin panel is hidden by default.

To access: **Settings → Long press version number 5 times → Admin**

### Admin Capabilities

- Drop recipes (from catalog or manual)
- Send club calls
- Curate recipe shelf
- Manage members (enable/disable)
- Moderate bulletins
- Generate/revoke invite codes

## Navigation Structure

```
Bottom Tab Bar:
├── Home (Pulses)
├── Recipes (Shelf)
├── Bulletin (Board)
└── Settings
    └── [long press version] → Admin
```

## Quality Guardrails

- No likes
- No reactions
- No badges
- No streaks
- No unread counters
- No algorithms
- Chronological only
- Sparse UI
- Minimal animations
- No addictive loops

## Documentation

See `/docs` folder for detailed guides:
- [Admin Routes](docs/ADMIN_ROUTES.md)
- [iPhone Onboarding](docs/IPHONE_ONBOARDING.md)
- [Push Setup](docs/PUSH_SETUP.md)
- [Deployment](docs/DEPLOY.md)

## License

MIT
