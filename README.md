# Sevadeep Volunteer Portal 🌟

> A dedicated platform for Sevadeep to connect with volunteers, manage community events, and track social impact.

## 📖 About the Project

The Sevadeep Volunteer Portal is a web application designed to streamline the onboarding and management of volunteers for the Sevadeep non-profit organization. It provides a centralized space for administrators to post volunteering opportunities and for users to discover causes, register for events, and track their contribution hours.

## ✨ Key Features

* **Volunteer Dashboard:** Secure registration, profile management, and impact tracking.
* **Opportunities Board:** Browse upcoming events, campaigns, and daily tasks.
* **Admin Portal:** Manage volunteer sign-ups, create new events, and oversee operations.
* **Responsive Design:** Optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Authentication:** JSON Web Tokens (JWT) / [Insert your Auth method]

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine for development and testing.

### Prerequisites

Make sure you have the following installed on your local machine:
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
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
   - **Attendance:** an admin shows an activity's QR (`GET /api/activities/:id/qr` -> `{ url, expiresAt, refreshInSeconds }`, only while the activity is OPEN and inside its attendance window). The QR opens `PUBLIC_APP_URL/attend/:activityId?t=<token>`; the token is a compact HMAC that changes every minute and stops working 4-5 minutes after it was shown. A signed-in volunteer checks in with `POST /api/activities/:id/attendance` (`{ token, latitude, longitude, accuracy }`) and out with `POST /api/activities/:id/attendance/check-out` (position only, no QR). The server checks the account, the activity status, the attendance window, the token, the GPS accuracy (`MAX_ACCURACY_METERS`, default 100) and the distance from the venue (Haversine, within the activity's radius). Rejected attempts store nothing, and a unique index allows one attendance per volunteer per activity. Admins read `GET /api/activities/:id/attendance` (live list) and `GET /api/attendance` (history; volunteers only ever get their own records, without coordinates, distance or flags). Once anyone has checked in, the activity's latitude, longitude and radius can no longer change.
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

   Routes: `/` (public site), `/login`, `/register`, `/volunteer/*` (volunteer area: dashboard, `activities`, `activities/:id`, `history`, profile), `/attend/:activityId` (where the attendance QR lands), `/admin/*` (admin area: overview, `activities`, `activities/new`, `activities/:id`, `activities/:id/edit`, `activities/:id/attendance`, volunteers, admins), `/change-password`. Route guards only decide what to show; the API enforces access on every request.

### Testing attendance on a phone

The QR must open on a phone, and browsers only give a page the device's location over **HTTPS** (`http://localhost` is exempt on the machine running it, but a phone reaches your laptop by another name). Use an HTTPS tunnel; the cookie, the Origin check and the QR URL all need to agree on one public address.

1. Start a tunnel to the frontend, e.g. `cloudflared tunnel --url http://localhost:4173` or `ngrok http 4173`, and note its `https://...` address.
2. Backend: set `PUBLIC_APP_URL` to that address in `backend/.env` (QR links are built from it, and it is the Origin the API accepts), then `npm run dev`.
3. Frontend: `npm run build`, then serve it with the tunnel's hostname allowed:
   ```bash
   VITE_ALLOWED_HOSTS=.trycloudflare.com npm run preview -- --port 4173
   ```
   (`.ngrok-free.app` for ngrok, or an exact hostname.) Vite refuses any `Host` it is not told about; `VITE_ALLOWED_HOSTS` adds only the names you list (exact hostnames or `.suffix.tld`, never `*`), and unset it changes nothing.
4. Open the tunnel address on your computer, sign in as an admin, create an activity, open it, and open its attendance screen. Set the activity's location to where you are and give it a start time within the attendance window.
5. On the phone, scan the QR with the normal camera app and open the link. If you are signed out you are sent to sign in and returned to the attendance page; tap **Check in** and allow location. The volunteer appears on the admin screen within ten seconds.
