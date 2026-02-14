# Roast Backend Context (VPS + API + App Integration)

This file is the backend runbook/context for the Roast app based on the current implementation.

## 1. Current Architecture

- Backend runtime: Node.js (`scripts/vps-roast-api.js`) on VPS.
- Model provider: Gemini (`gemini-2.5-flash` by default).
- Public API host: `https://api.brainnotes.app`.
- Reverse proxy / TLS: Caddy (not nginx).
- Mobile client: Expo app -> `services/roast-api.ts` via React Query.
- Local persistence on device: Expo SQLite + Drizzle (`db/schema.ts`, `services/roast-db.ts`).

Request flow:

1. User generates roast in `app/(add)/index.tsx`.
2. App sends POST to `/v1/roasts/generate`.
3. VPS script validates/authenticates request and calls Gemini.
4. API returns `roasts[]` (+ legacy `roast`).
5. App saves generation in local SQLite (`roasts` + `roast_variants`).
6. App navigates to item screen (`/(item)/[id]`) with `router.replace`.

---

## 2. VPS Runtime Details

- VPS IP used: `178.156.213.158`
- User: `root`
- Working directory: `/root/scripts`
- Main backend script: `/root/scripts/vps-roast-api.js`
- Environment file: `/root/scripts/roast.env`
- Service manager: `systemd` (`roast-api.service`)

### Manual run (foreground)

```bash
cd /root/scripts
set -a; source ./roast.env; set +a
node vps-roast-api.js
```

If you press `Ctrl+C`, server stops immediately (health checks fail until restarted).

---

## 3. Backend API: Endpoints and Contract

Base path (server side):

- `GET /healthz`
- `POST /v1/roasts/generate`

### Health endpoint

`GET /healthz` returns:

```json
{
  "ok": true,
  "service": "roast-api",
  "model": "gemini-2.5-flash",
  "now": "2026-02-13T16:26:26.754Z",
  "requestId": "..."
}
```

### Generate endpoint

`POST /v1/roasts/generate`

Accepted payload:

- Text input:
```json
{
  "inputType": "text",
  "text": "string",
  "audience": "Bestie|Sibling|Ex|Coworker|Self|Stranger",
  "burnLevel": 0,
  "count": 1
}
```

- Image input (current app path):
```json
{
  "inputType": "image",
  "imageBase64": "...",
  "imageMimeType": "image/jpeg",
  "audience": "Bestie",
  "burnLevel": 40,
  "count": 3
}
```

- Image URL (also supported by backend):
```json
{
  "inputType": "image",
  "imageUrl": "https://...",
  "audience": "Bestie",
  "burnLevel": 40,
  "count": 3
}
```

Response:

```json
{
  "requestId": "...",
  "roast": "first roast (backward compatibility)",
  "roasts": ["...", "...", "..."],
  "requestedCount": 3,
  "roastCount": 3,
  "model": "gemini-2.5-flash",
  "audience": "Bestie",
  "burnLevel": 40,
  "createdAt": "..."
}
```

---

## 4. Backend Validation / Limits / Behavior

From `scripts/vps-roast-api.js`:

- `inputType` must be `text` or `image`.
- `audience` must be one of:
  - `Bestie`, `Sibling`, `Ex`, `Coworker`, `Self`, `Stranger`
- `burnLevel` must be `0..100`.
- `count` is clamped to `1..MAX_ROAST_COUNT`.
- `text` max length: `MAX_TEXT_LENGTH` (default `3000` chars).
- Payload size limit: `MAX_BODY_BYTES` (default `8_000_000` bytes).
- Per-IP rate limit: `RATE_LIMIT_PER_MINUTE` (default `30`).
- Request timeout to Gemini: `REQUEST_TIMEOUT_MS` (default `25000` ms).

Generation notes:

- Backend asks Gemini for strict JSON (`{"roasts":[...]}`) when possible.
- If structured output fails due model/schema field errors, it retries without structured mode.
- It normalizes/parses output and deduplicates roasts.
- If fewer roasts than requested are returned, backend does a top-up call for missing variants.
- No `maxOutputTokens` is currently set in generation config (intentional).

