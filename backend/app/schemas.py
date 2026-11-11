from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models import User, UserRole
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models import User, UserRole

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=150)
    phone_number: Optional[str] = Field(default=None, max_length=30)
    role: str = "student"

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2: raise ValueError("The name is too short")
        return value

    @field_validator("password")
    @classmethod
    def check_password_size(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72: raise ValueError("The password is too long")
        return value

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone_number: Optional[str] = Field(default=None, max_length=30)
    profile_picture: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None
    gcash_number: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = Field(default=None, min_length=8, max_length=72)

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    description: Optional[str] = None
    description_picture: Optional[str] = None
    gcash_number: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

def user_to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, email=user.email, full_name=user.full_name,
        phone_number=user.phone_number, profile_picture=user.profile_picture,
        description=user.description, description_picture=user.description_picture,
        gcash_number=user.gcash_number, role=user.role,
        is_active=user.is_active, created_at=user.created_at,
    )

class TutorPostCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=150)
    hourly_rate: float = Field(gt=0)
    session_rate: Optional[float] = Field(default=None, gt=0)
    education_level: str = Field(min_length=2, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2000)
    tutor_picture: Optional[str] = Field(default=None, max_length=500)
    post_pictures: Optional[str] = None
    gcash_number: Optional[str] = None

class TutorPostUpdate(BaseModel):
    subject: Optional[str] = Field(default=None, min_length=2, max_length=150)
    hourly_rate: Optional[float] = Field(default=None, gt=0)
    session_rate: Optional[float] = Field(default=None, gt=0)
    education_level: Optional[str] = Field(default=None, min_length=2, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2000)
    tutor_picture: Optional[str] = Field(default=None, max_length=500)
    post_pictures: Optional[str] = None
    gcash_number: Optional[str] = None

class TutorPostOut(BaseModel):
    id: int
    user_id: int
    tutor_name: Optional[str] = None
    tutor_picture: Optional[str] = None
    tutor_description: Optional[str] = None
    tutor_description_picture: Optional[str] = None
    subject: str
    hourly_rate: float
    session_rate: Optional[float] = None
    education_level: str
    description: Optional[str] = None
    post_pictures: Optional[str] = None
    gcash_number: Optional[str] = None
    rating: float
    status: str
    created_at: datetime
    updated_at: datetime
    learners_count: Optional[int] = 0
    total_reviews: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    participant_id: int
    initial_message: Optional[str] = Field(default=None, max_length=2000)
    post_id: Optional[int] = None
    post_subject: Optional[str] = Field(default=None, max_length=150)
    post_picture: Optional[str] = Field(default=None, max_length=500)

class ConversationOut(BaseModel):
    id: int
    participant1_id: int
    participant2_id: int
    other_user_name: Optional[str] = None
    other_user_picture: Optional[str] = None
    lastMessage: Optional[str] = None
    last_sender_id: Optional[int] = None #
    unread_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000000) # 🔥 10MB

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_picture: Optional[str] = None
    content: str
    created_at: datetime
    post_id: Optional[int] = None
    post_subject: Optional[str] = None
    post_picture: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class LessonCreate(BaseModel):
    gc_name: str = Field(min_length=2, max_length=150)
    description: Optional[str] = None
    photo: Optional[str] = None
    gcash_number: Optional[str] = None
    monthly_rate: Optional[float] = None
    next_meeting_date: Optional[str] = None
    next_meeting_time: Optional[str] = None

class LessonOut(BaseModel):
    id: int
    tutor_id: int
    gc_name: str
    description: Optional[str] = None
    photo: Optional[str] = None
    gcash_number: Optional[str] = None
    monthly_rate: Optional[float] = None
    next_meeting_date: Optional[str] = None
    next_meeting_time: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class LessonMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000000) # 🔥 10MB

class LessonMessageOut(BaseModel):
    id: int
    lesson_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_picture: Optional[str] = None
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EnrollmentCreate(BaseModel):
    lesson_id: int

class EnrollmentApplyRequest(BaseModel):
    lesson_id: int
    reference_number: str
    receipt_base64: str = Field(max_length=10000000) # 🔥 10MB

class EnrollmentOut(BaseModel):
    id: int
    student_id: int
    lesson_id: int
    status: str
    payment_status: Optional[str] = "unpaid"
    payment_proof: Optional[str] = None
    payment_reference: Optional[str] = None
    enrolled_at: datetime
    last_read_at: Optional[datetime] = None
    unread_count: Optional[int] = 0
    lesson: LessonOut
    model_config = ConfigDict(from_attributes=True)
    rejection_reason: Optional[str] = None

class LessonUpdate(BaseModel):
    gc_name: Optional[str] = None
    description: Optional[str] = None
    photo: Optional[str] = None
    gcash_number: Optional[str] = None
    monthly_rate: Optional[float] = None
    next_meeting_date: Optional[str] = None
    next_meeting_time: Optional[str] = None

class ReportCreate(BaseModel):
    reported_user_id: Optional[int] = None
    reported_post_id: Optional[int] = None
    reason: str = Field(min_length=2, max_length=255)

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reporter_name: Optional[str] = None
    reported_user_id: Optional[int] = None
    reported_user_name: Optional[str] = None
    reported_post_id: Optional[int] = None
    reported_post_subject: Optional[str] = None
    reason: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
    total_user_reports: Optional[int] = 0
    total_post_reports: Optional[int] = 0
    post_details: Optional[Dict[str, Any]] = None
    user_details: Optional[Dict[str, Any]] = None

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)

class ReviewOut(BaseModel):
    id: int
    tutor_id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class AdminMessageCreate(BaseModel):
    user_id: int
    message: str = Field(min_length=1, max_length=2000)

class AdminMessageOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)