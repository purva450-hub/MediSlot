"""Load demo data:  DEMO_PASSWORD='...' python seed.py [--reset]
The demo password comes from the environment only (min 8 chars) - nothing is hardcoded."""
import os
import random
import sys
from datetime import date, time, timedelta

from dotenv import load_dotenv
from sqlalchemy import select
from werkzeug.security import generate_password_hash

load_dotenv()
from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import (Appointment, Availability, Doctor, Notification, Specialty,  # noqa: E402
                        Unavailability, User)
from app.services.booking import ACTIVE, day_slots, lock_key, to_utc  # noqa: E402
from app.utils import utcnow  # noqa: E402

SPECS = ["Cardiology", "Dermatology", "Neurology", "Pediatrics", "Orthopedics", "Dentistry",
         "General Medicine", "Gynecology"]
# (name, specialty index, qualification, years, fee, rating, city) - all fictional
DOCTORS = [
    ("Aarav Mehta", 0, "MBBS, MD (Cardiology)", 14, 900, 4.8, "Mumbai"),
    ("Isha Kapoor", 1, "MBBS, MD (Dermatology)", 9, 700, 4.6, "Delhi"),
    ("Rohan Iyer", 2, "MBBS, DM (Neurology)", 17, 1200, 4.9, "Bengaluru"),
    ("Neha Sharma", 3, "MBBS, DCH", 8, 600, 4.5, "Pune"),
    ("Vikram Rao", 4, "MBBS, MS (Orthopaedics)", 12, 850, 4.4, "Hyderabad"),
    ("Ananya Das", 5, "BDS, MDS", 6, 500, 4.3, "Mumbai"),
    ("Karan Malhotra", 6, "MBBS, MD (Medicine)", 11, 400, 4.2, "Delhi"),
    ("Meera Nair", 7, "MBBS, MS (OBG)", 15, 800, 4.7, "Bengaluru"),
    ("Siddharth Joshi", 0, "MBBS, DM (Cardiology)", 20, 1500, 4.9, "Pune"),
    ("Priya Menon", 1, "MBBS, DDVL", 5, 550, 4.1, "Hyderabad"),
    ("Arjun Bhatt", 4, "MBBS, DNB (Ortho)", 10, 750, 4.5, "Mumbai"),
    ("Kavya Reddy", 6, "MBBS, MD", 7, 450, 4.0, "Bengaluru"),
]
FIRST = ["Aditi", "Rahul", "Sneha", "Amit", "Pooja", "Nikhil", "Divya", "Manish", "Riya", "Sahil",
         "Tanvi", "Yash", "Kritika", "Varun", "Simran", "Harsh", "Naina", "Dev", "Ritu", "Om"]
REASONS = ["Chest discomfort on exertion", "Recurring skin rash", "Frequent headaches", "Child fever and cough",
           "Knee pain after running", "Tooth sensitivity", "Routine health check-up", "Follow-up consultation"]


def main():
    pw = os.environ.get("DEMO_PASSWORD", "")
    if len(pw) < 8:
        sys.exit("Set DEMO_PASSWORD (min 8 chars) in the environment to create demo accounts.")
    app = create_app()
    if app.config["APP_ENV"] == "production":
        sys.exit("Refusing to seed demo data when APP_ENV=production.")
    with app.app_context():
        if "--reset" in sys.argv:
            db.drop_all()
        db.create_all()
        if db.session.scalar(select(User.id)):
            sys.exit("Database already has data. Use --reset to wipe and reseed.")
        h, rng = generate_password_hash(pw), random.Random(42)

        specs = [Specialty(name=n, description=f"{n} care and consultation") for n in SPECS]
        db.session.add_all(specs)
        db.session.add(User(email="admin@medislot.demo", full_name="Demo Admin", role="admin",
                            phone="9000000000", password_hash=h))
        doctors = []
        for i, (name, si, qual, yrs, fee, rating, city) in enumerate(DOCTORS, 1):
            email = "doctor@medislot.demo" if i == 1 else f"doctor{i}@medislot.demo"
            u = User(email=email, full_name=name, role="doctor", phone=f"98{i:08d}", password_hash=h)
            db.session.add(u)
            db.session.flush()
            d = Doctor(user_id=u.id, specialty_id=specs[si].id, qualification=qual, experience_years=yrs,
                       consultation_fee=fee, rating=rating, clinic_name=f"{city} {SPECS[si]} Centre (demo)",
                       location=city, address=f"{10 + i} Demo Road, {city}", slot_minutes=rng.choice([20, 30]),
                       about=f"Dr. {name} is a fictional demo doctor specialising in {SPECS[si]}.",
                       approval_status="approved")
            db.session.add(d)
            db.session.flush()
            days = rng.choice([[0, 1, 2, 3, 4], [0, 2, 4, 5], [1, 3, 5], [0, 1, 2, 3, 4, 5]])
            for wd in days:
                db.session.add(Availability(doctor_id=d.id, weekday=wd, start_time=time(9), end_time=time(17),
                                            break_start=time(13), break_end=time(14)))
            db.session.add(Unavailability(doctor_id=d.id, date=date.today() + timedelta(days=rng.randint(5, 20)),
                                          reason="Conference (demo)"))
            doctors.append(d)
        patients = []
        for i in range(1, 21):
            p = User(email="patient@medislot.demo" if i == 1 else f"patient{i}@medislot.demo",
                     full_name=f"{FIRST[i - 1]} {rng.choice(['Verma', 'Singh', 'Patel', 'Khan', 'Gupta'])}",
                     role="patient", phone=f"97{i:08d}", password_hash=h)
            db.session.add(p)
            patients.append(p)
        db.session.flush()

        made, tries, used = 0, 0, set()
        while made < 32 and tries < 3000:
            tries += 1
            doc, day = rng.choice(doctors), date.today() + timedelta(days=rng.randint(-20, 14))
            slots = day_slots(doc, day)
            if not slots:
                continue
            start = to_utc(rng.choice(slots))
            if (doc.id, start) in used:
                continue
            used.add((doc.id, start))
            past = start < utcnow()
            status = (rng.choices(["completed", "cancelled"], [7, 3]) if past
                      else rng.choices(["pending", "confirmed", "cancelled"], [3, 5, 2]))[0]
            patient = rng.choice(patients)
            a = Appointment(booking_code=f"MS-{rng.getrandbits(32):08X}", patient_id=patient.id, doctor_id=doc.id,
                            start_utc=start, end_utc=start + timedelta(minutes=doc.slot_minutes),
                            reason=rng.choice(REASONS), status=status,
                            slot_lock=lock_key(doc.id, start) if status in ACTIVE else None)
            if status == "cancelled":
                a.cancelled_by_id, a.cancelled_at, a.cancel_reason = patient.id, utcnow(), "Change of plans (demo)"
            db.session.add(a)
            made += 1
        db.session.flush()
        for u in (patients[0], doctors[0].user):
            db.session.add(Notification(user_id=u.id, type="info", title="Welcome to MediSlot (demo)",
                                        message="This account contains fictional demo data."))
        db.session.commit()
        print(f"Seeded {len(SPECS)} specialties, {len(doctors)} doctors, {len(patients)} patients, {made} appointments.")
        print("Logins: admin@medislot.demo | doctor@medislot.demo | patient@medislot.demo  (password = DEMO_PASSWORD)")


if __name__ == "__main__":
    main()
