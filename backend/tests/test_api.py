import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Appointment
from app.services.booking import lock_key
from app.utils import utcnow
from conftest import PW, at


def book(client, h, doctor_id, start, reason="Check-up"):
    return client.post("/api/appointments", headers=h, json={"doctor_id": doctor_id, "start": start, "reason": reason})


# ---------- auth ----------
def test_register_login_me(client):
    body = {"full_name": "New Patient", "email": "New@T.com", "phone": "9123456780",
            "password": "Secret123", "confirm_password": "Secret123"}
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 201 and r.get_json()["user"]["role"] == "patient"
    assert client.post("/api/auth/register", json=body).status_code == 409
    tok = client.post("/api/auth/login", json={"email": "new@t.com", "password": "Secret123"}).get_json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200 and me.get_json()["user"]["email"] == "new@t.com"


def test_register_validation_and_no_admin_signup(client):
    bad = client.post("/api/auth/register", json={"full_name": "X", "email": "nope", "phone": "1",
                                                  "password": "short", "confirm_password": "x"})
    assert bad.status_code == 422 and bad.get_json()["details"]
    ok = client.post("/api/auth/register", json={"full_name": "Sneaky", "email": "s@t.com", "phone": "9123456780",
                                                 "password": "Secret123", "confirm_password": "Secret123",
                                                 "role": "admin"})
    assert ok.get_json()["user"]["role"] == "patient"


def test_login_failure_and_logout_revokes_token(client, login):
    assert client.post("/api/auth/login", json={"email": "p1@t.com", "password": "wrong"}).status_code == 401
    h = login("p1@t.com")
    assert client.post("/api/auth/logout", headers=h).status_code == 200
    assert client.get("/api/auth/me", headers=h).status_code == 401


def test_password_reset_flow(client):
    r = client.post("/api/auth/forgot-password", json={"email": "p1@t.com"})
    assert r.status_code == 200 and r.get_json()["email_delivery"] == "not_configured"
    assert client.post("/api/auth/reset-password", json={"token": "x" * 20, "password": "Another123"}).status_code == 400


# ---------- authorization ----------
def test_role_based_access(client, login):
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/dashboard", headers=login("p1@t.com")).status_code == 403
    assert client.get("/api/admin/dashboard", headers=login("d1@t.com")).status_code == 403
    assert client.get("/api/admin/dashboard", headers=login("admin@t.com")).status_code == 200


# ---------- doctors ----------
def test_doctor_search_and_filters(client):
    assert client.get("/api/doctors").get_json()["total"] == 2
    assert client.get("/api/doctors?q=cardio").get_json()["total"] == 1
    r = client.get("/api/doctors?specialty=Dermatology&location=delhi&max_fee=2000&min_rating=4").get_json()
    assert r["total"] == 1 and r["items"][0]["consultation_fee"] == 1500
    assert client.get("/api/doctors?max_fee=100").get_json()["total"] == 0
    assert client.get(f"/api/doctors?date={at(10)[:10]}&sort=fee_desc").get_json()["items"][0]["consultation_fee"] == 1500
    assert client.get("/api/doctors?min_fee=abc").status_code == 422


def test_doctor_profile_and_slots(client, doctor_id):
    assert client.get(f"/api/doctors/{doctor_id}").get_json()["doctor"]["id"] == doctor_id
    assert client.get("/api/doctors/9999").status_code == 404
    slots = client.get(f"/api/doctors/{doctor_id}/availability?date={at(10)[:10]}").get_json()["slots"]
    times = [s["time"] for s in slots]
    assert "09:00" in times and "13:00" not in times and "16:30" in times and "17:00" not in times


# ---------- booking ----------
def test_book_and_confirmation_data(client, login, doctor_id):
    r = book(client, login("p1@t.com"), doctor_id, at(10))
    a = r.get_json()["appointment"]
    assert r.status_code == 201 and a["status"] == "pending" and a["booking_code"].startswith("MS-")
    assert a["doctor"]["clinic_name"] and "phone" not in a["patient"]  # patient sees no extra contact data


def test_double_booking_only_one_succeeds(client, login, doctor_id):
    r1 = book(client, login("p1@t.com"), doctor_id, at(10))
    r2 = book(client, login("p2@t.com"), doctor_id, at(10))
    assert (r1.status_code, r2.status_code) == (201, 409)
    assert "no longer available" in r2.get_json()["error"]


