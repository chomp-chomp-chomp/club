# Deployment Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- HTTPS certificate (required for push notifications)

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_PATH=./data/club.db

# VAPID Keys (generate with: npm run generate-vapid)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@yoursite.com

# External API
RECIPE_API_URL=https://chomp-chomp-chomp.github.io/chomp/api/recipes/index.json

# App URL (for push deep links)
APP_URL=https://yoursite.com
```

## Build

```bash
# Install dependencies
npm install

# Initialize database
npm run db:migrate
npm run db:seed

# Build for production
npm run build
```

## Start

```bash
npm start
```

Default port is 3000. Set `PORT` environment variable to change.

## Platform-Specific Guides

### Vercel

1. Connect repository to Vercel
2. Add environment variables in dashboard
3. For SQLite, use Turso or similar edge database
4. Deploy

```json
// vercel.json (if needed)
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**Note**: Vercel's serverless functions don't persist filesystem. Use external SQLite (Turso, PlanetScale).

### Fly.io

1. Install flyctl CLI
2. Create app: `fly launch`
3. Create volume for SQLite: `fly volumes create data --size 1`
4. Configure fly.toml:

```toml
[env]
  DATABASE_PATH = "/data/club.db"

[mounts]
  source = "data"
  destination = "/data"
```

5. Set secrets: `fly secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`
6. Deploy: `fly deploy`

### Railway

1. Create new project from GitHub
2. Add environment variables
3. Configure start command: `npm start`
4. Deploy

**Note**: Use Railway's persistent volumes for SQLite.

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_PATH=/app/data/club.db
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - VAPID_SUBJECT=${VAPID_SUBJECT}
```

### VPS (Ubuntu/Debian)

1. Install Node.js 18:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Clone and setup:
```bash
git clone <repo> /var/www/club
cd /var/www/club
npm install
npm run db:migrate
npm run db:seed
npm run build
```

3. Create systemd service:
```ini
# /etc/systemd/system/club.service
[Unit]
Description=Club Chomp
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/club
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/club/.env

[Install]
WantedBy=multi-user.target
```

4. Start service:
```bash
sudo systemctl enable club
sudo systemctl start club
```

5. Setup nginx reverse proxy:
```nginx
server {
    listen 443 ssl http2;
    server_name clubchomp.app;

    ssl_certificate /etc/letsencrypt/live/clubchomp.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clubchomp.app/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL Certificate

Push notifications require HTTPS.

### Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d clubchomp.app
```

### Cloudflare

Use Cloudflare proxy with Full (strict) SSL mode.

## Post-Deploy Checklist

- [ ] HTTPS working
- [ ] Environment variables set
- [ ] Database initialized
- [ ] Admin user created (via seed)
- [ ] Push notifications working
- [ ] PWA installable
- [ ] Service worker active

## Monitoring

### Health Check

GET `/api/auth/me` returns 401 for unauthenticated requests (healthy).

### Logs

Check application logs for errors:
- Push failures (404/410 indicate stale subscriptions)
- Database errors
- API errors

### Database Backup

```bash
# Backup SQLite database
sqlite3 data/club.db ".backup backup.db"

# Or simply copy the file (while stopped or with WAL mode)
cp data/club.db backup.db
```

## Scaling Considerations

### Single Instance

SQLite works well for single instance deployments up to ~100 concurrent users.

### Multiple Instances

For horizontal scaling:
1. Use PostgreSQL instead of SQLite
2. Update database connection code
3. Use external session store (Redis)

### CDN

Use CDN for static assets:
- `/icons/*`
- `/_next/static/*`
- `/manifest.json`
