"""Scheduling + appointment state changes. Every write runs in ONE transaction:
the doctor row is locked (SELECT ... FOR UPDATE) and a UNIQUE slot_lock column is
the final guarantee against double booking, even if two requests race."""
import secrets
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from flask import current_app
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import Appointment, Availability, Doctor, Unavailability
from ..utils import ApiError, audit, notify, utcnow

ACTIVE = ("pending", "confirmed")
TRANSITIONS = {"pending": {"confirmed", "rejected"}, "confirmed": {"completed"}}


# ---- time helpers (DB stores naive UTC; clinic works in CLINIC_TZ) ----
def _tz():
    return ZoneInfo(current_app.config["CLINIC_TZ"])


def to_utc(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=_tz())
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def to_local(utc_naive):
    return utc_naive.replace(tzinfo=timezone.utc).astimezone(_tz())


def iso(utc_naive):
    return to_local(utc_naive).isoformat() if utc_naive else None


def lock_key(doctor_id, start_utc):
    return f"{doctor_id}:{start_utc:%Y%m%d%H%M}"


def slot_taken():
    return ApiError("This time slot is no longer available. Please select another time.", 409)


# ---- slot generation ----
def day_slots(doctor, day):
    """Every slot (clinic-local naive datetime) the schedule offers on `day`, ignoring bookings."""
    if db.session.scalar(select(Unavailability.id).where(
            Unavailability.doctor_id == doctor.id, Unavailability.date == day)):
        return []
    step, out = timedelta(minutes=doctor.slot_minutes), set()
    for av in db.session.scalars(select(Availability).where(
            Availability.doctor_id == doctor.id, Availability.weekday == day.weekday())):
        cur, end = datetime.combine(day, av.start_time), datetime.combine(day, av.end_time)
        while cur + step <= end:
            nxt = cur + step
            in_break = av.break_start and cur.time() < av.break_end and nxt.time() > av.break_start
            if not in_break:
                out.add(cur)
            cur = nxt
    return sorted(out)


def free_slots(doctor, day):
    lo = to_utc(datetime.combine(day, time.min))
    hi = to_utc(datetime.combine(day + timedelta(days=1), time.min))
    booked = set(db.session.scalars(select(Appointment.start_utc).where(
        Appointment.doctor_id == doctor.id, Appointment.status.in_(ACTIVE),
        Appointment.start_utc >= lo, Appointment.start_utc < hi)))
    cutoff = utcnow() + timedelta(minutes=current_app.config["BOOKING_MIN_LEAD_MINUTES"])
    return [s for s in day_slots(doctor, day) if to_utc(s) not in booked and to_utc(s) >= cutoff]


def next_available(doctor, from_day, days=7):
    for i in range(days):
        day = from_day + timedelta(days=i)
        slots = free_slots(doctor, day)
        if slots:
            return {"date": day.isoformat(), "slots": [s.strftime("%H:%M") for s in slots[:4]]}
    return None


def _validate_slot(doctor, start_utc):
    if start_utc < utcnow() + timedelta(minutes=current_app.config["BOOKING_MIN_LEAD_MINUTES"]):
        raise ApiError("Appointments cannot be booked in the past or too close to the current time", 422)
    local = to_local(start_utc).replace(tzinfo=None)
    if local not in day_slots(doctor, local.date()):
        raise ApiError("That time is outside the doctor's working hours, during a break, or on a day off", 422)


def _patient_overlap(patient_id, start_utc, end_utc, exclude_id=None):
    q = select(Appointment.id).where(Appointment.patient_id == patient_id,
                                     Appointment.status.in_(ACTIVE),
                                     Appointment.start_utc < end_utc, Appointment.end_utc > start_utc)
    if exclude_id:
        q = q.where(Appointment.id != exclude_id)
    if db.session.scalar(q):
        raise ApiError("You already have an appointment that overlaps this time", 409)


def _lock_doctor(doctor_id):
    d = db.session.execute(select(Doctor).where(Doctor.id == doctor_id).with_for_update()).scalar_one_or_none()
    if not d or d.approval_status != "approved" or not d.user.is_active:
        raise ApiError("Doctor not found", 404)
    return d


def _lock_appt(appt_id):
    a = db.session.execute(select(Appointment).where(Appointment.id == appt_id).with_for_update()).scalar_one_or_none()
    if not a:
        raise ApiError("Appointment not found", 404)
    return a


def can_access(user, appt):
    return (user.role == "admin" or appt.patient_id == user.id
            or (user.role == "doctor" and user.doctor and appt.doctor_id == user.doctor.id))


def _fmt(appt):
    return to_local(appt.start_utc).strftime("%d %b %Y, %I:%M %p")


def _txn(fn):
    """Run fn() and commit; roll back on any failure; map unique-slot violations to 409."""
    try:
        result = fn()
        db.session.commit()
        return result
    except IntegrityError:
        db.session.rollback()
        raise slot_taken()
    except Exception:
        db.session.rollback()
        raise


