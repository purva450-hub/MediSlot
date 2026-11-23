from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, or_, select

from ..extensions import db
from ..models import Appointment, AuditLog, Doctor, Specialty, User
from ..schemas import ActiveIn, ApprovalIn, SpecialtyIn
from ..services import booking
from ..services.serializers import appt_dict, doctor_dict, user_dict
from ..utils import ApiError, audit, auth_required, int_arg, notify, paginate, parse, utcnow

bp = Blueprint("admin", __name__)


def _count(model, *where):
    return db.session.scalar(select(func.count()).select_from(model).where(*where))


@bp.get("/dashboard")
@auth_required("admin")
def dashboard():
    now = utcnow()
    since = now - timedelta(days=14)
    by_day = db.session.execute(
        select(func.date(Appointment.start_utc), func.count()).where(Appointment.start_utc >= since)
        .group_by(func.date(Appointment.start_utc)).order_by(func.date(Appointment.start_utc))).all()
    recent = db.session.scalars(select(Appointment).order_by(Appointment.created_at.desc()).limit(5)).all()
    users = db.session.scalars(select(User).order_by(User.created_at.desc()).limit(5)).all()
    pending = db.session.scalars(select(Doctor).where(Doctor.approval_status == "pending").limit(10)).all()
    logs = db.session.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(10)).all()
    return jsonify(
        totals={"patients": _count(User, User.role == "patient"), "doctors": _count(Doctor),
                "appointments": _count(Appointment),
                "upcoming": _count(Appointment, Appointment.start_utc >= now, Appointment.status.in_(booking.ACTIVE)),
                "completed": _count(Appointment, Appointment.status == "completed"),
                "cancelled": _count(Appointment, Appointment.status == "cancelled")},
        appointments_per_day=[{"date": str(d), "count": n} for d, n in by_day],
        recent_bookings=[appt_dict(a, g.user) for a in recent],
        recent_registrations=[user_dict(u) for u in users],
        doctor_approval_requests=[doctor_dict(d, admin=True) for d in pending],
        recent_activity=[{"action": l.action, "details": l.details, "user_id": l.user_id,
                          "at": booking.iso(l.created_at)} for l in logs])


