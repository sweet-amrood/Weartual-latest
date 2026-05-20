# Weartual

AI virtual try-on: upload a **person** (photo or video) and a **garment** image, then generate a new look. Includes a **live camera** mode powered by Decart WebRTC.

This repo contains two apps:

| Folder | Stack | Role |
|--------|-------|------|
| `weartual/` | React + Vite | Web UI (PWA) |
| `server/` | Express + MongoDB + Python | API, auth, try-on pipelines |

For architecture, API tables, and env var reference, see **[PROJECT.md](./PROJECT.md)**.

---

## Prerequisites

Install these before you start:

- **Node.js** 18+ (20+ recommended)
- **npm**
- **Python** 3.10+ (`python` or `python3` on your PATH)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Accounts / API keys for:
  - [Decart](https://platform.decart.ai) — image, video, and live try-on
  - [Cloudinary](https://cloudinary.com) — storing uploads and results
  - [Photoroom](https://www.photoroom.com/api) — optional garment “ghost mannequin” prep
  - [Google Cloud Console](https://console.cloud.google.com) — OAuth client ID (Sign in with Google)
  - SMTP (e.g. Gmail app password) — password reset and feedback emails

---

## Setup

### 1. Clone and open the repo

```bash
cd frontend/mushi
```

(Git root is this `mushi` folder.)

### 2. Backend environment

Create `server/.env` with at least:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_cluster_uri
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

PHOTOROOM_API_KEY=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=
COMPANY_EMAIL=

GHOST_GARMENT_ENABLED=true/false         #connected with phootroom ghost mannequin api scripts in preprocessing ghost.py
IMAGE_TRYON_FAST=false/true              #run processes in parallel in backend reduce overall try on timing to 20-25 seconds if GHOST_GARMENT_ENABLED=false, if true its rake arounds 30-35 seconds, but true will never change the face or anything else of the input person image, but it will also not be that much realstic as of false.
```

Use your real values. Do **not** commit `.env`.

### 3. Decart API keys (separate from `.env`)

```bash
cp server/preprocessing/vendor_cache/llvmpass.registry.example \
   server/preprocessing/vendor_cache/llvmpass.registry
```

Edit `llvmpass.registry` and add one or more Decart tokens (comma- or line-separated). This file is gitignored.

### 4. Install backend + Python dependencies

```bash
cd server
npm install
```

`postinstall` runs `pip install -r requirements.txt` into `server/python_vendor/` so `photo.py` and `irl.py` can import `decart`.

If Python install fails, install manually:

```bash
python -m pip install -r requirements.txt -t python_vendor
```

### 5. Frontend environment

Create `weartual/.env`:

```env
VITE_API_URL=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

`VITE_API_URL` must match the backend `PORT` and appear in `CLIENT_URL` for CORS and cookies.

### 6. Install frontend

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
2. Use email + password, or **Continue with Google** (same `GOOGLE_CLIENT_ID` on frontend and backend).
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

| Person input | Pipeline | Result |
|--------------|----------|--------|
| Photo | Photoroom ghost mannequin (if enabled) → Decart `photo.py` | PNG image |
| Video | Decart `irl.py` | MP4 video |

Results are saved to your account and shown in the studio. Failed “no change” image try-ons usually mean clearer front-facing photos or a stronger prompt in `server/preprocessing/vendor_cache/prompts/image_tryon.txt`.

**Faster image mode (optional):** set `IMAGE_TRYON_FAST=true` in `server/.env` (lower resolution, quicker).

**Skip Photoroom:** set `GHOST_GARMENT_ENABLED=false` (faster, weaker garment prep).

### Live camera try-on

1. In Studio, start **live** / camera mode (when available in the UI).
2. Allow camera permission.
3. The app requests a short-lived token from `POST /api/decart/realtime-token`.
4. Garment is sent to Decart over WebRTC; processed video appears in the preview.
5. You can capture a frame and run an **offline** image try-on from that capture.

Live prompt text can be tuned via `VITE_DECART_VTON_PROMPT` in `weartual/.env` (see `decartRealtime.js`).

### Outfit history (`/history`)

- View past looks saved to your account (from the server).
- Local history/ratings may also live in browser `localStorage` until you log in (then migrated).

### Profile (`/profile`)

- Update username, avatar, notification settings (requires login).

### Other pages

- **/** — Landing / marketing
- **/about**, **/contact** — Info and feedback form

---

## Editing prompts and keys

| What | Where |
|------|--------|
| Image try-on prompt | `server/preprocessing/vendor_cache/prompts/image_tryon.txt` |
| Video try-on prompt | `server/preprocessing/vendor_cache/prompts/video_tryon.txt` |
| Decart API keys | `server/preprocessing/vendor_cache/llvmpass.registry` |
| Live try-on prompt (browser) | `VITE_DECART_VTON_PROMPT` in `weartual/.env` |

Lines starting with `#` in `.txt` prompt files are comments.

Restart the backend after changing registry or env vars.

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

Set `NODE_ENV=production`, production `MONGODB_URI`, `CLIENT_URL` (include your frontend origin), and all API keys. Copy `llvmpass.registry` to the server; never commit it.

Ensure `CLIENT_URL` lists every frontend origin that should call the API (comma-separated).

---

## Common issues

| Problem | What to check |
|---------|----------------|
| Frontend can’t reach API | `VITE_API_URL`, backend running, `CLIENT_URL` includes `http://localhost:5173` |
| Try-on “not available” | `llvmpass.registry` exists and has valid Decart keys |
| Python / Decart import error | Re-run `npm install` in `server/` or manual `pip install -r requirements.txt -t python_vendor` |
| Ghost step fails | `PHOTOROOM_API_KEY` in `server/.env`, or disable with `GHOST_GARMENT_ENABLED=false` |
| Google login fails | Same client ID in `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`; authorized origins in Google Console |
| Cookies / auth lost on deploy | Production: `NODE_ENV=production`, HTTPS, `CLIENT_URL` matches frontend origin |
| Thousands of git changes | Large folders under `preprocessing/` should be gitignored; only track `photo.py`, `irl.py`, `ghost/`, `vendor_cache/` (see root `.gitignore`) |

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

- **[PROJECT.md](./PROJECT.md)** — Full reference: routes, services, env vars, database models, flow diagrams.

---

## License

University / project use — add your license here if needed.
