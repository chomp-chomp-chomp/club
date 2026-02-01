# Club Chomp

A calm, curated baking club app. iPhone-first PWA with push notifications.

**Built on Cloudflare:** Pages + Workers + D1 + KV

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

- **Cloudflare Pages** - Static frontend hosting
- **Cloudflare Workers** - API (Hono framework)
- **Cloudflare D1** - SQLite database
- **Cloudflare KV** - Session storage
- **Vite + React** - Frontend
- **Web Push** - Push notifications

## Quick Start

```bash
# Install dependencies
npm install

# Generate VAPID keys for push notifications
npm run generate-vapid

# Create Cloudflare resources
wrangler d1 create club-chomp-db
wrangler kv:namespace create SESSIONS

# Update wrangler.toml with your database_id and KV namespace_id

# Set secrets
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT

# Run migrations
npm run db:migrate:local

# Seed initial data
npm run db:seed:local

# Start development
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

## Deployment

### 1. Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create club-chomp-db

# Create KV namespace for sessions
wrangler kv:namespace create SESSIONS
```

### 2. Update Configuration

Edit `wrangler.toml` with your database ID and KV namespace ID.

### 3. Set Secrets

```bash
# Generate VAPID keys
npm run generate-vapid

# Set secrets
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT  # e.g., mailto:admin@clubchomp.app
```

### 4. Run Migrations

```bash
# Production
npm run db:migrate

# Seed data
npm run db:seed
```

### 5. Deploy

```bash
# Deploy Worker API
npm run deploy:worker

# Deploy Pages frontend
npm run deploy
```

### Custom Domain

1. Add custom domain in Cloudflare Pages dashboard
2. Update `APP_URL` in wrangler.toml
3. Redeploy

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

### Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard |
| `/admin/drop-recipe` | Drop recipes (catalog or manual) |
| `/admin/club-call` | Send announcements |
| `/admin/shelf` | Curate recipe shelf |
| `/admin/members` | Manage members |
| `/admin/bulletins` | Moderate board |
| `/admin/invite-codes` | Generate/revoke codes |

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

## Project Structure

```
club/
├── worker/              # Cloudflare Worker API
│   ├── index.ts         # Main entry point
│   ├── push.ts          # Web Push implementation
│   ├── utils.ts         # Utility functions
│   └── routes/          # API routes
├── src/                 # Frontend (React + Vite)
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # Entry point
│   ├── context/         # React contexts
│   ├── components/      # Shared components
│   ├── pages/           # Page components
│   ├── lib/             # Utilities
│   └── styles/          # CSS
├── public/              # Static assets
│   ├── sw.js            # Service worker
│   ├── manifest.json    # PWA manifest
│   └── icons/           # App icons
├── schema.sql           # D1 database schema
├── seed.sql             # Initial data
├── wrangler.toml        # Cloudflare configuration
├── vite.config.ts       # Vite configuration
└── package.json
```

## License

MIT
