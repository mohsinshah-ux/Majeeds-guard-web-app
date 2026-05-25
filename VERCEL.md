# Deploy KidsGuard to Vercel

This project deploys **both** the parent web dashboard and the Node API on a single Vercel project.

## 1. Push to GitHub

Push this repo to GitHub (see `GITHUB_SETUP.md`).

## 2. Import in Vercel

1. [vercel.com/new](https://vercel.com/new) → Import your GitHub repository.
2. Framework preset: **Vite** (auto-detected).
3. Build settings (usually auto-filled from `vercel.json`):
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy.

## 3. Environment variables (recommended)

| Variable | Value |
|----------|--------|
| `APP_BASE_URL` | `https://majeeds-guard-web-app.vercel.app` or your preview URL (no trailing slash) |

Example preview URL:
`https://majeeds-guard-web-app-git-3c45c0-mohsinpcda-gmailcoms-projects.vercel.app`

Optional:

| Variable | When to use |
|----------|-------------|
| `CORS_ORIGIN` | Custom domain for the parent dashboard |
| `VITE_API_BASE_URL` | Only if API is hosted on a **different** host than the web app |

You do **not** need `VITE_API_BASE_URL` when API and web share one Vercel URL.

## 4. Child Android app

1. Install the debug APK (`ChildApp` → `assembleDebug`).
2. Open the child app → **Server URL**: enter your Vercel URL exactly, e.g. `https://your-project.vercel.app` (no `/bind/...` path).
3. On the parent site, open **Bind device** and generate a pairing token.
4. Enter that token in the child app → **Pair & Activate**.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pairing failed HTTP 404 | API not reachable — confirm `vercel.json` is in the repo and redeploy. Server URL must be the site root, not a page path. |
| Connection failed: timeout | Redeploy latest code. Server URL must be `https://YOUR-PROJECT.vercel.app`, not `192.168.x.x`. Generate a **new** token after deploy. |
| Pairing failed HTTP 401 | Turn off **Vercel Deployment Protection** (Project → Settings → Deployment Protection). Rebuild child APK. Create a **new** token on the parent site. |
| Invite link shows `192.168.x.x` | Set `APP_BASE_URL` in Vercel env and redeploy. |
| Token invalid after deploy | Create a **new** invite after each cold deploy if persistence fails; pairing data is stored in `/tmp` on Vercel (best-effort). |

## Local full stack

```powershell
npm run dev:full
```

Parent UI: `http://localhost:5173` — API: `http://localhost:8080`
