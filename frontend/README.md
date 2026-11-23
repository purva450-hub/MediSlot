# MediSlot Frontend (React + TypeScript + Vite + Tailwind)
```bash
cd frontend && npm install && cp .env.example .env && npm run dev   # http://localhost:5173
```
Start the Flask backend first (`python run.py` on :5000); Vite proxies `/api` to it. Production: set `VITE_API_URL`, run `npm run build`.

Built so far: design system, API client, auth (JWT, role guards), navbar/footer, Home, Find Doctors (URL-driven filters + pagination), Login, Register, 404.
Also: doctor profile, 3-step booking, appointment details (confirm/reject/complete/cancel), reschedule, forgot/reset password.
Patient area: dashboard, My Appointments (tabs), notifications (bell + unread count), profile, settings (change password).
Doctor area: dashboard, appointments (week calendar + list, confirm/reject), availability management (hours, breaks, days off, slot length, conflict warnings), profile, notifications, settings.
Next: admin area, remaining public pages.
