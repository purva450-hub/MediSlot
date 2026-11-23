from flask import Blueprint, g, jsonify
from sqlalchemy import func, select, update

from ..extensions import db
from ..models import Notification
from ..services.booking import iso
from ..utils import ApiError, auth_required, paginate

bp = Blueprint("notifications", __name__)


def _n(n):
    return {"id": n.id, "type": n.type, "title": n.title, "message": n.message,
            "appointment_id": n.appointment_id, "is_read": n.is_read, "created_at": iso(n.created_at)}


@bp.get("")
@auth_required()
def list_notifications():
    q = select(Notification).where(Notification.user_id == g.user.id).order_by(Notification.created_at.desc(),
                                                                              Notification.id.desc())
    out = paginate(q, _n, default=20)
    out["unread_count"] = db.session.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == g.user.id, Notification.is_read.is_(False)))
    return jsonify(out)


@bp.post("/<int:nid>/read")
@auth_required()
def mark_read(nid):
    n = db.session.get(Notification, nid)
    if not n or n.user_id != g.user.id:
        raise ApiError("Notification not found", 404)
    n.is_read = True
    db.session.commit()
    return jsonify(notification=_n(n))


@bp.post("/read-all")
@auth_required()
def mark_all():
    db.session.execute(update(Notification).where(Notification.user_id == g.user.id,
                                                  Notification.is_read.is_(False)).values(is_read=True))
    db.session.commit()
    return jsonify(message="All notifications marked as read")
