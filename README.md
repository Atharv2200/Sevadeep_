# Sevadeep

A platform for the Sevadeep NGO: a public website, volunteer and admin accounts, activities with
QR + location attendance, volunteer contributions with photos, admin verification, and derived
verified hours/history.

## Key features

* **Public website** — a real (no placeholder statistics, stock photos, or fake contact info) marketing
  site: home, about, activities on offer, and a "get involved" call to action into registration/sign-in.
* **Volunteer accounts** — self-registration, a dashboard with derived stats (verified hours,
  activities attended, verified contributions), activity browsing, and history.
* **Activities** — admin-managed, with a `DRAFT → OPEN → CLOSED` (or `CANCELLED`) lifecycle and a
  server-computed attendance window.
* **QR + location attendance** — the admin displays a rotating QR code for an open activity; a
  volunteer scans it with their phone camera, signs in if needed, and checks in from the activity page.
  The server verifies the token and the volunteer's distance from the venue (Haversine); it never trusts
  a client-reported distance.
* **Contributions** — a volunteer submits hours (and up to 5 optional photos) against an attendance
  record; an admin reviews it and sets the approved hours. Only verified contributions count toward
  stats.
* **Admin tools** — activity management, live attendance monitoring, contribution review, volunteer
  account management (suspend/reactivate), and a stats overview.

## Tech stack

* **Frontend:** React 18, Vite 5, Tailwind CSS 3, Framer Motion, React Router, `qrcode.react`
  (JavaScript, no TypeScript).
* **Backend:** Node.js 20+, Express 4, Mongoose 8 (CommonJS), Zod 4 for validation.
* **Database:** MongoDB.
* **Authentication:** a JWT in an `httpOnly`, `SameSite=Lax` cookie (`sevadeep_token`), 7-day lifetime,
  no refresh tokens, and never stored in `localStorage`.

## Getting started

Follow these instructions to set up the project locally on your machine for development and testing.

### Prerequisites

