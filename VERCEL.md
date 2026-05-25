# Deploy Majeeds Guard to Vercel

This project deploys **both** the parent web dashboard and the Node API on a single Vercel project.

## 1. Push to GitHub

Push this repo to GitHub and connect it in Vercel.

## 2. Import in Vercel

1. [vercel.com/new](https://vercel.com/new) → Import your GitHub repository.
2. Framework preset: **Vite** (auto-detected).
3. Build settings (from `vercel.json`):
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

## 3. Required: Redis storage (paired devices + telemetry)

Vercel serverless functions do **not** share `/tmp` between requests. Without Redis, paired devices disappear after refresh and the dashboard stays empty.

1. Open your Vercel project → **Storage** → **Create Database** → **Upstash Redis** / **Vercel KV**.
2. Link the database to this project. Vercel injects (names may vary):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN` (write token — required for saves)
   - `KV_REST_API_READ_ONLY_TOKEN` (not used by this app)
3. Redeploy after linking storage.
4. Confirm: open `https://YOUR-APP.vercel.app/health` → `"storage":"redis"`.

## 4. Environment variables

| Variable | Value |
|----------|--------|
| `APP_BASE_URL` | Your production URL, e.g. `https://majeeds-guard-web-app.vercel.app` (no trailing slash) |

Optional:

| Variable | When to use |
|----------|-------------|
| `CORS_ORIGIN` | Custom domain for the parent dashboard |
| `VITE_API_BASE_URL` | Only if API is on a **different** host than the web app |

You do **not** need `VITE_API_BASE_URL` when API and web share one Vercel URL.

## 5. Child Android app

1. Build or install the debug APK: `ChildApp` → `assembleDebug`.
2. **Server URL**: your Vercel site root, e.g. `https://your-project.vercel.app` (not `/bind/...`).
3. On the parent site: **Bind device** → generate a pairing token.
4. Child app: enter token → **Pair & Activate** → grant permissions → finish setup.
5. The foreground service uploads data; the parent dashboard refreshes every few seconds.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Device appears then vanishes on refresh | Add **Upstash Redis** to the Vercel project and redeploy. |
| Dashboard empty after pairing | Install new child APK; pair again with a **new** token; confirm Redis env vars exist. |
| Pairing failed HTTP 404 | Redeploy; Server URL must be site root. |
| Pairing failed HTTP 401 | Turn off **Deployment Protection**. Rebuild child APK. Use a **new** token. |
| Connection timeout | Use `https://` Vercel URL, not `192.168.x.x`. |
| Invite link shows `192.168.x.x` | Set `APP_BASE_URL` and redeploy. |

## Verify after deploy

- `https://YOUR-APP.vercel.app/health` → `{"status":"ok",...}`
- Pair child → `https://YOUR-APP.vercel.app/api/devices` → JSON array with your device

## Local full stack

```powershell
npm run dev:full
```

Parent UI: `http://localhost:5173` — API: `http://localhost:8080` (data saved under `backend/data/`).