---

## 5. Environment Variables

## 5.1 Backend (`/root/scripts/roast.env`)

Required:

- `GEMINI_API_KEY`

Commonly used:

- `PORT` (default `8787`)
- `GEMINI_MODEL` (default `gemini-2.5-flash`)
- `ALLOWED_ORIGIN` (default `*`)
- `AUTH_BEARER_TOKEN` (if set, all generate requests require exact bearer match)
- `RATE_LIMIT_PER_MINUTE` (default `30`)
- `REQUEST_TIMEOUT_MS` (default `25000`)
- `MAX_BODY_BYTES` (default `8_000_000`)
- `MAX_TEXT_LENGTH` (default `3000`)
- `DEFAULT_ROAST_COUNT` (default `3`)
- `MAX_ROAST_COUNT` (default `5`)

## 5.2 Mobile app env

From `types/env.d.ts` / `services/roast-api.ts`:

- `EXPO_PUBLIC_ROAST_API_URL` (example: `https://api.brainnotes.app`)
- `EXPO_PUBLIC_ROAST_API_BEARER` (must match backend token if auth enabled)

---

## 6. Auth, CORS, and Security

- Auth mode: static bearer token comparison.
  - Request header must be `Authorization: Bearer <token>`.
  - Exact match required.
- CORS headers are returned for `GET/POST/OPTIONS`.
- If `AUTH_BEARER_TOKEN` is empty, endpoint is open (not recommended for production).

Security notes:

- API keys/tokens were exposed in terminal/chat during setup; rotate them if not already rotated.
- Keep `roast.env` readable only by root.
- Do not commit secrets to repo.

Token generation example:

```bash
openssl rand -base64 48 | tr -d '\n'
```

---

## 7. Service Management (systemd)

Service file used:

`/etc/systemd/system/roast-api.service`

Typical content:

```ini
[Unit]
Description=Roast API (Gemini)
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/scripts
EnvironmentFile=/root/scripts/roast.env
ExecStart=/usr/bin/node /root/scripts/vps-roast-api.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
```

