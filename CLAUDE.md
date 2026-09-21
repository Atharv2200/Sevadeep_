# Sevadeep — project source of truth

NGO platform: public website, volunteer and admin accounts, activities, QR + location attendance,
volunteer contributions with photos, admin verification, and verified hours/history.
This file records the **finalized** architecture. Do not change a decision here without the user's approval.

## Stack and layout

- Frontend: React 18, Vite 5, Tailwind 3, Framer Motion, React Router, `qrcode.react` (display only). JavaScript, no TypeScript.
- Backend: Node >= 20, Express 4, Mongoose 8, **CommonJS**, Zod 4 for validation. MongoDB.
- Tests: backend `node:test` + supertest (`npm test`, needs local MongoDB, uses a `*-test` database); frontend Vitest + Testing Library (`npm test`).

```
backend/   server.js  app.js  config/  models/  routes/  middleware/  services/  validators/  utils/  scripts/  tests/
frontend/  src/{app,api,auth,layouts,pages/{public,volunteer,admin,account},components/ui,hooks,lib,test}
```

Routes stay thin. Services exist only where logic is multi-step, security-sensitive or reusable. No controller layers for their own sake.
`frontend/src/_reference/` holds old mock pages kept as UI specs until consumed; never route them.

## Authentication and sessions

- Roles: `VOLUNTEER`, `ADMIN`. One admin role in v1 (no SUPER_ADMIN, no permission hierarchy).
- Volunteers self-register (name, email, phone, password; registration logs them in). Admins never register publicly: the first comes from `npm run seed:admin`, further admins from `POST /api/admins` (admin-only, temporary password, `mustChangePassword=true`; no email/invite infrastructure). Password reset is admin-assisted; `POST /api/auth/change-password` exists.
- JWT in an httpOnly, SameSite=Lax cookie `sevadeep_token` (Secure in production, path `/api`), 7-day lifetime, payload has only `sub` and the token version. **Never store tokens in localStorage.** No refresh tokens.
- `authenticate` loads the User on every request, so suspension and `tokenVersion` bumps apply immediately. State-changing requests are protected by SameSite=Lax plus Origin validation (`originCheck`).
- Password: min 10 chars, max 72 bytes. Generic invalid-login errors and a dummy bcrypt compare for unknown emails. Rate-limit login, registration and (later) check-in.
- Suspended users cannot authenticate or act; historical records stay intact.

## Accounts and identity

- `User` (email, passwordHash `select:false`, role, name, status ACTIVE|SUSPENDED, mustChangePassword, tokenVersion, lastLoginAt). `User.volunteer` -> Volunteer (0..1). Admins have a name and no Volunteer.
- `Volunteer` is a profile only: `volunteerId` (server-generated, immutable, e.g. `VOL-2026-0001` from the `Counter` collection), `name`, `phone`. Never store passwords, QR codes, `totalHours`, `eventsAttended` or any client-controlled counter.
- Documents reference each other by ObjectId, never by `volunteerId`.
- Verified hours and activity counts are **derived** from Attendance/Contribution records (`statsService`), never persisted.

## Activity architecture

- Fields: title, description, category, startsAt, endsAt, locationName, address, latitude, longitude, radiusMeters, instructions, attendanceOpensMinutesBefore / attendanceClosesMinutesAfter (default 30/30, stored per activity), status, createdBy (server-set), `qrSecret` (random 32 bytes, `select:false`, never serialized).
- Status: `DRAFT | OPEN | CLOSED | CANCELLED`. Allowed transitions only: DRAFT->OPEN, DRAFT->CANCELLED, OPEN->CLOSED, OPEN->CANCELLED. CLOSED and CANCELLED are terminal; CLOSED is never reopened. Transitions are conditional updates. Admins change status via `PATCH /api/activities/:id/status`; `PATCH /api/activities/:id` edits content only. DRAFT and OPEN are editable; CLOSED/CANCELLED are locked.
- Visibility: volunteers browse OPEN activities only (not yet ended). DRAFT is invisible to volunteers (404). CANCELLED is not in the volunteer list. Past activities reach volunteers through attendance/history.
- The server computes `attendance {opensAt, closesAt, isOpen}`: `opensAt = startsAt - before`, `closesAt = endsAt + after`; open when status is OPEN and `opensAt <= now <= closesAt`. The frontend never computes windows.
- Once any Attendance exists, `latitude`, `longitude` and `radiusMeters` are locked (enforced when Attendance exists, Phase 5).
- Indexes: `{status, startsAt}`, `{startsAt}`.

