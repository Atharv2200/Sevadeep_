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
   - **Login** sets an `httpOnly` cookie, so the API is meant to be called same-origin (the frontend dev server will proxy `/api`). There is no CORS.
   - **Tests:** `npm test`. They need a running MongoDB and use a separate `sevadeep-ngo-test` database (override with `MONGODB_URI_TEST`; the name must end in `-test`, and the tests refuse to run otherwise). Your development database is never touched.

3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev            # http://localhost:5173
   npm run build          # production build into frontend/dist
   ```
