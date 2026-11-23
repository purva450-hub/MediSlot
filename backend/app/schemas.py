import datetime as dt
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

PHONE = r"^\+?[0-9]{10,15}$"


def _strong(p):
    if not (any(c.isalpha() for c in p) and any(c.isdigit() for c in p)):
        raise ValueError("Password must contain at least one letter and one number")
    return p


class RegisterIn(BaseModel):  # patients only; role is never accepted from the client
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(pattern=PHONE)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    @model_validator(mode="after")
    def check(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        _strong(self.password)
        return self


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember_me: bool = False


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    _s = field_validator("password")(_strong)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    _s = field_validator("new_password")(_strong)


class ProfileIn(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    phone: Optional[str] = Field(None, pattern=PHONE)


class BookIn(BaseModel):
    doctor_id: int
    start: dt.datetime  # naive => clinic local time; offset-aware accepted
    reason: str = Field(min_length=3, max_length=500)


class RescheduleIn(BaseModel):
    start: dt.datetime


class CancelIn(BaseModel):
    reason: Optional[str] = Field(None, max_length=300)


class StatusIn(BaseModel):
    status: Literal["confirmed", "rejected", "completed"]


class DoctorIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(pattern=PHONE)
    password: str = Field(min_length=8, max_length=128)
    specialty_id: int
    qualification: str = Field(min_length=2, max_length=160)
    experience_years: int = Field(ge=0, le=70)
    consultation_fee: float = Field(ge=0, le=100000)
    clinic_name: str = Field(min_length=2, max_length=160)
    location: str = Field(min_length=2, max_length=120)
    address: str = Field("", max_length=255)
    about: str = Field("", max_length=3000)
    slot_minutes: int = Field(30, ge=10, le=120)


class DoctorUpdateIn(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    phone: Optional[str] = Field(None, pattern=PHONE)
    specialty_id: Optional[int] = None
    qualification: Optional[str] = Field(None, min_length=2, max_length=160)
    experience_years: Optional[int] = Field(None, ge=0, le=70)
    consultation_fee: Optional[float] = Field(None, ge=0, le=100000)
    clinic_name: Optional[str] = Field(None, min_length=2, max_length=160)
    location: Optional[str] = Field(None, min_length=2, max_length=120)
    address: Optional[str] = Field(None, max_length=255)
    about: Optional[str] = Field(None, max_length=3000)
    slot_minutes: Optional[int] = Field(None, ge=10, le=120)


class AvailabilityIn(BaseModel):
    doctor_id: Optional[int] = None  # required only when an admin edits
    weekday: int = Field(ge=0, le=6)
    start_time: dt.time
    end_time: dt.time
    break_start: Optional[dt.time] = None
    break_end: Optional[dt.time] = None

    @model_validator(mode="after")
    def check(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        if bool(self.break_start) != bool(self.break_end):
            raise ValueError("Provide both break_start and break_end")
        if self.break_start and not (self.start_time <= self.break_start < self.break_end <= self.end_time):
            raise ValueError("Break must sit inside working hours")
        return self


class UnavailabilityIn(BaseModel):
    doctor_id: Optional[int] = None
    date: dt.date
    reason: Optional[str] = Field(None, max_length=160)


class ApprovalIn(BaseModel):
    status: Literal["approved", "rejected", "pending"]


class ActiveIn(BaseModel):
    is_active: bool


class SpecialtyIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: Optional[str] = Field(None, max_length=255)


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=2000)
