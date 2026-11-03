from datetime import date, datetime, time
from typing import Optional, Sequence

from sqlalchemy.orm import Session

from app.models import Booking, BookingStatus, DayOfWeek, TutorProfile
from app.schemas_booking import BookingOut, IncomingBookingOut

DAYS = list(DayOfWeek)  # monday, tuesday, ... sunday


def weekday_of(value: date) -> DayOfWeek:
    return DAYS[value.weekday()]  # Lunes = 0


def is_in_past(session_date: date, start_time: time) -> bool:
    return datetime.combine(session_date, start_time) <= datetime.now()


def within_availability(
    tutor: TutorProfile, session_date: date, start_time: time, end_time: time
) -> bool:
    """Does it fall within one of the tutor's available time slots for that day?"""
    day = weekday_of(session_date)
    return any(
        slot.day_of_week == day
        and slot.start_time <= start_time
        and end_time <= slot.end_time
        for slot in tutor.availability
    )


def has_overlap(
    db: Session,
    session_date: date,
    start_time: time,
    end_time: time,
    statuses: Sequence[BookingStatus],
    tutor_profile_id: Optional[int] = None,
    booked_by_id: Optional[int] = None,
    exclude_id: Optional[int] = None,
) -> bool:
    """Is there another booking that overlaps with this time slot?"""
    query = db.query(Booking.id).filter(
        Booking.session_date == session_date,
        Booking.status.in_(list(statuses)),
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )
    if tutor_profile_id is not None:
        query = query.filter(Booking.tutor_profile_id == tutor_profile_id)
    if booked_by_id is not None:
        query = query.filter(Booking.booked_by_id == booked_by_id)
    if exclude_id is not None:
        query = query.filter(Booking.id != exclude_id)
    return query.first() is not None


def booking_to_out(booking: Booking) -> BookingOut:
    return BookingOut(
        id=booking.id,
        tutor_profile_id=booking.tutor_profile_id,
        tutor_name=booking.tutor_profile.user.full_name,
        subject_id=booking.subject_id,
        subject_name=booking.subject.name,
        session_date=booking.session_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        notes=booking.notes,
        status=booking.status,
        created_at=booking.created_at,
    )


def booking_to_incoming(booking: Booking) -> IncomingBookingOut:
    return IncomingBookingOut(
        id=booking.id,
        student_name=booking.booked_by.full_name,
        subject_name=booking.subject.name,
        session_date=booking.session_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        notes=booking.notes,
        status=booking.status,
        created_at=booking.created_at,
    )