# MediSlot Backend (Flask + MySQL) — Group 48, ADC CCSDS0302

Stage 1 of the MediSlot platform: database, authentication, role-based APIs and the appointment engine.

## Setup
```bash
cd backend
python -m venv venv && source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # edit DATABASE_URL, secrets
mysql -u root -p < schema.sql                          # or: flask db init && flask db migrate && flask db upgrade
DEMO_PASSWORD='ChooseOne123' python seed.py            # 8 specialties, 12 doctors, 20 patients, 32 appointments
python run.py                                          # http://localhost:5000/api/health
pytest                                                 # tests use in-memory SQLite
```
Demo logins (password = your `DEMO_PASSWORD`): `admin@medislot.demo`, `doctor@medislot.demo`, `patient@medislot.demo`.
All demo people and clinics are fictional.

## How double booking is prevented
1. Booking runs in one transaction and locks the doctor row (`SELECT ... FOR UPDATE`).
2. Slot is re-validated server-side (future, inside working hours, not in a break, not a day off).
3. `appointments.slot_lock` is UNIQUE (`doctor:start` while pending/confirmed, `NULL` when cancelled/rejected),
   so the database itself rejects a second active booking -> API returns **409**.

Reschedule/cancel use the same transaction; the old slot is released by the same UPDATE.
Times are stored in UTC and returned as ISO-8601 in `CLINIC_TZ`. Naive times in requests are treated as clinic local time.

## API (all under /api, JSON; errors are `{"error": "...", "details"?: [...]}`)
| Area | Endpoints |
|---|---|
| Auth | POST `auth/register` `auth/login` `auth/logout` `auth/forgot-password` `auth/reset-password` `auth/change-password`; GET/PUT `auth/me` |
| Doctors | GET `doctors?q&specialty&location&min_fee&max_fee&min_experience&min_rating&date&sort&page&per_page`; GET `doctors/:id`; GET `doctors/:id/availability?date=YYYY-MM-DD`; POST `doctors` (admin); PUT `doctors/:id` (admin/self); GET `specialties` |
| Appointments | POST `appointments` (patient); GET `appointments?status&scope=upcoming\|past&from&to&page`; GET `appointments/:id`; PUT `appointments/:id` `{status: confirmed\|rejected\|completed}` (doctor/admin); POST `appointments/:id/reschedule` `{start}`; POST `appointments/:id/cancel` `{reason}` |
| Availability | POST `availability`; PUT/DELETE `availability/:id`; POST `availability/unavailable`; DELETE `availability/unavailable/:id` — returns **409 + `conflicts`** if the change would orphan booked appointments |
| Notifications | GET `notifications`; POST `notifications/:id/read`; POST `notifications/read-all` |
| Admin | GET `admin/dashboard` `admin/users` `admin/doctors` `admin/appointments` `admin/specialties`; PUT `admin/users/:id` `admin/doctors/:id/approval`; POST/PUT/DELETE `admin/specialties` |

Booking body: `{"doctor_id": 1, "start": "2026-11-02T10:00:00", "reason": "Chest pain"}`

## Notes
- Doctors are created by admins (`POST /api/doctors`); nobody can self-register as doctor/admin.
- Email is optional: set `SMTP_*` in `.env`. Without it the API reports `email_delivery: "not_configured"`; only in-app notifications run.
- Reminders: schedule `flask send-reminders` hourly (cron).
- Production: `APP_ENV=production`, strong secrets, `gunicorn -w 4 'run:app'`, HTTPS, a Redis `RATELIMIT_STORAGE_URI`.
- Simplifications: one specialty per doctor; patients live in `users` (no separate `patients` table yet).
