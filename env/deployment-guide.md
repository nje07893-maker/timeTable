# Teacher Timetable App - Deployment Guide

## Quick Start (Development)

### Backend + Web Companion
```bash
cd backend
npm install
cp ../env/.env.example .env   # Then edit .env
npm start
# Open http://localhost:3000
```

### Flutter Mobile App
```bash
cd frontend/flutter
flutter pub get
flutter run
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Web)
1. Push repo to GitHub
2. Import project on https://vercel.com
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install`
5. Set **Output Directory**: `public`
6. Add environment variables in Vercel dashboard

### Option 2: Railway / Render (Full Backend)
1. Connect GitHub repo
2. Set **Start Command**: `node server.js`
3. Set **Root Directory**: `backend`
4. Add env vars:
   - `PORT=3000`
   - `NODE_ENV=production`

### Option 3: Traditional VPS
```bash
# Server setup
ssh user@your-server
git clone https://github.com/yourusername/teacher-timetable.git
cd teacher-timetable/backend
npm install
cp ../env/.env.example .env
nano .env   # Configure

# Run with PM2 for persistence
npm install -g pm2
pm2 start server.js --name teacher-timetable
pm2 save
pm2 startup

# Reverse proxy (Nginx)
sudo nano /etc/nginx/sites-available/timetable
```
```nginx
server {
    listen 80;
    server_name timetable.yourschool.edu;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### Option 4: Flutter Web Build
```bash
cd frontend/flutter
flutter build web
# Deploy the build/web/ folder to any static host
```

### Option 5: Android APK
```bash
cd frontend/flutter
flutter build apk --release
# Find APK at build/app/outputs/flutter-apk/app-release.apk
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key | — |
| `SYNC_ENABLED` | Enable cloud backup | `false` |
| `DB_TYPE` | Database type (sqlite/postgres) | `sqlite` |
| `AUTH_ENABLED` | Enable multi-teacher auth | `false` |
| `JWT_SECRET` | JWT signing secret | — |

See `env/.env.example` for full list.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| GET | `/api/timetable` | All assignments |
| GET | `/api/timetable/day/:day` | By day (M,T,W,Th,F) |
| POST | `/api/timetable` | Create assignment |
| PUT | `/api/timetable/:id` | Update assignment |
| DELETE | `/api/timetable/:id` | Delete assignment |
| GET | `/api/timetable/slots/generate` | Generated daily slots |
| GET | `/api/timetable/analysis/conflicts` | Conflict detection |
| GET | `/api/timetable/analysis/hours` | Teaching hours summary |
| GET | `/api/timetable/export/json` | Export all data |
| POST | `/api/timetable/import` | Import data |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/notifications/send` | Send notification |
| GET | `/api/notifications/history` | Notification history |

---

## File Structure

```
backend/           → Node.js API server (Express + WebSocket)
frontend/web/      → JS/HTML/CSS companion (localStorage)
frontend/flutter/  → Flutter mobile app (SQLite)
env/               → Environment templates & docs
```

---

## Security

- Change `JWT_SECRET` in production
- Enable HTTPS with Let's Encrypt
- Set `AUTH_ENABLED=true` for multi-teacher
- Never commit `.env` files to git
