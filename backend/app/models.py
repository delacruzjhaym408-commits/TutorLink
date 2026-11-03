import enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------- Mga pagpipilian (enums) ----------
class UserRole(str, enum.Enum):
    student = "student"
    parent = "parent"
    admin = "admin"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class BookingStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"


class DayOfWeek(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"


# ---------- Users at profiles ----------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    student_profile = relationship(
        "StudentProfile", back_populates="user", uselist=False
    )
    parent_profile = relationship(
        "ParentProfile", back_populates="user", uselist=False
    )
    tutor_profile = relationship(
        "TutorProfile", back_populates="user", uselist=False
    )
    bookings = relationship("Booking", back_populates="booked_by")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    school_name = Column(String(150), nullable=True)
    year_level = Column(String(50), nullable=True)
    contact_number = Column(String(30), nullable=True)

    user = relationship("User", back_populates="student_profile")


class ParentProfile(Base):
    __tablename__ = "parent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    contact_number = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)

    user = relationship("User", back_populates="parent_profile")


# ---------- Subjects ----------
class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    tutors = relationship(
        "TutorProfile", secondary="tutor_subjects", back_populates="subjects"
    )


# Pivot table: maraming tutor ang pwedeng magturo ng maraming subject
tutor_subjects = Table(
    "tutor_subjects",
    Base.metadata,
    Column(
        "tutor_profile_id",
        Integer,
        ForeignKey("tutor_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "subject_id",
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------- Tutors ----------
class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    qualifications = Column(Text, nullable=False)
    bio = Column(Text, nullable=True)
    hourly_rate = Column(Numeric(10, 2), nullable=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="tutor_profile")
    subjects = relationship(
        "Subject", secondary="tutor_subjects", back_populates="tutors"
    )
    availability = relationship(
        "TutorAvailability",
        back_populates="tutor_profile",
        cascade="all, delete-orphan",
    )
    applications = relationship("TutorApplication", back_populates="tutor_profile")
    bookings = relationship("Booking", back_populates="tutor_profile")


class TutorApplication(Base):
    __tablename__ = "tutor_applications"

    id = Column(Integer, primary_key=True, index=True)
    tutor_profile_id = Column(
        Integer,
        ForeignKey("tutor_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(
        Enum(ApplicationStatus), nullable=False, default=ApplicationStatus.pending
    )
    admin_remarks = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=False, server_default=func.now())
    reviewed_at = Column(DateTime, nullable=True)

    tutor_profile = relationship("TutorProfile", back_populates="applications")


class TutorAvailability(Base):
    __tablename__ = "tutor_availability"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_availability_time_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    tutor_profile_id = Column(
        Integer,
        ForeignKey("tutor_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    day_of_week = Column(Enum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    tutor_profile = relationship("TutorProfile", back_populates="availability")


# ---------- Bookings at reviews ----------
class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("end_time > start_time", name="ck_booking_time_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    booked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tutor_profile_id = Column(
        Integer, ForeignKey("tutor_profiles.id"), nullable=False
    )
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    session_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(
        Enum(BookingStatus), nullable=False, default=BookingStatus.pending
    )
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    booked_by = relationship("User", back_populates="bookings")
    tutor_profile = relationship("TutorProfile", back_populates="bookings")
    subject = relationship("Subject")
    review = relationship("Review", back_populates="booking", uselist=False)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating_range"),
    )

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    booking = relationship("Booking", back_populates="review")