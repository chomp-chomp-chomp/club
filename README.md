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

---

## Deployment Guide (Cloudflare Dashboard)

### Prerequisites

- A Cloudflare account (free tier works)
- This repository pushed to GitHub
- Node.js 18+ installed locally

### Step 1: Generate VAPID Keys

Before setting up Cloudflare, generate your push notification keys locally:

```bash
npm install
npm run generate-vapid
```

Save the output - you'll need both keys later:
```
VAPID_PUBLIC_KEY=BLxxxxxxxxxxxxxxxx...
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxx...
```

### Step 2: Create D1 Database

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. In the left sidebar, click **Workers & Pages**
4. Click the **D1** tab
5. Click **Create database**
6. Enter name: `club-chomp-db`
7. Click **Create**
8. **Copy the Database ID** - you'll need this for `wrangler.toml`

#### Run Database Migrations

1. On your D1 database page, click the **Console** tab
2. Copy the contents of `schema.sql` from this repo
3. Paste into the console and click **Execute**
4. Copy the contents of `seed.sql`
5. Paste into the console and click **Execute**

This creates all tables and adds an initial admin user with invite code `WELCOME1`.

### Step 3: Create KV Namespace

1. In **Workers & Pages**, click the **KV** tab
2. Click **Create a namespace**
3. Enter name: `club-chomp-sessions`
4. Click **Add**
5. **Copy the Namespace ID** - you'll need this for `wrangler.toml`

### Step 4: Update Configuration

Edit `wrangler.toml` in your local repo:

```toml
[[d1_databases]]
binding = "DB"
database_name = "club-chomp-db"
database_id = "paste-your-d1-database-id-here"

[[kv_namespaces]]
binding = "SESSIONS"
id = "paste-your-kv-namespace-id-here"
```

Commit and push this change to GitHub.

### Step 5: Deploy the Worker (API)

1. In **Workers & Pages**, click **Create application**
2. Click **Create Worker**
3. Name it `club-chomp-api`
4. Click **Deploy** (creates a placeholder)
5. Go to **Settings** → **Variables**

#### Add Environment Variables

Click **Add variable** for each:

| Variable Name | Value |
|---------------|-------|
| `VAPID_PUBLIC_KEY` | Your public key from Step 1 |
| `VAPID_PRIVATE_KEY` | Your private key from Step 1 (click **Encrypt**) |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` |
| `RECIPE_API_URL` | `https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json` |
| `APP_URL` | `https://club-chomp.pages.dev` (update after Pages deploy) |

#### Bind D1 Database

1. In **Settings** → **Bindings**, click **Add**
2. Select **D1 database**
3. Variable name: `DB`
4. Select your `club-chomp-db` database
5. Click **Save**

#### Bind KV Namespace

1. Click **Add** again
2. Select **KV namespace**
3. Variable name: `SESSIONS`
4. Select your `club-chomp-sessions` namespace
5. Click **Save**

#### Deploy Worker Code

For now, you'll need the CLI for the actual Worker deployment:

```bash
npm run deploy:worker
```

Or use the **Quick Edit** in the dashboard to paste the bundled worker code.

### Step 6: Deploy Pages (Frontend)

1. In **Workers & Pages**, click **Create application**
2. Click **Pages** tab, then **Connect to Git**
3. Select your GitHub repository
4. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build:pages`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**

#### Add Environment Variables (if needed)

Go to **Settings** → **Environment variables** and add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your Worker URL (e.g., `https://club-chomp-api.your-subdomain.workers.dev`) |

### Step 7: Configure Custom Domain (Optional)

1. On your Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `clubchomp.app`)
4. Follow DNS configuration instructions
5. Update `APP_URL` in your Worker environment variables

### Step 8: Connect Pages to Worker

To route `/api/*` requests to your Worker:

1. On your Pages project, go to **Settings** → **Functions**
2. Under **Routing**, you can configure routes

Alternatively, update your Worker to serve both API and static files, or use a Cloudflare rule to proxy API requests.

---

## Local Development

```bash
# Install dependencies
npm install

# Run local D1 migrations
npm run db:migrate:local
npm run db:seed:local

# Start development servers
npm run dev
```

This runs:
- Vite dev server on `http://localhost:5173`
- Worker dev server on `http://localhost:8787`

---

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

---

## iPhone Onboarding Notes

1. User opens Safari, visits app URL
2. Welcome screen explains club concept
3. Guide to Add to Home Screen (required for push)
4. User opens from Home Screen icon
5. Enter invite code (default: `WELCOME1`)
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

---

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

---

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