Make sure you have the following installed on your local machine:
* [Node.js](https://nodejs.org/) 20 or higher
* [Git](https://git-scm.com/)
* A local MongoDB instance or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) URI

### Project structure

```
frontend/   React + Vite + Tailwind app
backend/    Express + Mongoose API (entry point: backend/server.js)
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Atharv2200/Sevadeep_.git
   cd Sevadeep_
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env   # then set MONGODB_URI and JWT_SECRET (both required)
   npm run seed:admin     # one-time: create the first admin (asks for name, email, password)
   npm run dev            # or: npm start
   ```
   The API runs on http://localhost:5000 (`GET /api/health`). The server exits with a clear message if a required variable is missing or MongoDB cannot be reached. Generate a `JWT_SECRET` with `openssl rand -hex 32`.

   - **Accounts:** volunteers register themselves (`POST /api/auth/register`); admins cannot. The first admin comes from `npm run seed:admin` (safe to re-run: it does nothing once an admin exists), and existing admins create further admins (`POST /api/admins`).
   - **Activities:** admins create and manage them (`POST /api/activities`, `PATCH /api/activities/:id`, `PATCH /api/activities/:id/status`); everyone signed in can read them (`GET /api/activities`, `GET /api/activities/:id`). A new activity is a `DRAFT`; status moves `DRAFT→OPEN|CANCELLED` and `OPEN→CLOSED|CANCELLED`, and `CLOSED`/`CANCELLED` are final. Volunteers browse `OPEN` activities that have not ended and cannot see drafts. Every activity carries a server-computed attendance window (`attendance: { opensAt, closesAt, isOpen }`, 30 minutes either side by default).
   - **Attendance:** an admin shows an activity's QR (`GET /api/activities/:id/qr` -> `{ url, expiresAt, refreshInSeconds }`, only while the activity is OPEN and inside its attendance window). The QR opens `PUBLIC_APP_URL/attend/:activityId?t=<token>`; the token is a compact HMAC that changes every minute and stops working 4-5 minutes after it was shown. A signed-in volunteer checks in with `POST /api/activities/:id/attendance` (`{ token, latitude, longitude, accuracy }`) and out with `POST /api/activities/:id/attendance/check-out` (position only, no QR). The server checks the account, the activity status, the attendance window, the token, and the distance from the venue (Haversine, within the activity's radius) — that distance check is the only reason a check-in is rejected. GPS accuracy is recorded as evidence, not a rejection criterion; a poor reading only surfaces to admins as an informational `LOW_ACCURACY` flag on the live/history view. Rejected attempts store nothing, and a unique index allows one attendance per volunteer per activity. Admins read `GET /api/activities/:id/attendance` (live list) and `GET /api/attendance` (history; volunteers only ever get their own records, without coordinates, distance or flags). Once anyone has checked in, the activity's latitude, longitude and radius can no longer change.
   - **Contributions:** once checked in, a volunteer can submit a contribution against that attendance (description, suggested hours, up to 5 photos) via `POST /api/contributions`, and edit it while it is `PENDING`. An admin reviews it (`PATCH /api/contributions/:id`), setting its status and the `approvedHours` that actually count; only `VERIFIED` contributions are added to a volunteer's stats.
   - **Login** sets an `httpOnly` cookie, so the API is meant to be called same-origin (the frontend dev server will proxy `/api`). There is no CORS.
   - **Tests:** `npm test`. They need a running MongoDB and use a separate `sevadeep-ngo-test` database (override with `MONGODB_URI_TEST`; the name must end in `-test`, and the tests refuse to run otherwise). Your development database is never touched.

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev            # http://localhost:5173 (start the backend first)
   npm test               # component and API-client tests (no backend needed)
   npm run build          # production build into frontend/dist
   ```
   The app calls the API at the same origin (`/api`). In development Vite proxies `/api` to the backend on http://localhost:5000, so the login cookie stays first-party and no CORS is needed; set `API_PROXY_TARGET` if your backend runs elsewhere. Sign in as the admin you created with `npm run seed:admin`, or register a volunteer at `/register`.

   Routes: `/` (public site), `/login`, `/register`, `/volunteer/*` (volunteer area: dashboard, `activities`, `activities/:id`, `history`, `contributions`, profile), `/attend/:activityId` (where the attendance QR lands), `/admin/*` (admin area: overview, `activities`, `activities/new`, `activities/:id`, `activities/:id/edit`, `activities/:id/attendance`, `contributions`, `contributions/:id`, volunteers, admins), `/change-password`. Route guards only decide what to show; the API enforces access on every request.

### Testing attendance on a phone

Browsers only give a page the device's location over **HTTPS**. Your phone can't reach `http://localhost`, so a [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) gives your local frontend a temporary public HTTPS address — the phone talks to that address, which forwards to the frontend on your machine, which still talks to your local backend and MongoDB exactly as in normal development. Nothing about the app itself needs to change for this.

1. **Start the backend** as usual:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend** with the phone-testing command, allowing Cloudflare's hostname:
   ```bash
   cd frontend
   VITE_ALLOWED_HOSTS=.trycloudflare.com npm run dev:phone
   ```

3. **Start a Cloudflare Quick Tunnel** pointed at the frontend (requires [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed):
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
   It prints a temporary HTTPS address, e.g. `https://example-name.trycloudflare.com`. This address changes every time you restart `cloudflared`.

4. **Tell the backend about that address.** The activity QR is built from `PUBLIC_APP_URL`, so pointing it at the tunnel makes the QR link out to the phone-reachable HTTPS address instead of `localhost` — no other change is needed for QR generation. In `backend/.env`, temporarily set:
   ```
   PUBLIC_APP_URL=https://example-name.trycloudflare.com
   ```
   then restart the backend (`npm run dev`) so it picks up the change.

5. **On your computer**, open http://localhost:5173, sign in as an admin, and open (or create) an activity with a valid location and an attendance window that is currently open. Open its QR.

6. **On the phone**, scan the QR with the normal camera app, sign in as a volunteer if asked, allow location access, and check in. The attendance should appear on the admin screen within a few seconds.

7. **When you're done**, restore normal desktop development: in `backend/.env` set
   ```
   PUBLIC_APP_URL=http://localhost:5173
   ```
   and restart the backend.
