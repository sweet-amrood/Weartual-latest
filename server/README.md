# Weartual Auth Backend

Node.js + Express + MongoDB auth backend with JWT, bcrypt, validation, and forgot-password token flow.

## Setup

1. Copy `.env.example` to `.env`
2. Update env values (especially `MONGODB_URI` and `JWT_SECRET`)
3. Install dependencies:

```bash
npm install
```

4. Run backend:

```bash
npm run dev
```

Server starts at `http://localhost:5000`.

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `GET /api/auth/me` (protected)
- `GET /api/health`

## Frontend Integration Notes

- CORS is enabled for `CLIENT_URL`
- Cookies are enabled (`credentials: true`)
- Backend returns both:
  - HTTP-only cookie (`token`)
  - JSON token in response body (`token`)

Example frontend request config:

```js
fetch("http://localhost:5000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password })
});
```
