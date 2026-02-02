# Club Chomp

A calm, curated baking club app. iPhone-first PWA with push notifications.

**Built on Cloudflare:** Pages (with Functions) + D1 + KV

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

- **Cloudflare Pages** - Frontend + API (via Pages Functions)
- **Cloudflare D1** - SQLite database
- **Cloudflare KV** - Session storage
- **Hono** - API framework
- **Vite + React** - Frontend
- **Web Push** - Push notifications

---

## Deployment Guide (No CLI Required)

This guide uses **only the Cloudflare Dashboard** - no local development environment needed.

### Prerequisites

- A Cloudflare account (free tier works)
- A GitHub account
- This repository forked to your GitHub

### Step 1: Fork the Repository

1. Go to this repository on GitHub
2. Click **Fork** in the top right
3. This creates a copy in your GitHub account

### Step 2: Create D1 Database

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. In the left sidebar, click **Workers & Pages**
4. Click the **D1** tab
5. Click **Create database**
6. Enter name: `club-chomp-db`
7. Click **Create**

#### Run Database Setup

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

### Step 4: Deploy Pages (Frontend + API)

1. In **Workers & Pages**, click **Create**
2. Click **Pages** tab, then **Connect to Git**
3. Authorize Cloudflare to access your GitHub if prompted
4. Select your forked `club` repository
5. Configure build settings:
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Click **Save and Deploy**

Wait for the first deployment to complete. It will fail to work properly until you add the bindings in the next steps, but that's fine.

### Step 5: Configure Bindings

After deployment, configure the D1 and KV bindings:

1. Go to your Pages project
2. Click **Settings** → **Functions**
3. Scroll down to **D1 database bindings**
4. Click **Add binding**
   - Variable name: `DB`
   - D1 database: Select `club-chomp-db`
5. Scroll to **KV namespace bindings**
6. Click **Add binding**
   - Variable name: `SESSIONS`
   - KV namespace: Select `club-chomp-sessions`
7. Click **Save**

### Step 6: Add Environment Variables

1. Still in **Settings**, click **Environment variables**
2. Click **Add variable** for each:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `VAPID_PUBLIC_KEY` | (see below) | For push notifications |
| `VAPID_PRIVATE_KEY` | (see below) | Click **Encrypt** |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` | Your email |
| `RECIPE_API_URL` | `https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json` | Recipe source |
| `APP_URL` | Your Pages URL | e.g., `https://club-chomp.pages.dev` |

3. Click **Save**

#### Generating VAPID Keys

If you have Node.js locally, run:
```bash
npx web-push generate-vapid-keys
```

Or use an online VAPID key generator (search "VAPID key generator").

You need:
- **Public Key**: Goes in `VAPID_PUBLIC_KEY`
- **Private Key**: Goes in `VAPID_PRIVATE_KEY` (mark as encrypted)

### Step 7: Redeploy

After adding bindings and variables, trigger a new deployment:

1. Go to your Pages project **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Retry deployment**

Or push any change to your forked repo to trigger a new build.

### Step 8: Test the App

1. Visit your Pages URL (e.g., `https://club-chomp.pages.dev`)
2. You should see the welcome/onboarding screen
3. Use invite code `WELCOME1` to join
4. The first user is automatically an admin

---

## How It Works

### Pages Functions

The API runs as **Cloudflare Pages Functions**. The file `functions/api/[[route]].ts` handles all `/api/*` requests using the Hono framework.

When you push to GitHub:
1. Cloudflare Pages builds the frontend with Vite
2. Pages Functions are automatically deployed alongside
3. No separate Worker deployment needed

### Project Structure

```
club/
├── functions/           # Cloudflare Pages Functions
│   └── api/
│       └── [[route]].ts # All API routes (Hono)
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
└── package.json
```

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

---

## Local Development (Optional)

If you want to develop locally:

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/club.git
cd club

# Install dependencies
npm install

# Create .dev.vars from example
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your VAPID keys

# Start dev server
npm run dev
```

Note: Local D1 development requires Wrangler CLI. The dashboard-only approach above is simpler for deployment.

---

## License

MIT
