from datetime import date, datetime, time, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..models import Appointment
from ..schemas import BookIn, CancelIn, RescheduleIn, StatusIn
from ..services import booking
from ..services.serializers import appt_dict
from ..utils import ApiError, auth_required, paginate, parse, utcnow

bp = Blueprint("appointments", __name__)
STATUSES = {"pending", "confirmed", "completed", "cancelled", "rejected"}


def _get(appt_id):
    a = db.session.get(Appointment, appt_id)
    if not a or not booking.can_access(g.user, a):  # 404 (not 403) so IDs can't be probed
        raise ApiError("Appointment not found", 404)
    return a


@bp.post("")
@auth_required("patient")
def create():
    d = parse(BookIn)
    return jsonify(appointment=appt_dict(booking.book(g.user, d.doctor_id, d.start, d.reason), g.user)), 201


@bp.get("")
@auth_required("patient", "doctor", "admin")
def list_mine():
    q = select(Appointment)
    if g.user.role == "patient":
        q = q.where(Appointment.patient_id == g.user.id)
    elif g.user.role == "doctor":
        q = q.where(Appointment.doctor_id == (g.user.doctor.id if g.user.doctor else -1))
    a = request.args
    if a.get("status"):
        if a["status"] not in STATUSES:
            raise ApiError("Unknown status", 422)
        q = q.where(Appointment.status == a["status"])
    scope = a.get("scope")
    if scope == "upcoming":
        q = q.where(Appointment.start_utc >= utcnow(), Appointment.status.in_(booking.ACTIVE)) \
             .order_by(Appointment.start_utc.asc())
    else:
        if scope == "past":
            q = q.where(Appointment.start_utc < utcnow())
        q = q.order_by(Appointment.start_utc.desc())
    for key, op in (("from", "ge"), ("to", "lt")):  # date range in clinic local days (doctor calendar/week view)
        if a.get(key):
            try:
                day = date.fromisoformat(a[key])
            except ValueError:
                raise ApiError(f"'{key}' must be YYYY-MM-DD", 422)
            if key == "to":
                day += timedelta(days=1)
            edge = booking.to_utc(datetime.combine(day, time.min))
            q = q.where(Appointment.start_utc >= edge if op == "ge" else Appointment.start_utc < edge)
    return jsonify(paginate(q, lambda x: appt_dict(x, g.user)))


@bp.get("/<int:appt_id>")
@auth_required("patient", "doctor", "admin")
def detail(appt_id):
    return jsonify(appointment=appt_dict(_get(appt_id), g.user))


@bp.put("/<int:appt_id>")
@auth_required("doctor", "admin")
def update_status(appt_id):
    d = parse(StatusIn)
    _get(appt_id)
    return jsonify(appointment=appt_dict(booking.set_status(appt_id, g.user, d.status), g.user))


@bp.post("/<int:appt_id>/reschedule")
@auth_required("patient", "admin")
def reschedule(appt_id):
    d = parse(RescheduleIn)
    _get(appt_id)
    return jsonify(appointment=appt_dict(booking.reschedule(appt_id, g.user, d.start), g.user))


@bp.post("/<int:appt_id>/cancel")
@auth_required("patient", "doctor", "admin")
def cancel(appt_id):
    d = parse(CancelIn)
    _get(appt_id)
    return jsonify(appointment=appt_dict(booking.cancel(appt_id, g.user, d.reason), g.user))
