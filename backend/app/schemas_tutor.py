from datetime import datetime, time
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models import ApplicationStatus, DayOfWeek
from app.schemas import AvailabilityOut, SubjectOut


class AvailabilityIn(BaseModel):
    day_of_week: DayOfWeek
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def check_order(self):
        if self.end_time <= self.start_time:
            raise ValueError("The end time must be later than the start time")
        return self


class TutorProfileIn(BaseModel):
    """Ginagamit sa pag-apply bilang tutor at sa pag-edit ng tutor profile."""

    qualifications: str = Field(min_length=10, max_length=2000)
    bio: Optional[str] = Field(default=None, max_length=2000)
    hourly_rate: Decimal = Field(ge=50, le=10000, max_digits=10, decimal_places=2)
    subject_ids: list[int] = Field(min_length=1, max_length=10)
    availability: list[AvailabilityIn] = Field(min_length=1, max_length=21)

    @field_validator("qualifications")
    @classmethod
    def clean_qualifications(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise ValueError("The qualifications are too short")
        return value

    @field_validator("bio")
    @classmethod
    def clean_bio(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("subject_ids")
    @classmethod
    def unique_subjects(cls, value: list[int]) -> list[int]:
        if len(set(value)) != len(value):
            raise ValueError("A subject was repeated")
        return value

    @model_validator(mode="after")
    def check_overlaps(self):
        by_day: dict[DayOfWeek, list[AvailabilityIn]] = {}
        for slot in self.availability:
            by_day.setdefault(slot.day_of_week, []).append(slot)
        for slots in by_day.values():
            slots.sort(key=lambda s: s.start_time)
            for previous, current in zip(slots, slots[1:]):
                if current.start_time < previous.end_time:
                    raise ValueError(
                        "Availability times overlap on the same day"
                    )
        return self


class RejectIn(BaseModel):
    remarks: str = Field(min_length=3, max_length=1000)

    @field_validator("remarks")
    @classmethod
    def clean_remarks(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Enter a reason for the rejection")
        return value


class TutorApplicationOut(BaseModel):
    id: int
    status: ApplicationStatus
    qualifications: str
    bio: Optional[str] = None
    hourly_rate: float
    subjects: list[SubjectOut]
    availability: list[AvailabilityOut]
    admin_remarks: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None


class AdminApplicationOut(TutorApplicationOut):
    applicant_name: str
    applicant_email: str


class AdminStats(BaseModel):
    total_users: int
    approved_tutors: int
    pending_applications: int
    total_bookings: int