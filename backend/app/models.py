from datetime import datetime, timezone

from .extensions import db


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)  # all timestamps stored as naive UTC


class Stamped:
    created_at = db.Column(db.DateTime, default=_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=_now, onupdate=_now, nullable=False)


class User(Stamped, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(10), nullable=False, index=True)  # patient | doctor | admin
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True, nullable=False)


class Specialty(Stamped, db.Model):
    __tablename__ = "specialties"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))


class Doctor(Stamped, db.Model):
    __tablename__ = "doctors"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    specialty_id = db.Column(db.Integer, db.ForeignKey("specialties.id"), nullable=False, index=True)
    qualification = db.Column(db.String(160), nullable=False)
    experience_years = db.Column(db.Integer, default=0, nullable=False)
    consultation_fee = db.Column(db.Numeric(8, 2), nullable=False)
    rating = db.Column(db.Numeric(2, 1), default=0, nullable=False)
    clinic_name = db.Column(db.String(160), nullable=False)
    location = db.Column(db.String(120), nullable=False, index=True)
    address = db.Column(db.String(255), default="")
    about = db.Column(db.Text, default="")
    photo_url = db.Column(db.String(255))
    slot_minutes = db.Column(db.Integer, default=30, nullable=False)
    approval_status = db.Column(db.String(10), default="pending", nullable=False, index=True)
    user = db.relationship("User", backref=db.backref("doctor", uselist=False))
    specialty = db.relationship("Specialty", backref="doctors")


class Availability(Stamped, db.Model):
    """Weekly recurring working window (clinic local time). weekday: 0=Mon..6=Sun."""
    __tablename__ = "doctor_availability"
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    weekday = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    break_start = db.Column(db.Time)
    break_end = db.Column(db.Time)
    __table_args__ = (db.Index("ix_avail_doctor_weekday", "doctor_id", "weekday"),)


class Unavailability(Stamped, db.Model):
    """Holidays / days off."""
    __tablename__ = "doctor_unavailability"
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(160))
    __table_args__ = (db.UniqueConstraint("doctor_id", "date", name="uq_unavail_doctor_date"),)


class Appointment(Stamped, db.Model):
    __tablename__ = "appointments"
    id = db.Column(db.Integer, primary_key=True)
    booking_code = db.Column(db.String(16), unique=True, nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey("doctors.id"), nullable=False)
    start_utc = db.Column(db.DateTime, nullable=False)
    end_utc = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(10), default="pending", nullable=False, index=True)
    # Double-booking guard: "<doctor_id>:<start>" while pending/confirmed, NULL otherwise.
    # UNIQUE + NULL-friendly => works on MySQL (no partial indexes) and SQLite.
    slot_lock = db.Column(db.String(40), unique=True)
    cancelled_by_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    cancelled_at = db.Column(db.DateTime)
    cancel_reason = db.Column(db.String(300))
    reminder_sent = db.Column(db.Boolean, default=False, nullable=False)
    patient = db.relationship("User", foreign_keys=[patient_id])
    doctor = db.relationship("Doctor", backref="appointments")
    cancelled_by = db.relationship("User", foreign_keys=[cancelled_by_id])
    __table_args__ = (db.Index("ix_appt_doctor_start", "doctor_id", "start_utc"),
                      db.Index("ix_appt_patient_start", "patient_id", "start_utc"))


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(30), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    message = db.Column(db.String(300), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id", ondelete="SET NULL"))
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=_now, nullable=False)
    __table_args__ = (db.Index("ix_notif_user_read", "user_id", "is_read"),)


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)  # only the SHA-256 is stored
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=_now, nullable=False)


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    action = db.Column(db.String(60), nullable=False, index=True)
    details = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=_now, nullable=False)


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=_now, nullable=False)