def test_database_rejects_duplicate_slot_lock(app, doctor_id):
    """Even if app logic were bypassed, the UNIQUE slot_lock blocks a second active booking."""
    from datetime import timedelta
    start = utcnow() + timedelta(days=5)
    for code in ("A1", "B2"):
        db.session.add(Appointment(booking_code=code, patient_id=2, doctor_id=doctor_id, start_utc=start,
                                   end_utc=start + timedelta(minutes=30), reason="x", slot_lock=lock_key(doctor_id, start)))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


@pytest.mark.parametrize("start", [at(13, 0), at(20, 0), at(10, 0, days=-1), at(10, 15)])
def test_invalid_slots_rejected(client, login, doctor_id, start):  # break, after hours, past, off-grid
    assert book(client, login("p1@t.com"), doctor_id, start).status_code == 422


def test_only_patients_can_book(client, login, doctor_id):
    assert book(client, login("d1@t.com"), doctor_id, at(10)).status_code == 403


def test_patient_cannot_double_book_self_overlap(client, login, doctor_id):
    h = login("p1@t.com")
    assert book(client, h, doctor_id, at(10)).status_code == 201
    other = client.get("/api/doctors").get_json()["items"][1]["id"]
    assert book(client, h, other, at(10)).status_code == 409


# ---------- reschedule / cancel ----------
def test_reschedule_releases_old_slot(client, login, doctor_id):
    h1, h2 = login("p1@t.com"), login("p2@t.com")
    aid = book(client, h1, doctor_id, at(10)).get_json()["appointment"]["id"]
    r = client.post(f"/api/appointments/{aid}/reschedule", headers=h1, json={"start": at(11)})
    assert r.status_code == 200 and r.get_json()["appointment"]["start"].startswith(at(11)[:16])
    assert book(client, h2, doctor_id, at(10)).status_code == 201  # old slot free again
    assert client.post(f"/api/appointments/{aid}/reschedule", headers=h1, json={"start": at(10)}).status_code == 409


def test_cancel_releases_slot_and_records_actor(client, login, doctor_id):
    h1, h2 = login("p1@t.com"), login("p2@t.com")
    aid = book(client, h1, doctor_id, at(10)).get_json()["appointment"]["id"]
    r = client.post(f"/api/appointments/{aid}/cancel", headers=h1, json={"reason": "Busy"})
    a = r.get_json()["appointment"]
    assert a["status"] == "cancelled" and a["cancelled_by"] == "patient" and a["cancelled_at"]
    assert book(client, h2, doctor_id, at(10)).status_code == 201
    assert client.post(f"/api/appointments/{aid}/cancel", headers=h1, json={}).status_code == 409


def test_cancellation_window_rule(app, client, login, doctor_id):
    h = login("p1@t.com")
    aid = book(client, h, doctor_id, at(10)).get_json()["appointment"]["id"]
    app.config["CANCEL_MIN_HOURS"] = 24 * 30
    assert client.post(f"/api/appointments/{aid}/cancel", headers=h, json={}).status_code == 409
    assert client.post(f"/api/appointments/{aid}/cancel", headers=login("d1@t.com"), json={}).status_code == 200


def test_other_users_cannot_access_appointment(client, login, doctor_id):
    aid = book(client, login("p1@t.com"), doctor_id, at(10)).get_json()["appointment"]["id"]
    for who in ("p2@t.com", "d2@t.com"):
        h = login(who)
        assert client.get(f"/api/appointments/{aid}", headers=h).status_code == 404
        assert client.post(f"/api/appointments/{aid}/cancel", headers=h, json={}).status_code == 404
    assert client.get(f"/api/appointments/{aid}", headers=login("d1@t.com")).get_json()["appointment"]["patient"]["phone"]


def test_doctor_confirms_and_notifications(client, login, doctor_id):
    aid = book(client, login("p1@t.com"), doctor_id, at(10)).get_json()["appointment"]["id"]
    d = login("d1@t.com")
    assert client.put(f"/api/appointments/{aid}", headers=d, json={"status": "completed"}).status_code == 409
    assert client.put(f"/api/appointments/{aid}", headers=d, json={"status": "confirmed"}).status_code == 200
    assert client.put(f"/api/appointments/{aid}", headers=login("p1@t.com"), json={"status": "confirmed"}).status_code == 403
    n = client.get("/api/notifications", headers=login("p1@t.com")).get_json()
    assert n["unread_count"] >= 2
    assert client.post("/api/notifications/read-all", headers=login("p1@t.com")).status_code == 200
    assert client.get("/api/notifications", headers=login("p1@t.com")).get_json()["unread_count"] == 0


