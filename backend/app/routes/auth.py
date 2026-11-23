import hashlib
import secrets
from datetime import timedelta

from flask import Blueprint, current_app, g, jsonify
from flask_jwt_extended import create_access_token, get_jwt
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db, limiter
from ..models import PasswordResetToken, RevokedToken, User
from ..schemas import (ChangePasswordIn, ForgotIn, LoginIn, ProfileIn, RegisterIn, ResetIn)
from ..services.email import email_enabled, send_email
from ..services.serializers import user_dict
from ..utils import ApiError, audit, auth_required, parse, utcnow

bp = Blueprint("auth", __name__)
_h = lambda t: hashlib.sha256(t.encode()).hexdigest()  # noqa: E731


def _token(user, remember=False):
    return create_access_token(identity=str(user.id), additional_claims={"role": user.role},
                               expires_delta=timedelta(days=30) if remember else None)


@bp.post("/register")
@limiter.limit("10 per hour")
def register():
    d = parse(RegisterIn)
    email = d.email.lower()
    if db.session.scalar(select(User.id).where(User.email == email)):
        raise ApiError("An account with this email already exists", 409)
    u = User(email=email, full_name=d.full_name.strip(), phone=d.phone, role="patient",  # never client-chosen
             password_hash=generate_password_hash(d.password))
    db.session.add(u)
    db.session.commit()
    return jsonify(access_token=_token(u), user=user_dict(u)), 201


@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    d = parse(LoginIn)
    u = db.session.scalar(select(User).where(User.email == d.email.lower()))
    if not u or not check_password_hash(u.password_hash, d.password):
        raise ApiError("Invalid email or password", 401)
    if not u.is_active:
        raise ApiError("This account has been deactivated", 403)
    audit(u.id, "auth.login")
    db.session.commit()
    return jsonify(access_token=_token(u, d.remember_me), user=user_dict(u))


@bp.post("/logout")
@auth_required()
def logout():
    jwt = get_jwt()
    db.session.add(RevokedToken(jti=jwt["jti"], expires_at=utcnow() + timedelta(days=31)))
    db.session.commit()
    return jsonify(message="Logged out")


@bp.get("/me")
@auth_required()
def me():
    return jsonify(user=user_dict(g.user))


@bp.put("/me")
@auth_required()
def update_me():
    d = parse(ProfileIn).model_dump(exclude_none=True)
    for k, v in d.items():
        setattr(g.user, k, v)
    db.session.commit()
    return jsonify(user=user_dict(g.user))


@bp.post("/change-password")
@limiter.limit("10 per hour")
@auth_required()
def change_password():
    d = parse(ChangePasswordIn)
    if not check_password_hash(g.user.password_hash, d.current_password):
        raise ApiError("Current password is incorrect", 403)
    g.user.password_hash = generate_password_hash(d.new_password)
    audit(g.user.id, "auth.change_password")
    db.session.commit()
    return jsonify(message="Password updated")


@bp.post("/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    d = parse(ForgotIn)
    u = db.session.scalar(select(User).where(User.email == d.email.lower(), User.is_active.is_(True)))
    body = {"message": "If an account with that email exists, a reset link has been prepared.",
            "email_delivery": "enabled" if email_enabled() else "not_configured"}
    if u:
        raw = secrets.token_urlsafe(32)
        db.session.add(PasswordResetToken(
            user_id=u.id, token_hash=_h(raw),
            expires_at=utcnow() + timedelta(minutes=current_app.config["RESET_TOKEN_MINUTES"])))
        db.session.commit()
        link = f"{current_app.config['FRONTEND_URL']}/reset-password?token={raw}"
        try:
            sent = send_email(u.email, "Reset your MediSlot password", f"Reset link (valid 30 min): {link}")
        except Exception:
            current_app.logger.exception("reset email failed")
            sent = False
        body["email_delivery"] = "sent" if sent else body["email_delivery"] if not email_enabled() else "failed"
        if not sent and current_app.config["APP_ENV"] == "development":
            body["dev_reset_link"] = link  # development only; never in production
    return jsonify(body)


@bp.post("/reset-password")
@limiter.limit("10 per hour")
def reset_password():
    d = parse(ResetIn)
    t = db.session.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == _h(d.token)))
    if not t or t.used_at or t.expires_at < utcnow():
        raise ApiError("This reset link is invalid or has expired", 400)
    user = db.session.get(User, t.user_id)
    user.password_hash = generate_password_hash(d.password)
    t.used_at = utcnow()
    audit(user.id, "auth.reset_password")
    db.session.commit()
    return jsonify(message="Password has been reset. You can now log in.")