# ---- operations ----
def book(patient, doctor_id, start, reason):
    def run():
        doctor = _lock_doctor(doctor_id)
        start_utc = to_utc(start)
        _validate_slot(doctor, start_utc)
        end_utc = start_utc + timedelta(minutes=doctor.slot_minutes)
        _patient_overlap(patient.id, start_utc, end_utc)
        appt = Appointment(booking_code="MS-" + secrets.token_hex(4).upper(), patient_id=patient.id,
                           doctor_id=doctor.id, start_utc=start_utc, end_utc=end_utc, reason=reason,
                           status="pending", slot_lock=lock_key(doctor.id, start_utc))
        db.session.add(appt)
        db.session.flush()
        notify(patient.id, "booking", "Appointment requested",
               f"Your appointment with Dr. {doctor.user.full_name} on {_fmt(appt)} awaits confirmation.", appt.id)
        notify(doctor.user_id, "booking", "New appointment request",
               f"{patient.full_name} requested {_fmt(appt)}.", appt.id)
        audit(patient.id, "appointment.book", appt.booking_code)
        return appt
    return _txn(run)


def reschedule(appt_id, user, new_start):
    def run():
        appt = _lock_appt(appt_id)
        if not can_access(user, appt) or user.role == "doctor":
            raise ApiError("You do not have permission to modify this appointment", 403)
        if appt.status not in ACTIVE:
            raise ApiError("Only pending or confirmed appointments can be rescheduled", 409)
        _check_window(user, appt)
        doctor = _lock_doctor(appt.doctor_id)
        new_utc = to_utc(new_start)
        if new_utc == appt.start_utc:
            raise ApiError("Please choose a different time", 422)
        _validate_slot(doctor, new_utc)
        new_end = new_utc + timedelta(minutes=doctor.slot_minutes)
        _patient_overlap(appt.patient_id, new_utc, new_end, exclude_id=appt.id)
        old = _fmt(appt)
        # old slot is released and the new one reserved by this single UPDATE
        appt.start_utc, appt.end_utc = new_utc, new_end
        appt.slot_lock, appt.status, appt.reminder_sent = lock_key(doctor.id, new_utc), "pending", False
        db.session.flush()
        for uid in (appt.patient_id, doctor.user_id):
            notify(uid, "reschedule", "Appointment rescheduled",
                   f"{appt.booking_code} moved from {old} to {_fmt(appt)}.", appt.id)
        audit(user.id, "appointment.reschedule", appt.booking_code)
        return appt
    return _txn(run)


def _check_window(user, appt):
    hours = current_app.config["CANCEL_MIN_HOURS"]
    if user.role == "patient" and appt.start_utc - utcnow() < timedelta(hours=hours):
        raise ApiError(f"Patients can only change or cancel at least {hours} hour(s) before the appointment", 409)


def cancel(appt_id, user, reason=None):
    def run():
        appt = _lock_appt(appt_id)
        if not can_access(user, appt):
            raise ApiError("You do not have permission to modify this appointment", 403)
        if appt.status not in ACTIVE:
            raise ApiError("This appointment can no longer be cancelled", 409)
        _check_window(user, appt)
        appt.status, appt.slot_lock = "cancelled", None  # slot released
        appt.cancelled_by_id, appt.cancelled_at, appt.cancel_reason = user.id, utcnow(), reason
        for uid in {appt.patient_id, appt.doctor.user_id} - {user.id}:
            notify(uid, "cancellation", "Appointment cancelled",
                   f"{appt.booking_code} on {_fmt(appt)} was cancelled by the {user.role}.", appt.id)
        audit(user.id, "appointment.cancel", appt.booking_code)
        return appt
    return _txn(run)


def set_status(appt_id, user, status):
    def run():
        appt = _lock_appt(appt_id)
        if user.role == "patient" or not can_access(user, appt):
            raise ApiError("You do not have permission to modify this appointment", 403)
        if status not in TRANSITIONS.get(appt.status, set()):
            raise ApiError(f"Cannot change an appointment from {appt.status} to {status}", 409)
        if status == "completed" and appt.start_utc > utcnow():
            raise ApiError("An appointment can only be completed after it starts", 409)
        appt.status = status
        if status == "rejected":
            appt.slot_lock = None
        notify(appt.patient_id, status, f"Appointment {status}",
               f"{appt.booking_code} on {_fmt(appt)} was {status}.", appt.id)
        audit(user.id, f"appointment.{status}", appt.booking_code)
        return appt
    return _txn(run)


def assert_schedule_compatible(doctor):
    """Call after modifying availability (before commit). If any future active appointment
    would no longer fit the schedule, roll back and return 409 listing them."""
    db.session.flush()
    cache, bad = {}, []
    for a in db.session.scalars(select(Appointment).where(
            Appointment.doctor_id == doctor.id, Appointment.status.in_(ACTIVE), Appointment.start_utc > utcnow())):
        loc = to_local(a.start_utc).replace(tzinfo=None)
        if loc.date() not in cache:
            cache[loc.date()] = set(day_slots(doctor, loc.date()))
        if loc not in cache[loc.date()]:
            bad.append({"id": a.id, "booking_code": a.booking_code, "start": iso(a.start_utc), "status": a.status})
    if bad:
        db.session.rollback()
        raise ApiError("This change would invalidate existing appointments. "
                       "Cancel or reschedule them first, then retry.", 409, conflicts=bad)
