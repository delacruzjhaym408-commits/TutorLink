from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models import BookingStatus


class BookingCreate(BaseModel):
    tutor_profile_id: int
    subject_id: int
    session_date: date
    start_time: time
    end_time: time
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("notes")
    @classmethod
    def clean_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def check_times(self):
        start = datetime.combine(self.session_date, self.start_time)
        end = datetime.combine(self.session_date, self.end_time)
        if end <= start:
            raise ValueError("The end time must be later than the start time")
        minutes = (end - start).total_seconds() / 60
        if minutes < 30:
            raise ValueError("A session must be at least 30 minutes long")
        if minutes > 240:
            raise ValueError("A session cannot be longer than 4 hours")
        return self


# Booking na nakikita ng nag-book (estudyante o magulang)
class BookingOut(BaseModel):
    id: int
    tutor_profile_id: int
    tutor_name: str
    subject_id: int
    subject_name: str
    session_date: date
    start_time: time
    end_time: time
    notes: Optional[str] = None
    status: BookingStatus
    created_at: datetime


# Booking request na nakikita ng tutor
class IncomingBookingOut(BaseModel):
    id: int
    student_name: str
    subject_name: str
    session_date: date
    start_time: time
    end_time: time
    notes: Optional[str] = None
    status: BookingStatus
    created_at: datetime