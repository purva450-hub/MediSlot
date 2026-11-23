from flask import Blueprint, jsonify

from ..extensions import db, limiter
from ..models import ContactMessage
from ..schemas import ContactIn
from ..utils import parse

bp = Blueprint("contact", __name__)


@bp.post("")
@limiter.limit("5 per hour")
def send():
    d = parse(ContactIn)
    db.session.add(ContactMessage(name=d.name.strip(), email=d.email.lower(), subject=d.subject.strip(), message=d.message.strip()))
    db.session.commit()
    return jsonify(message="Thanks, your message was received."), 201