## Attendance, QR and location (Phase 5 must follow)

- Flow: admin shows the activity QR -> volunteer scans with the normal phone camera -> Sevadeep attendance URL (built from `PUBLIC_APP_URL`) -> login if needed, then return to the attendance page (`?next=`, validated against open redirects) -> browser location -> submit -> server validates identity, activity, window, QR token, accuracy, distance and duplicates -> records Attendance. The admin never scans volunteer QRs; there is no in-app scanner.
- QR token: compact HMAC `bucket.hmac` (not a JWT), key = the activity's `qrSecret`, rotates every 60 s, current and previous 5-minute window accepted, timing-safe compare. The frontend refreshes using the server's `refreshInSeconds`. Regenerating `qrSecret` invalidates outstanding QRs.
- Location: the browser sends latitude, longitude, accuracy; the server computes `distanceMeters` (Haversine) and never trusts a client distance. Reject outside the radius and above `MAX_ACCURACY_METERS`; rejected attempts create no record. Store submitted coordinates, accuracy and distance.
- Suspicious flags (LOW_ACCURACY, NEAR_BOUNDARY, EARLY, LATE) are informational and never reject a valid attendance.
- One Attendance per activity + volunteer: unique compound index, not a frontend check. Simultaneous duplicates must yield one record (`ALREADY_CHECKED_IN`).
- Check-out (`POST /api/activities/:id/attendance/check-out`): authenticated volunteer + valid location, no QR. Duration is derived, never client-submitted.
- Live attendance uses polling (up to 200 rows, no pagination). No WebSockets/SSE.

## Contribution architecture (Phase 6)

- Activity -> Attendance -> Contribution; at most one Contribution per Attendance (unique index). Status `PENDING | VERIFIED | REJECTED`. A volunteer may edit only while PENDING.
- Admin review sets status and `approvedHours` (0.25 steps, max 24, VERIFIED requires > 0). A `revision` counter and conditional update prevent stale or double review (409). Attendance duration is only a suggestion.
- Only VERIFIED contributions count. Stats: `activitiesAttended` = Attendance count, `verifiedActivities` = VERIFIED count, `verifiedHours` = sum of `approvedHours` of VERIFIED.
- Photos are optional, max 5 per contribution, max 5 MB each, JPEG/PNG/WebP only (no SVG), re-encoded with Sharp with EXIF stripped, random storage keys, metadata only in MongoDB, local disk behind a small storage module so object storage can replace it. Served only through an authenticated endpoint with ownership/admin checks and `nosniff`.

## API conventions

