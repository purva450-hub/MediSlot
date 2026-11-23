from datetime import date

from flask import Blueprint, g, jsonify
from sqlalchemy import select

from ..extensions import db
from ..models import Availability, Doctor, Unavailability
from ..schemas import AvailabilityIn, UnavailabilityIn
from ..services import booking
from ..utils import ApiError, audit, auth_required, parse

bp = Blueprint("availability", __name__)


def _doctor_for(doctor_id):
    if g.user.role == "doctor":
        if not g.user.doctor:
            raise ApiError("Doctor profile not found", 404)
        return g.user.doctor
    if not doctor_id:
        raise ApiError("doctor_id is required", 422)
    d = db.session.get(Doctor, doctor_id)
    if not d:
        raise ApiError("Doctor not found", 404)
    return d


def _owned(model, rid):
    row = db.session.get(model, rid)
    if not row:
        raise ApiError("Not found", 404)
    if g.user.role == "doctor" and row.doctor_id != (g.user.doctor.id if g.user.doctor else None):
        raise ApiError("You can only manage your own schedule", 403)
    return row


def _no_overlap(doctor_id, d, exclude=None):
    for r in db.session.scalars(select(Availability).where(
            Availability.doctor_id == doctor_id, Availability.weekday == d.weekday)):
        if r.id != exclude and r.start_time < d.end_time and r.end_time > d.start_time:
            raise ApiError("This window overlaps an existing one on the same day", 409)


def _row(r):
    return {"id": r.id, "doctor_id": r.doctor_id, "weekday": r.weekday, "start_time": r.start_time.strftime("%H:%M"),
            "end_time": r.end_time.strftime("%H:%M"),
            "break_start": r.break_start.strftime("%H:%M") if r.break_start else None,
            "break_end": r.break_end.strftime("%H:%M") if r.break_end else None}


@bp.post("")
@auth_required("doctor", "admin")
def add_window():
    d = parse(AvailabilityIn)
    doc = _doctor_for(d.doctor_id)
    _no_overlap(doc.id, d)
    r = Availability(doctor_id=doc.id, **d.model_dump(exclude={"doctor_id"}))
    db.session.add(r)
    audit(g.user.id, "availability.add", str(doc.id))
    db.session.commit()
    return jsonify(availability=_row(r)), 201


@bp.put("/<int:rid>")
@auth_required("doctor", "admin")
def edit_window(rid):
    r = _owned(Availability, rid)
    d = parse(AvailabilityIn)
    _no_overlap(r.doctor_id, d, exclude=r.id)
    for k, v in d.model_dump(exclude={"doctor_id"}).items():
        setattr(r, k, v)
    booking.assert_schedule_compatible(db.session.get(Doctor, r.doctor_id))  # 409 + conflict list if it would orphan bookings
    audit(g.user.id, "availability.edit", str(rid))
    db.session.commit()
    return jsonify(availability=_row(r))


@bp.delete("/<int:rid>")
@auth_required("doctor", "admin")
def delete_window(rid):
    r = _owned(Availability, rid)
    doc = db.session.get(Doctor, r.doctor_id)
    db.session.delete(r)
    booking.assert_schedule_compatible(doc)
    audit(g.user.id, "availability.delete", str(rid))
    db.session.commit()
    return "", 204


@bp.post("/unavailable")
@auth_required("doctor", "admin")
def add_day_off():
    d = parse(UnavailabilityIn)
    if d.date < date.today():
        raise ApiError("Cannot add a day off in the past", 422)
    doc = _doctor_for(d.doctor_id)
    if db.session.scalar(select(Unavailability.id).where(Unavailability.doctor_id == doc.id,
                                                        Unavailability.date == d.date)):
        raise ApiError("That date is already marked unavailable", 409)
    u = Unavailability(doctor_id=doc.id, date=d.date, reason=d.reason)
    db.session.add(u)
    booking.assert_schedule_compatible(doc)
    audit(g.user.id, "availability.day_off", f"{doc.id} {d.date}")
    db.session.commit()
    return jsonify(day_off={"id": u.id, "date": u.date.isoformat(), "reason": u.reason}), 201


@bp.delete("/unavailable/<int:uid>")
@auth_required("doctor", "admin")
def remove_day_off(uid):
    db.session.delete(_owned(Unavailability, uid))
    db.session.commit()
    return "", 204
