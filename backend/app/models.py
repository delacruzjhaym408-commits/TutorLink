import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------- User Roles ----------
class UserRole(str, enum.Enum):
    student = "student"
    tutor = "tutor"
    admin = "admin"


# ---------- Users ----------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone_number = Column(String(30), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    description = Column(Text, nullable=True)
    description_picture = Column(String(500), nullable=True)
    gcash_number = Column(String(50), nullable=True)
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    posts = relationship(
        "TutorPost", back_populates="owner", cascade="all, delete-orphan"
    )
    sent_messages = relationship(
        "Message", foreign_keys="Message.sender_id", back_populates="sender"
    )


# ---------- Tutor Posts (CORE FEATURE) ----------
class TutorPost(Base):
    __tablename__ = "tutor_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    tutor_picture = Column(String(500), nullable=True)
    subject = Column(String(150), nullable=False)
    hourly_rate = Column(Numeric(10, 2), nullable=False)
    session_rate = Column(Numeric(10, 2), nullable=True)
    education_level = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    post_pictures = Column(Text, nullable=True)
    gcash_number = Column(String(50), nullable=True)
    rating = Column(Numeric(2, 1), nullable=False, default=5.0)
    status = Column(String(20), nullable=False, default="published")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    owner = relationship("User", back_populates="posts")


# ---------- Conversations & Messages ----------
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    participant1_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    participant2_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    participant1_last_read = Column(DateTime, nullable=True)
    participant2_last_read = Column(DateTime, nullable=True)

    is_deleted_by_p1 = Column(Boolean, default=False)
    is_deleted_by_p2 = Column(Boolean, default=False)

    participant1 = relationship("User", foreign_keys=[participant1_id])
    participant2 = relationship("User", foreign_keys=[participant2_id])
    messages = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    sender_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    # ---- POST REFERENCE (bagong dagdag) ----
    post_id = Column(
        Integer, ForeignKey("tutor_posts.id", ondelete="SET NULL"), nullable=True
    )
    post_subject = Column(String(150), nullable=True)
    post_picture = Column(String(500), nullable=True)
    # ----------------------------------------

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship(
        "User", foreign_keys=[sender_id], back_populates="sent_messages"
    )


# ---------- Lessons & Group Messages ----------
class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    gc_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    photo = Column(Text, nullable=True)
    gcash_number = Column(String(50), nullable=True)
    monthly_rate = Column(Numeric(10, 2), nullable=True)
    next_meeting_date = Column(String(50), nullable=True)
    next_meeting_time = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    tutor = relationship("User", foreign_keys=[tutor_id])
    messages = relationship("LessonMessage", back_populates="lesson", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="lesson", cascade="all, delete-orphan")


class LessonMessage(Base):
    __tablename__ = "lesson_messages"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    lesson = relationship("Lesson", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="enrolled")
    payment_status = Column(String(20), nullable=False, default="unpaid")
    payment_proof = Column(Text, nullable=True)
    payment_reference = Column(String(100), nullable=True)
    rejection_reason = Column(String(255), nullable=True)
    enrolled_at = Column(DateTime, nullable=False, server_default=func.now())
    last_read_at = Column(DateTime, nullable=True)

    lesson = relationship("Lesson", back_populates="enrollments")
    student = relationship("User", foreign_keys=[student_id])


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    reported_post_id = Column(Integer, ForeignKey("tutor_posts.id", ondelete="CASCADE"), nullable=True)
    reason = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id])
    reported_user = relationship("User", foreign_keys=[reported_user_id])
    reported_post = relationship("TutorPost")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    tutor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    tutor = relationship("User", foreign_keys=[tutor_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class AdminMessage(Base):
    __tablename__ = "admin_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])