# ---------- availability ----------
def test_availability_change_blocked_when_it_orphans_appointments(client, login, doctor_id):
    aid = book(client, login("p1@t.com"), doctor_id, at(10)).get_json()["appointment"]["id"]
    d = login("d1@t.com")
    booked_wd = __import__("datetime").date.fromisoformat(at(10)[:10]).weekday()
    rule = next(r for r in client.get(f"/api/doctors/{doctor_id}/availability").get_json()["weekly"]
                if r["weekday"] == booked_wd)
    res = client.delete(f"/api/availability/{rule['id']}", headers=d)
    assert res.status_code == 409 and res.get_json()["conflicts"][0]["id"] == aid
    day_off = client.post("/api/availability/unavailable", headers=d, json={"date": at(10)[:10]})
    assert day_off.status_code == 409
    client.post(f"/api/appointments/{aid}/cancel", headers=d, json={})
    assert client.delete(f"/api/availability/{rule['id']}", headers=d).status_code == 204


def test_doctor_cannot_edit_other_doctors_schedule(client, login, doctor_id):
    rid = client.get(f"/api/doctors/{doctor_id}/availability").get_json()["weekly"][0]["id"]
    assert client.delete(f"/api/availability/{rid}", headers=login("d2@t.com")).status_code == 403
    assert client.delete(f"/api/availability/{rid}", headers=login("p1@t.com")).status_code == 403


# ---------- admin ----------
def test_admin_operations(client, login):
    a = login("admin@t.com")
    assert client.get("/api/admin/users?role=patient", headers=a).get_json()["total"] == 2
    uid = client.get("/api/admin/users?q=p2@t.com", headers=a).get_json()["items"][0]["id"]
    assert client.put(f"/api/admin/users/{uid}", headers=a, json={"is_active": False}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "p2@t.com", "password": PW}).status_code == 403
    s = client.post("/api/admin/specialties", headers=a, json={"name": "Neurology"})
    assert s.status_code == 201
    assert client.post("/api/admin/specialties", headers=a, json={"name": "neurology"}).status_code == 409
    cardio = next(x for x in client.get("/api/admin/specialties", headers=a).get_json()["items"] if x["name"] == "Cardiology")
    assert client.delete(f"/api/admin/specialties/{cardio['id']}", headers=a).status_code == 409
    assert client.delete(f"/api/admin/specialties/{s.get_json()['specialty']['id']}", headers=a).status_code == 204
    dash = client.get("/api/admin/dashboard", headers=a).get_json()
    assert dash["totals"]["patients"] == 2 and dash["totals"]["doctors"] == 2


def test_admin_creates_and_approves_doctor(client, login):
    a = login("admin@t.com")
    sid = client.get("/api/specialties").get_json()["items"][0]["id"]
    body = {"full_name": "New Doc", "email": "nd@t.com", "phone": "9123456789", "password": "Secret123",
            "specialty_id": sid, "qualification": "MBBS", "experience_years": 3, "consultation_fee": 500,
            "clinic_name": "C", "location": "Pune"}
    r = client.post("/api/doctors", headers=a, json=body)
    assert r.status_code == 201
    did = r.get_json()["doctor"]["id"]
    assert client.put(f"/api/admin/doctors/{did}/approval", headers=a, json={"status": "rejected"}).status_code == 200
    assert client.get(f"/api/doctors/{did}").status_code == 404  # rejected doctors are hidden publicly
    assert client.post("/api/doctors", headers=login("p1@t.com"), json=body).status_code == 403


def test_admin_doctor_detail_and_specialty_filter(client, login, doctor_id):
    a = login("admin@t.com")
    assert client.get(f"/api/admin/doctors/{doctor_id}", headers=a).get_json()["doctor"]["email"] == "d1@t.com"
    assert client.get("/api/admin/doctors/9999", headers=a).status_code == 404
    sid = client.get(f"/api/doctors/{doctor_id}").get_json()["doctor"]["specialty"]["id"]
    assert client.get(f"/api/admin/doctors?specialty_id={sid}", headers=a).get_json()["total"] == 1
    assert client.get(f"/api/admin/doctors/{doctor_id}", headers=login("d1@t.com")).status_code == 403


def test_contact_form_validates_and_stores(client):
    from app.models import ContactMessage
    ok = client.post("/api/contact", json={"name": "Ann", "email": "a@b.com", "subject": "Hello there", "message": "I would like to know more."})
    assert ok.status_code == 201
    assert client.post("/api/contact", json={"name": "A", "email": "x", "subject": "", "message": "short"}).status_code == 422
    assert db.session.scalar(select(func.count()).select_from(ContactMessage)) == 1
