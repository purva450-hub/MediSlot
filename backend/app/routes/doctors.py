from datetime import date, datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, or_, select
from werkzeug.security import generate_password_hash

from ..extensions import db
from ..models import Availability, Doctor, Specialty, Unavailability, User
from ..schemas import DoctorIn, DoctorUpdateIn
from ..services import booking
from ..services.serializers import doctor_dict
from ..utils import ApiError, audit, auth_required, int_arg, num_arg, parse

bp = Blueprint("doctors", __name__)
specialties_bp = Blueprint("specialties", __name__)

SORTS = {"rating": Doctor.rating.desc(), "fee_asc": Doctor.consultation_fee.asc(),
         "fee_desc": Doctor.consultation_fee.desc(), "experience": Doctor.experience_years.desc(),
         "name": User.full_name.asc()}


def parse_day(raw):
    try:
        return date.fromisoformat(raw)
    except (TypeError, ValueError):
        raise ApiError("'date' must be YYYY-MM-DD", 422)


@specialties_bp.get("")
def list_specialties():
    rows = db.session.execute(
        select(Specialty, func.count(Doctor.id)).outerjoin(
            Doctor, (Doctor.specialty_id == Specialty.id) & (Doctor.approval_status == "approved"))
        .group_by(Specialty.id).order_by(Specialty.name)).all()
    return jsonify(items=[{"id": s.id, "name": s.name, "description": s.description, "doctor_count": n}
                          for s, n in rows])


@bp.get("")
def list_doctors():
    a = request.args
    q = (select(Doctor).join(User, Doctor.user_id == User.id).join(Specialty, Doctor.specialty_id == Specialty.id)
         .where(Doctor.approval_status == "approved", User.is_active.is_(True)))
    if a.get("q"):
        like = f"%{a['q'].strip()}%"
        q = q.where(or_(User.full_name.ilike(like), Specialty.name.ilike(like), Doctor.clinic_name.ilike(like)))
    if a.get("specialty"):
        s = a["specialty"]
        q = q.where(Specialty.id == int(s)) if s.isdigit() else q.where(Specialty.name.ilike(s))
    if a.get("location"):
        like = f"%{a['location'].strip()}%"
        q = q.where(or_(Doctor.location.ilike(like), Doctor.address.ilike(like)))
    for key, col, op in (("min_fee", Doctor.consultation_fee, ">="), ("max_fee", Doctor.consultation_fee, "<="),
                         ("min_experience", Doctor.experience_years, ">="), ("min_rating", Doctor.rating, ">=")):
        v = num_arg(key)
        if v is not None:
            q = q.where(col >= v if op == ">=" else col <= v)
    q = q.order_by(SORTS.get(a.get("sort"), SORTS["rating"]), Doctor.id)

    day = parse_day(a["date"]) if a.get("date") else None
    page, per = int_arg("page", 1, lo=1), int_arg("per_page", 9, lo=1, hi=50)
    doctors = db.session.scalars(q).unique().all()
    cards = []
    for d in doctors:  # availability filter is computed from real slots + bookings
        if day:
            slots = booking.free_slots(d, day)
            if not slots:
                continue
            nxt = {"date": day.isoformat(), "slots": [s.strftime("%H:%M") for s in slots[:4]]}
        else:
            nxt = None
        cards.append((d, nxt))
    total = len(cards)
    items = []
    for d, nxt in cards[(page - 1) * per: page * per]:
        item = doctor_dict(d)
        item["next_available"] = nxt or booking.next_available(d, date.today())
        items.append(item)
    return jsonify(items=items, page=page, per_page=per, total=total, pages=max(1, -(-total // per)))


@bp.get("/<int:doctor_id>")
def get_doctor(doctor_id):
    d = db.session.get(Doctor, doctor_id)
    if not d or d.approval_status != "approved" or not d.user.is_active:
        raise ApiError("Doctor not found", 404)
    out = doctor_dict(d)
    out["next_available"] = booking.next_available(d, date.today(), 14)
    return jsonify(doctor=out)


@bp.get("/<int:doctor_id>/availability")
def doctor_availability(doctor_id):
    d = db.session.get(Doctor, doctor_id)
    if not d or d.approval_status != "approved":
        raise ApiError("Doctor not found", 404)
    out = {"slot_minutes": d.slot_minutes,
           "weekly": [{"id": r.id, "weekday": r.weekday, "start_time": r.start_time.strftime("%H:%M"),
                       "end_time": r.end_time.strftime("%H:%M"),
                       "break_start": r.break_start.strftime("%H:%M") if r.break_start else None,
                       "break_end": r.break_end.strftime("%H:%M") if r.break_end else None}
                      for r in db.session.scalars(select(Availability).where(Availability.doctor_id == d.id)
                                                  .order_by(Availability.weekday, Availability.start_time))],
           "days_off": [{"id": u.id, "date": u.date.isoformat(), "reason": u.reason}
                        for u in db.session.scalars(select(Unavailability).where(
                            Unavailability.doctor_id == d.id, Unavailability.date >= date.today())
                            .order_by(Unavailability.date))]}
    if request.args.get("date"):
        day = parse_day(request.args["date"])
        out["date"] = day.isoformat()
        out["slots"] = [{"start": s.isoformat(), "time": s.strftime("%H:%M")} for s in booking.free_slots(d, day)]
    return jsonify(out)


@bp.post("")
@auth_required("admin")
def create_doctor():
    d = parse(DoctorIn)
    if not db.session.get(Specialty, d.specialty_id):
        raise ApiError("Unknown specialty", 422)
    if db.session.scalar(select(User.id).where(User.email == d.email.lower())):
        raise ApiError("An account with this email already exists", 409)
    u = User(email=d.email.lower(), full_name=d.full_name, phone=d.phone, role="doctor",
             password_hash=generate_password_hash(d.password))
    db.session.add(u)
    db.session.flush()
    doc = Doctor(user_id=u.id, approval_status="approved", rating=0,
                 **d.model_dump(include={"specialty_id", "qualification", "experience_years", "consultation_fee",
                                         "clinic_name", "location", "address", "about", "slot_minutes"}))
    db.session.add(doc)
    audit(g.user.id, "doctor.create", u.email)
    db.session.commit()
    return jsonify(doctor=doctor_dict(doc, admin=True)), 201


@bp.put("/<int:doctor_id>")
@auth_required("doctor", "admin")
def update_doctor(doctor_id):
    doc = db.session.get(Doctor, doctor_id)
    if not doc:
        raise ApiError("Doctor not found", 404)
    if g.user.role == "doctor" and doc.user_id != g.user.id:
        raise ApiError("You can only edit your own profile", 403)
    d = parse(DoctorUpdateIn).model_dump(exclude_none=True)
    if "specialty_id" in d and not db.session.get(Specialty, d["specialty_id"]):
        raise ApiError("Unknown specialty", 422)
    for k in ("full_name", "phone"):
        if k in d:
            setattr(doc.user, k, d.pop(k))
    for k, v in d.items():
        setattr(doc, k, v)
    if "slot_minutes" in d:
        booking.assert_schedule_compatible(doc)
    audit(g.user.id, "doctor.update", str(doc.id))
    db.session.commit()
    return jsonify(doctor=doctor_dict(doc, admin=g.user.role == "admin"))
