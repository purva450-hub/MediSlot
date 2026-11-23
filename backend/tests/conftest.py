from datetime import date, time, timedelta

import pytest
from sqlalchemy import select
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import Availability, Doctor, Specialty, User

PW = "Passw0rd123"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        cardio, derm = Specialty(name="Cardiology"), Specialty(name="Dermatology")
        db.session.add_all([cardio, derm])

        def user(email, role, name):
            u = User(email=email, role=role, full_name=name, phone="9876543210",
                     password_hash=generate_password_hash(PW))
            db.session.add(u)
            db.session.flush()
            return u

        user("admin@t.com", "admin", "Admin")
        user("p1@t.com", "patient", "Pat One")
        user("p2@t.com", "patient", "Pat Two")
        for email, sp, fee, loc in (("d1@t.com", cardio, 800, "Mumbai"), ("d2@t.com", derm, 1500, "Delhi")):
            u = user(email, "doctor", "Doc " + email[:2])
            d = Doctor(user_id=u.id, specialty_id=sp.id, qualification="MD", experience_years=10,
                       consultation_fee=fee, rating=4.5, clinic_name="Clinic", location=loc,
                       slot_minutes=30, approval_status="approved")
            db.session.add(d)
            db.session.flush()
            for wd in range(7):  # every weekday 09-17, break 13-14
                db.session.add(Availability(doctor_id=d.id, weekday=wd, start_time=time(9), end_time=time(17),
                                            break_start=time(13), break_end=time(14)))
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def login(client):
    def _login(email):
        r = client.post("/api/auth/login", json={"email": email, "password": PW})
        assert r.status_code == 200, r.get_json()
        return {"Authorization": f"Bearer {r.get_json()['access_token']}"}
    return _login


@pytest.fixture
def doctor_id(app):
    return db.session.scalar(select(Doctor.id).join(User).where(User.email == "d1@t.com"))


def at(hour, minute=0, days=3):
    d = date.today() + timedelta(days=days)
    return f"{d.isoformat()}T{hour:02d}:{minute:02d}:00"
