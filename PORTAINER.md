# Ubuntu and Portainer Deployment

This setup runs the full application as two containers:

- `frontend`: React build served by Nginx on port `8080` by default
- `backend`: Node.js API with SQLite storage on an internal Docker network

The frontend container proxies `/api`, `/ws`, and `/health` to the backend, so users only need one URL.

## What still works in Docker

- SQLite: persisted through a Docker volume
- iCloud CalDAV: outbound HTTPS from the backend container
- Google Tasks and Google Calendar: outbound HTTPS plus OAuth callback via `/api/google/callback`
- Loxone: outbound LAN access from the backend container to your Miniserver
- Recipes and weather: outbound internet access to public APIs

## Files added for this deployment

- `docker-compose.portainer.yml`
- `.env.portainer.example`
- `family-planner/Dockerfile`
- `family-planner/nginx/default.conf`
- `family-planner-backend/Dockerfile`

## Recommended URL shape

Use a single public URL, for example:

- `http://192.168.1.50:8080`

That single URL serves the frontend and also handles:

- `http://192.168.1.50:8080/api/...`
- `ws://192.168.1.50:8080/ws`
- `http://192.168.1.50:8080/api/google/callback`

This avoids CORS problems and makes the Google OAuth callback stable.

## 1. Prepare the stack files

On the Ubuntu host or in your Portainer Git-based stack source:

1. Copy `.env.portainer.example` to `.env`
2. Fill in your real values

Minimum values to set:

- `CORS_ORIGIN=http://YOUR_UBUNTU_IP:8080`
- `GOOGLE_REDIRECT_URI=http://YOUR_UBUNTU_IP:8080/api/google/callback`
- `CALDAV_SERVER_URL=https://caldav.icloud.com`
- `CALDAV_USERNAME=your-apple-id`
- `CALDAV_PASSWORD=your-app-specific-password`

Optional values:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `LOXONE_SERVER_URL`
- `LOXONE_USERNAME`
- `LOXONE_PASSWORD`

## 2. Deploy in Portainer

### Option A: Portainer stack from Git

1. Push this repository with the new files to Git
2. In Portainer, create a new stack
3. Choose the repository as the source
4. Set the compose path to `docker-compose.portainer.yml`
5. Add the environment variables from `.env.portainer.example` in the Portainer UI
6. Deploy the stack

### Option B: Docker Compose on the Ubuntu host

```bash
cp .env.portainer.example .env
docker compose -f docker-compose.portainer.yml up -d --build
```

## 3. Access the app

- Frontend: `http://YOUR_UBUNTU_IP:8080`
- Health check: `http://YOUR_UBUNTU_IP:8080/health`
- Backend status through proxy: `http://YOUR_UBUNTU_IP:8080/api/status`

## 4. Google OAuth notes

If `family-planner-backend/data/google-tokens.json` already contains valid tokens, mount persistence and they should continue to work.

If you need to authorize again:

1. Set `GOOGLE_REDIRECT_URI` to `http://YOUR_UBUNTU_IP:8080/api/google/callback`
2. Add that exact URI to your Google OAuth client configuration
3. Open the app settings page and start the Google authorization flow

The backend stores Google tokens inside `/app/data/google-tokens.json`, which is persisted by the Docker volume.

## 5. Loxone notes

Loxone will work only if the backend container can reach the Miniserver over your LAN.

Check:

- the Ubuntu host can reach the Loxone IP
- Docker bridge networking is allowed on your LAN
- the Miniserver certificate or self-signed TLS still accepts the connection

This app already disables TLS verification for the Loxone client, so self-signed certificates are acceptable.

## 6. Persistent data

The stack stores application state in the named volume:

- `family_planner_data`

That volume contains:

- the SQLite database
- cached calendar data
- Google OAuth tokens

Back up that volume if you want to preserve the app state.

## 7. What you do not need anymore

You do not need:

- PM2
- Windows firewall rules
- separate frontend-to-backend hardcoded IP configuration

## Troubleshooting

### Frontend loads but API calls fail

Check:

- the `backend` container is healthy
- the frontend container can resolve `backend`
- you are opening the frontend on the same URL you used for `CORS_ORIGIN`

### Google authorization redirects to localhost

Your `GOOGLE_REDIRECT_URI` is still set to the old default. Change it to your Ubuntu host URL and redeploy.

### Loxone is disconnected

Check:

- `LOXONE_SERVER_URL`
- container LAN reachability
- credentials

### Data disappears after redeploy

You are likely missing the persistent Docker volume or replaced it.