@bp.get("/users")
@auth_required("admin")
def users():
    q = select(User)
    a = request.args
    if a.get("role") in ("patient", "doctor", "admin"):
        q = q.where(User.role == a["role"])
    if a.get("active") in ("true", "false"):
        q = q.where(User.is_active.is_(a["active"] == "true"))
    if a.get("q"):
        like = f"%{a['q'].strip()}%"
        q = q.where(or_(User.full_name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    return jsonify(paginate(q.order_by(User.created_at.desc()), user_dict))


@bp.put("/users/<int:uid>")
@auth_required("admin")
def set_user_active(uid):
    d = parse(ActiveIn)
    u = db.session.get(User, uid)
    if not u:
        raise ApiError("User not found", 404)
    if u.id == g.user.id:
        raise ApiError("You cannot deactivate your own account", 409)
    u.is_active = d.is_active
    audit(g.user.id, "user.activate" if d.is_active else "user.deactivate", u.email)
    db.session.commit()
    return jsonify(user=user_dict(u))


@bp.get("/doctors")
@auth_required("admin")
def doctors():
    q = select(Doctor).join(User, Doctor.user_id == User.id)
    if request.args.get("status") in ("pending", "approved", "rejected"):
        q = q.where(Doctor.approval_status == request.args["status"])
    if request.args.get("specialty_id", "").isdigit():
        q = q.where(Doctor.specialty_id == int(request.args["specialty_id"]))
    if request.args.get("q"):
        q = q.where(User.full_name.ilike(f"%{request.args['q'].strip()}%"))
    return jsonify(paginate(q.order_by(Doctor.id.desc()), lambda d: doctor_dict(d, admin=True)))


@bp.get("/doctors/<int:did>")
@auth_required("admin")
def doctor_detail(did):
    d = db.session.get(Doctor, did)
    if not d:
        raise ApiError("Doctor not found", 404)
    return jsonify(doctor=doctor_dict(d, admin=True))


@bp.put("/doctors/<int:did>/approval")
@auth_required("admin")
def approval(did):
    d = parse(ApprovalIn)
    doc = db.session.get(Doctor, did)
    if not doc:
        raise ApiError("Doctor not found", 404)
    doc.approval_status = d.status
    notify(doc.user_id, "approval", f"Profile {d.status}", f"Your doctor profile was {d.status} by an administrator.")
    audit(g.user.id, f"doctor.{d.status}", str(did))
    db.session.commit()
    return jsonify(doctor=doctor_dict(doc, admin=True))


@bp.get("/appointments")
@auth_required("admin")
def appointments():
    q = select(Appointment)
    a = request.args
    if a.get("status"):
        q = q.where(Appointment.status == a["status"])
    if a.get("doctor_id", "").isdigit():
        q = q.where(Appointment.doctor_id == int(a["doctor_id"]))
    if a.get("patient_id", "").isdigit():
        q = q.where(Appointment.patient_id == int(a["patient_id"]))
    if a.get("date"):
        try:
            day = date.fromisoformat(a["date"])
        except ValueError:
            raise ApiError("'date' must be YYYY-MM-DD", 422)
        from datetime import datetime, time
        lo = booking.to_utc(datetime.combine(day, time.min))
        q = q.where(Appointment.start_utc >= lo, Appointment.start_utc < lo + timedelta(days=1))
    if a.get("q"):
        q = q.where(Appointment.booking_code.ilike(f"%{a['q'].strip()}%"))
    return jsonify(paginate(q.order_by(Appointment.start_utc.desc()), lambda x: appt_dict(x, g.user)))


@bp.get("/specialties")
@auth_required("admin")
def specialties():
    rows = db.session.execute(select(Specialty, func.count(Doctor.id)).outerjoin(Doctor)
                              .group_by(Specialty.id).order_by(Specialty.name)).all()
    return jsonify(items=[{"id": s.id, "name": s.name, "description": s.description, "doctor_count": n}
                          for s, n in rows])


@bp.post("/specialties")
@auth_required("admin")
def add_specialty():
    d = parse(SpecialtyIn)
    if db.session.scalar(select(Specialty.id).where(func.lower(Specialty.name) == d.name.lower())):
        raise ApiError("Specialty already exists", 409)
    s = Specialty(name=d.name.strip(), description=d.description)
    db.session.add(s)
    audit(g.user.id, "specialty.add", s.name)
    db.session.commit()
    return jsonify(specialty={"id": s.id, "name": s.name, "description": s.description}), 201


@bp.put("/specialties/<int:sid>")
@auth_required("admin")
def edit_specialty(sid):
    d = parse(SpecialtyIn)
    s = db.session.get(Specialty, sid)
    if not s:
        raise ApiError("Specialty not found", 404)
    clash = db.session.scalar(select(Specialty.id).where(func.lower(Specialty.name) == d.name.lower(), Specialty.id != sid))
    if clash:
        raise ApiError("Specialty already exists", 409)
    s.name, s.description = d.name.strip(), d.description
    db.session.commit()
    return jsonify(specialty={"id": s.id, "name": s.name, "description": s.description})


@bp.delete("/specialties/<int:sid>")
@auth_required("admin")
def delete_specialty(sid):
    s = db.session.get(Specialty, sid)
    if not s:
        raise ApiError("Specialty not found", 404)
    if _count(Doctor, Doctor.specialty_id == sid):
        raise ApiError("Cannot delete a specialty that has doctors assigned", 409)
    db.session.delete(s)
    audit(g.user.id, "specialty.delete", s.name)
    db.session.commit()
    return "", 204
