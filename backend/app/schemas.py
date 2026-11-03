from datetime import datetime, time
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import DayOfWeek, User, UserRole


# ---------- Subjects at tutors ----------
class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None


class AvailabilityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: DayOfWeek
    start_time: time
    end_time: time


class TutorSummary(BaseModel):
    id: int
    full_name: str
    hourly_rate: float
    subjects: list[SubjectOut]


class TutorDetail(TutorSummary):
    qualifications: str
    bio: Optional[str] = None
    availability: list[AvailabilityOut]


# ---------- Users at login ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=150)
    # Estudyante o magulang lamang. Hindi pwedeng mag-register bilang admin.
    role: Literal["student", "parent"] = "student"

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Masyadong maikli ang pangalan")
        return value

    @field_validator("password")
    @classmethod
    def check_password_size(cls, value: str) -> str:
        # Hanggang 72 bytes lang ang kayang i-hash ng bcrypt
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Masyadong mahaba ang password")
        return value


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    is_approved_tutor: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


def user_to_out(user: User) -> UserOut:
    """Ginagawang UserOut ang User (walang password hash)."""
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_approved_tutor=bool(user.tutor_profile and user.tutor_profile.is_approved),
        created_at=user.created_at,
    )