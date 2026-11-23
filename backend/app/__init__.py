import click
from flask import Flask, jsonify
from sqlalchemy import select
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import cors, db, jwt, limiter, migrate
from .utils import ApiError, notify, utcnow


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    if app.config["APP_ENV"] == "production" and any(
            "dev-only" in app.config[k] for k in ("SECRET_KEY", "JWT_SECRET_KEY")):
        raise RuntimeError("Set SECRET_KEY and JWT_SECRET_KEY in production")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from .models import RevokedToken
    from .routes import admin, appointments, auth, availability, contact, doctors, notifications

    for bp, prefix in ((auth.bp, "/api/auth"), (doctors.bp, "/api/doctors"),
                       (doctors.specialties_bp, "/api/specialties"), (appointments.bp, "/api/appointments"),
                       (availability.bp, "/api/availability"), (notifications.bp, "/api/notifications"),
                       (admin.bp, "/api/admin"), (contact.bp, "/api/contact")):
        app.register_blueprint(bp, url_prefix=prefix)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    # ---- JSON errors (never leak stack traces) ----
    @app.errorhandler(ApiError)
    def api_error(e):
        return jsonify(error=e.message, **e.extra), e.status

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify(error=e.description if e.code < 500 else "Server error"), e.code

    @app.errorhandler(Exception)
    def unexpected(e):
        app.logger.exception(e)
        db.session.rollback()
        return jsonify(error="Something went wrong on our side. Please try again."), 500

    @jwt.token_in_blocklist_loader
    def revoked(_h, payload):
        return db.session.scalar(select(RevokedToken.id).where(RevokedToken.jti == payload["jti"])) is not None

    for hook, msg in ((jwt.unauthorized_loader, "Authentication required"),
                      (jwt.invalid_token_loader, "Invalid token"),
                      (jwt.expired_token_loader, "Session expired. Please log in again."),
                      (jwt.revoked_token_loader, "Session ended. Please log in again.")):
        hook((lambda m: lambda *_: (jsonify(error=m), 401))(msg))

    @app.after_request
    def headers(r):
        r.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
                          "Referrer-Policy": "no-referrer", "Cache-Control": "no-store"})
        return r

    @app.cli.command("send-reminders")
    def send_reminders():
        """Run hourly (cron): in-app reminder for confirmed appointments in the next 24h."""
        from datetime import timedelta
        from .models import Appointment
        from .services.booking import _fmt
        rows = db.session.scalars(select(Appointment).where(
            Appointment.status == "confirmed", Appointment.reminder_sent.is_(False),
            Appointment.start_utc > utcnow(), Appointment.start_utc <= utcnow() + timedelta(hours=24))).all()
        for a in rows:
            for uid in (a.patient_id, a.doctor.user_id):
                notify(uid, "reminder", "Upcoming appointment", f"{a.booking_code} is at {_fmt(a)}.", a.id)
            a.reminder_sent = True
        db.session.commit()
        click.echo(f"{len(rows)} reminder(s) created")

    return app
