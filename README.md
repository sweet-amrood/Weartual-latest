# Weartual

AI virtual try-on: upload a **person** (photo or video) and a **garment** image, then generate a new look. Includes a **live camera** mode over WebRTC.

This repo contains two apps:

| Folder | Stack | Role |
|--------|-------|------|
| `weartual/` | React + Vite | Web UI (PWA) |
| `server/` | Express + MongoDB + Python | API, auth, try-on pipelines |

For architecture and API tables, see **[PROJECT.md](./PROJECT.md)**.

---

## Prerequisites

Install these before you start:

- **Node.js** 18+ (20+ recommended)
- **npm**
- **Python** 3.10+ (`python` or `python3` on your PATH)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Accounts needed for media storage, email, and Google Sign-In (ask the team for the configured credentials — do not commit secrets)

---

## Setup

### 1. Clone and open the repo

```bash
cd frontend/mushi
```

(Git root is this `mushi` folder.)

### 2. Backend environment

Create `server/.env` with the values provided for your environment (port, database, auth, media, email, CORS origins, and try-on related flags).

Use your real values. Do **not** commit `.env`.

### 3. Install backend + Python dependencies

```bash
cd server
npm install
```

`postinstall` installs Python packages from `requirements.txt` into `server/python_vendor/`.

If Python install fails, install manually:

```bash
python -m pip install -r requirements.txt -t python_vendor
```

### 4. Frontend environment

Create `weartual/.env` with at least:

```env
VITE_API_URL=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

`VITE_API_URL` must match the backend `PORT` and appear in `CLIENT_URL` for CORS and cookies.

### 5. Install frontend

```bash
cd ../weartual
npm install
```

---

## Running locally

Use **two terminals**.

**Terminal 1 — API**

```bash
cd server
npm run dev
```

Default: `http://localhost:5001` (or whatever `PORT` is in `.env`).

**Terminal 2 — UI**

```bash
cd weartual
npm run dev
```

Open **http://localhost:5173** in the browser.

Check the API: `GET http://localhost:5001/api/health` → `{ "success": true, ... }`.

---

## How to use the app

### Sign up / log in

1. Open **Sign up** or **Log in** from the navbar.
2. Use email + password, or **Continue with Google** (same Google client ID on frontend and backend).
3. Session is stored in an HTTP-only cookie; stay logged in across refreshes.

**Forgot password:** `/forgot-password` → email link → `/reset-password/:token`.

### Try-on studio (`/studio`)

Main workflow:

1. Go to **Studio** (login required when you run a try-on).
2. **Person** — upload a photo (JPEG/PNG/WebP) or short video (MP4/WebM/MOV, up to 100MB).
3. **Garment** — upload a flat garment image (up to 10MB).
4. Optionally pick **sample** images from the built-in dataset.
5. Click **Try on** (or equivalent action in the UI).

**What happens:**

| Person input | Result |
|--------------|--------|
| Photo | Generated try-on image (PNG) |
| Video | Generated try-on video (MP4) |

Results are saved to your account and shown in the studio. If an image try-on fails with “no change,” try clearer front-facing photos.

### Live camera try-on

1. In Studio, set **Person input** to **Live**.
2. Upload a **Garment Image** (required before connecting).
3. Allow camera permission and connect live try-on.
4. Processed video appears in the preview.
5. Optionally turn on **Add accessories** and describe extras (glasses, watch, hat, cap, etc.).
6. Use **Re-apply garment** / **Re-apply garment + accessory** if you change the garment or accessory text mid-session.
7. Capture a frame to run an **offline** image try-on from that capture.

### Outfit history (`/history`)

- View past looks saved to your account (from the server).
- Local history/ratings may also live in browser `localStorage` until you log in (then migrated).

### Profile (`/profile`)

- Update username, avatar, notification settings (requires login).

### Other pages

- **/** — Landing / marketing
- **/about**, **/contact** — Info and feedback form

---

## Production build

**Frontend**

```bash
cd weartual
npm run build
```

Deploy the `weartual/dist` folder (e.g. Netlify). Set `VITE_API_URL` to your production API URL at build time.

**Backend**

```bash
cd server
npm start
```

Set `NODE_ENV=production`, production database URI, `CLIENT_URL` (include your frontend origin), and the rest of your private server configuration. Never commit secrets.

Ensure `CLIENT_URL` lists every frontend origin that should call the API (comma-separated).

---

## Common issues

| Problem | What to check |
|---------|----------------|
| Frontend can’t reach API | `VITE_API_URL`, backend running, `CLIENT_URL` includes `http://localhost:5173` |
| Try-on “not available” | Backend env and try-on credentials are configured; restart the API after changes |
| Python import error | Re-run `npm install` in `server/` or manual `pip install -r requirements.txt -t python_vendor` |
| Google login fails | Same Google client ID on frontend and backend; authorized origins in Google Console |
| Cookies / auth lost on deploy | Production: `NODE_ENV=production`, HTTPS, `CLIENT_URL` matches frontend origin |
| Thousands of git changes | Large folders under `preprocessing/` should be gitignored; see root `.gitignore` |

---

## Scripts reference

| Location | Command | Purpose |
|----------|---------|---------|
| `server/` | `npm run dev` | API with nodemon |
| `server/` | `npm start` | API production |
| `weartual/` | `npm run dev` | Vite dev server |
| `weartual/` | `npm run build` | Production bundle |
| `weartual/` | `npm run preview` | Preview production build |

---

## Documentation

- **[PROJECT.md](./PROJECT.md)** — Full reference: routes, services, database models, flow diagrams.

---

## License

University / project use — add your license here if needed.
