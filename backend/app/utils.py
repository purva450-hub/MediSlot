from datetime import datetime, timezone
from functools import wraps

from flask import g, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from pydantic import ValidationError
from sqlalchemy import func, select

from .extensions import db
from .models import AuditLog, Notification, User


class ApiError(Exception):
    def __init__(self, message, status=400, **extra):
        self.message, self.status, self.extra = message, status, extra


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse(model):
    """Validate the JSON body with a pydantic model (server-side validation)."""
    try:
        return model(**(request.get_json(silent=True) or {}))
    except TypeError:
        raise ApiError("Request body must be a JSON object", 400)
    except ValidationError as e:
        raise ApiError("Validation failed", 422, details=[
            {"field": ".".join(str(p) for p in x["loc"]), "message": x["msg"]} for x in e.errors()])


def auth_required(*roles):
    """JWT + role check, enforced on the server for every protected route."""
    def deco(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*a, **kw):
            user = db.session.get(User, int(get_jwt_identity()))
            if user is None or not user.is_active:
                raise ApiError("Account is unavailable", 401)
            if roles and user.role not in roles:
                raise ApiError("You do not have permission to perform this action", 403)
            g.user = user
            return fn(*a, **kw)
        return wrapper
    return deco


def notify(user_id, type_, title, message, appointment_id=None):
    db.session.add(Notification(user_id=user_id, type=type_, title=title,
                                message=message, appointment_id=appointment_id))


def audit(user_id, action, details=""):
    db.session.add(AuditLog(user_id=user_id, action=action, details=details[:500]))


def int_arg(name, default=None, lo=None, hi=None):
    raw = request.args.get(name)
    if raw in (None, ""):
        return default
    try:
        v = int(raw)
    except ValueError:
        raise ApiError(f"'{name}' must be an integer", 422)
    if lo is not None and v < lo:
        v = lo
    if hi is not None and v > hi:
        v = hi
    return v


def num_arg(name):
    raw = request.args.get(name)
    if raw in (None, ""):
        return None
    try:
        return float(raw)
    except ValueError:
        raise ApiError(f"'{name}' must be a number", 422)


def paginate(stmt, serializer, default=10):
    page, per = int_arg("page", 1, lo=1), int_arg("per_page", default, lo=1, hi=50)
    total = db.session.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    rows = db.session.scalars(stmt.limit(per).offset((page - 1) * per)).unique().all()
    return {"items": [serializer(r) for r in rows], "page": page, "per_page": per,
            "total": total, "pages": max(1, -(-total // per))}
