from .booking import iso


def user_dict(u):
    return {"id": u.id, "email": u.email, "role": u.role, "full_name": u.full_name, "phone": u.phone,
            "is_active": u.is_active, "created_at": iso(u.created_at),
            "doctor_id": u.doctor.id if u.doctor else None}


def doctor_dict(d, admin=False):
    out = {"id": d.id, "full_name": d.user.full_name,
           "specialty": {"id": d.specialty.id, "name": d.specialty.name},
           "qualification": d.qualification, "experience_years": d.experience_years,
           "consultation_fee": float(d.consultation_fee), "rating": float(d.rating),
           "clinic_name": d.clinic_name, "location": d.location, "address": d.address,
           "about": d.about, "photo_url": d.photo_url, "slot_minutes": d.slot_minutes,
           "approval_status": d.approval_status}
    if admin:
        out.update(email=d.user.email, phone=d.user.phone, is_active=d.user.is_active, user_id=d.user_id)
    return out


def appt_dict(a, viewer):
    d = a.doctor
    out = {"id": a.id, "booking_code": a.booking_code, "status": a.status,
           "start": iso(a.start_utc), "end": iso(a.end_utc), "reason": a.reason,
           "consultation_fee": float(d.consultation_fee),
           "doctor": {"id": d.id, "full_name": d.user.full_name, "specialty": d.specialty.name,
                      "clinic_name": d.clinic_name, "location": d.location, "address": d.address},
           "patient": {"id": a.patient.id, "full_name": a.patient.full_name},
           "cancelled_at": iso(a.cancelled_at), "cancel_reason": a.cancel_reason,
           "cancelled_by": a.cancelled_by.role if a.cancelled_by else None,
           "created_at": iso(a.created_at)}
    if viewer.role in ("doctor", "admin"):  # contact details only for the treating doctor / admin
        out["patient"].update(email=a.patient.email, phone=a.patient.phone)
    return out