- REST under same-origin `/api` (`auth`, `admins`, `volunteers`, `activities`, later `attendance`, `contributions`, `stats`, `health`). PATCH for partial updates. No CORS (the `cors` package and `CORS_ORIGINS` were removed); in development Vite proxies `/api`.
- Errors: `{ message, code?, errors? }` with stable machine-readable `code`s (`VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `QR_EXPIRED`, `OUT_OF_RADIUS`, `ALREADY_CHECKED_IN`, ...). Never leak stacks or database details. A resource owned by someone else returns 404, not 403.
- Collections: `?page=1&limit=20`, max limit 100, response `{ items, page, limit, total }`.
- Responses are built by explicit serializers (`utils/serializers.js`), never `res.json(document)`.
- Times are stored and compared in UTC; the browser renders local time.
- No MongoDB transactions in v1: use unique indexes and conditional updates.

## Validation and security

- Every route declares its input through `validate({ body, params, query })` with `z.strictObject`; **unknown fields are rejected, not stripped**. Mongoose validation is a second layer, not the API validation.
- No mass assignment: the client never sets ownership, role, status transitions, hours, timestamps, IDs, `volunteerId`, `createdBy`, `qrSecret` or review data.
- Authorization is enforced server-side on every route (`authenticate`, `requireRole`); frontend guards are UX only. `tests/authorization.test.js` holds a route matrix that fails when a route is added without an access rule; keep it complete.
- Escape user text before building regexes (`utils/escapeRegex`). Query parser is `simple` (no operator objects). Mongoose `sanitizeFilter` is on, so a server-built operator such as `{ $gte: now }` must be wrapped in `mongoose.trusted()`; never wrap anything derived from request input. Helmet, body limit 100kb, rate limits where set.
- No volunteer PII exposed publicly.

## Frontend architecture

- React Router; one `AuthContext`; local page state plus `useAsync`. **No Redux, Zustand, React Query or other state library.** Do not reintroduce mock data into routed pages.
- All HTTP goes through `src/api/*` on top of `client.js` (same-origin `/api`, cookie auth, `ApiError`). No `fetch` in pages/components, no hardcoded localhost URLs.
- Areas: public (`/`, `/login`, `/register`), `/volunteer/*`, `/admin/*`, `/change-password`. Guards: `RequireAuth`, `RequireRole`. Logged-out visitors are sent to `/login?next=...` and returned afterward.
- Reuse the UI primitives in `components/ui` and the existing Tailwind theme; preserve the visual design. List pages are driven by the URL query string (see `pages/admin/Volunteers.jsx`). Handle loading, empty, validation and API-error states.
- Later routes: `/attend/:activityId`, `/admin/activities/:id/attendance`, contributions and history pages, `/admin/contributions`.

## Testing expectations

- Every phase ships its own tests. Backend: validation, role matrix, ownership/visibility, CRUD, state transitions, boundary times (inject `now`), unique-index behaviour. Frontend: pages against a faked network (`test/mockFetch.js`, `test/renderApp.jsx`), covering loading, empty, error and validation states.
- Run the full backend and frontend suites and `npm run build` before finishing a phase. Tests use a separate `*-test` database and refuse to run otherwise.
- Real-phone testing over an HTTPS tunnel (Cloudflare Tunnel or ngrok); camera and geolocation need HTTPS.

## Prohibited / out of scope

- `react-qr-reader` or any in-app QR scanner (the volunteer uses the phone camera). `qrcode.react` is only for the admin to display the QR.
- Tokens in localStorage; JWTs inside QR codes; permanent unrestricted QR tokens; client-provided distance, hours or duration.
- Redux/Zustand/React Query, GraphQL, TypeScript migration, Next.js, Docker-based architecture, microservices, WebSockets/SSE (until a demonstrated need), CORS, SUPER_ADMIN, private/invite-only activities, email password recovery, persisted counters (`totalHours`, `eventsAttended`), reopening CLOSED activities, binary images in MongoDB.

## Phase roadmap

1. Repository cleanup and foundation — done.
2. Core data model and authentication (User, Volunteer, Counter, auth, admins, volunteers, seedAdmin, test harness) — done.
3. Frontend routing, auth and layouts (public/volunteer/admin areas, admin volunteers/admins pages) — done.
4. Activity system (model, CRUD, status transitions, attendance-window computation, volunteer and admin pages) — done.
5. Secure attendance, QR and location (Attendance model, `qrTokenService`, `attendanceService`, `utils/geo`, check-in/out, live attendance, `/attend/:activityId`).
6. Contributions, photos, verification, approved hours, stats.
7. Testing, security hardening, release (CI, production config, README, end-to-end run on real phones).

Work phase by phase; do not start a later phase's features early.
