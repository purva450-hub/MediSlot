# MediSlot – Smart Patient Appointment Scheduling Platform
ADC (CCSDS0302) · Group 48 · Purva Arora, Paras Gupta, Pushkar Agrawal, Manvendra Rajpoot · supports SDG 3

Patients find doctors and book, reschedule or cancel appointments; doctors manage schedules; admins manage the system.
All doctors, patients and statistics are **fictional demo data**.

## Stack
React + TypeScript + Vite + Tailwind + React Router + React Hook Form + Zod + Axios + Recharts · Flask + JWT + Pydantic + SQLAlchemy · MySQL 8

## Structure
```
backend/   Flask API (app/routes, services, models, schemas), schema.sql, seed.py, tests/   -> backend/README.md has the API table
frontend/  React app (src/pages, components, lib), unit tests, Playwright e2e
```

## Run locally
1. **Database:** `mysql -u root -p < backend/schema.sql`, then create a user, e.g. `CREATE USER 'medislot'@'localhost' IDENTIFIED BY '...'; GRANT ALL ON medislot.* TO 'medislot'@'localhost';`
2. **Backend:** `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && cp .env.example .env` (set `DATABASE_URL`), then `DEMO_PASSWORD='ChooseOne123' python seed.py` and `python run.py` (port 5000).
3. **Frontend:** `cd frontend && npm install && npm run dev` (port 5173; `/api` is proxied to Flask).

Demo logins (password = your `DEMO_PASSWORD`): `admin@medislot.demo`, `doctor@medislot.demo`, `patient@medislot.demo`.

## Environment variables
Backend (`backend/.env`): `APP_ENV`, `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `FRONTEND_URL`, `CLINIC_TZ`, `CANCEL_MIN_HOURS`, optional `SMTP_*`, `RATELIMIT_STORAGE_URI`.
Frontend (`frontend/.env`): `VITE_API_URL` (production only).

## Tests
- Backend: `cd backend && pytest` (SQLite in memory; includes the two-patients-one-slot conflict test).
- Frontend unit: `cd frontend && npm test`.
- End to end: start API + `npm run dev`, then `DEMO_PASSWORD=... npm run e2e` (books an appointment as the demo patient).

## Deployment
1. Provision MySQL 8; apply `schema.sql` (or Flask-Migrate); **do not run the seed in production**.
2. Backend: set `APP_ENV=production` plus strong `SECRET_KEY`/`JWT_SECRET_KEY` (the app refuses to start otherwise), `DATABASE_URL`, `CORS_ORIGINS=https://your-frontend`. Run `gunicorn -w 4 -b 0.0.0.0:8000 'run:app'` behind HTTPS (nginx/Caddy). Use Redis for `RATELIMIT_STORAGE_URI`. Schedule `flask send-reminders` hourly.
3. Frontend: `VITE_API_URL=https://your-api/api npm run build`, then serve `frontend/dist` from any static host with SPA fallback to `index.html`.
4. Optional email: set `SMTP_*`; without it only in-app notifications are active.

## Known limits
One specialty per doctor; patients are stored in `users`; contact messages are stored but have no admin screen yet; admins receive no notifications; the code has not been run in the build environment, so expect to fix small issues on first run.