Commands:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now roast-api
sudo systemctl restart roast-api
sudo systemctl status roast-api
journalctl -u roast-api -f
```

---

## 8. Domain + Reverse Proxy (Caddy)

DNS:

- `A` record `api.brainnotes.app` -> `178.156.213.158` (DNS only).

Caddy is the active web server on this host (`:80`, `:443`).
nginx is not active and can conflict on ports 80/443 if started.

### Caddyfile routing strategy

```caddy
api.brainnotes.app {
  handle /v1/roasts/* {
    reverse_proxy 127.0.0.1:8787
  }

  handle /healthz {
    reverse_proxy 127.0.0.1:8787
  }

  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
```

This keeps existing API/web routes on `:3000` while forwarding only roast paths to `:8787`.

Apply config:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

---

## 9. Health Checks and Smoke Tests

## 9.1 Direct backend (local on VPS)

```bash
curl -i http://127.0.0.1:8787/healthz

curl -i -X POST http://127.0.0.1:8787/v1/roasts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_BEARER_TOKEN" \
  --data '{"inputType":"text","text":"test me","audience":"Bestie","burnLevel":40,"count":1}'
```

## 9.2 Through domain/Caddy

```bash
curl -i https://api.brainnotes.app/healthz

curl -i -X POST https://api.brainnotes.app/v1/roasts/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_BEARER_TOKEN" \
  --data '{"inputType":"text","text":"test me","audience":"Bestie","burnLevel":40,"count":1}'
```

---

## 10. Known Issues We Hit + Resolutions

1. `curl 127.0.0.1:8787/healthz` failed after manual run  
Cause: process was stopped with `Ctrl+C`.  
Fix: run via systemd (`roast-api.service`) or restart node manually.

2. `Cannot GET /healthz` on domain  
Cause: Caddy route did not forward `/healthz` to roast API.  
Fix: add explicit `handle /healthz` -> `127.0.0.1:8787`.

3. `401 Unauthorized`  
Cause: token mismatch/truncated bearer in curl/app env.  
Fix: send full exact token, verify length and env values, then retry.

4. nginx reload failed with bind errors  
Cause: Caddy already bound to ports 80/443.  
Fix: keep Caddy as reverse proxy; don’t use nginx on same ports unless reconfigured.

5. 502 errors during generation  
Meaning: backend could not obtain valid model output; check `detail` field and journal logs.
For image requests also verify payload size + valid base64/mime.

---

## 11. Frontend Integration (Current)

### Client API layer

- `services/roast-api.ts`:
  - Sends request to `${EXPO_PUBLIC_ROAST_API_URL}/v1/roasts/generate`
  - Adds `Authorization` if `EXPO_PUBLIC_ROAST_API_BEARER` exists
  - Parses API errors with `error`, `detail`, `requestId`

- `hooks/useGenerateRoast.ts`:
  - React Query `useMutation` wrapper around `generateRoastRequest`

### Add screen generation flow

- File: `app/(add)/index.tsx`
- Supports:
  - Text input
  - Image input (base64 + mime)
  - Audience selection
  - Burn level slider
  - Roast count selector (`1`, `3`, `5`)
- On success:
  - Saves to local DB (`saveRoastGeneration`)
  - Navigates to item screen with:
    - `router.replace({ pathname: '/(item)/[id]', params: { id, celebrate: '1' } })`

---

## 12. Image Input Pipeline (Current App)

From `app/(add)/index.tsx`:

- Picks image via `expo-image-picker`.
- Processes image with `useImageManipulator` context API:
  - Resizes largest side to max `1280` if needed.
  - Saves as JPEG (`compress: 0.72`) with `base64: true`.
- Persists processed image to app documents directory:
  - `Paths.document/roast-images/...jpg` via new FileSystem API (`Directory`, `File`).
- Sends `imageBase64` + `imageMimeType` to backend for generation.

This reduces payload size vs raw camera/library file.

---

## 13. Local Data Model (SQLite + Drizzle)

Tables:

- `roasts`
  - one row per generation request
  - stores metadata: audience, burnLevel, input type, selected variant, status
- `roast_variants`
  - one row per generated roast variant
  - linked by `roast_id` (cascade on delete)
  - supports `isFavorite`

Relations:

- `roasts` 1 -> many `roast_variants`

Persistence helpers (`services/roast-db.ts`):

- `saveRoastGeneration(...) -> roastId | null`
- `listRoastHistory(...)`
- `getRoastById(...)`
- `updateRoastSelectedVariantIndex(...)`
- `setRoastVariantFavorite(...)`
- `deleteRoastById(...)`

---

## 14. Operational Checklist

When something breaks:

1. Check service:
```bash
systemctl status roast-api
journalctl -u roast-api -n 200 --no-pager
```

2. Check direct local endpoint:
```bash
curl -i http://127.0.0.1:8787/healthz
```

3. Check Caddy endpoint:
```bash
curl -i https://api.brainnotes.app/healthz
```

4. Check auth:
- confirm app/vps tokens match exactly.

5. Check Caddy config:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

6. Check payload constraints:
- body size, text length, image base64 validity.

---

## 15. Current Defaults Snapshot

- Model: `gemini-2.5-flash`
- Roast count defaults to `3`, max `5`
- Rate limit: `30/min/IP`
- Timeout: `25s`
- Payload max: `~8MB`
- Text max: `3000 chars`
- CORS origin: `*` (configurable)

---

## 16. Important Notes

- `https://api.brainnotes.app` returning "Cannot GET /" is not inherently wrong; health is `/healthz`, generation is `/v1/roasts/generate`.
- Health can be `200` while generate is `401` if bearer is wrong.
- Keep Caddy as single reverse proxy on this VPS to avoid port conflicts.

