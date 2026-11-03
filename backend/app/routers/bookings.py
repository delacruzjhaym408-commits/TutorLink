from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload

from app.booking_utils import (
    booking_to_incoming,
    booking_to_out,
    has_overlap,
    is_in_past,
    within_availability,
)
from app.database import get_db
from app.dependencies import get_current_user, require_approved_tutor
from app.models import Booking, BookingStatus, TutorProfile, User, UserRole
from app.schemas_booking import BookingCreate, BookingOut, IncomingBookingOut

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def require_client(current_user: User = Depends(get_current_user)) -> User:
    """Estudyante o magulang lamang ang pwedeng mag-book."""
    if current_user.role not in (UserRole.student, UserRole.parent):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Estudyante o magulang lamang ang pwedeng mag-book",
        )
    return current_user


def with_relations(query):
    return query.options(
        joinedload(Booking.booked_by),
        joinedload(Booking.subject),
        joinedload(Booking.tutor_profile).joinedload(TutorProfile.user),
    )


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(require_client),
    db: Session = Depends(get_db),
):
    # Aprubado at aktibong tutor lang ang pwedeng i-book
    tutor = (
        db.query(TutorProfile)
        .options(selectinload(TutorProfile.subjects), selectinload(TutorProfile.availability))
        .filter(
            TutorProfile.id == data.tutor_profile_id,
            TutorProfile.is_approved.is_(True),
            TutorProfile.user.has(User.is_active.is_(True)),
        )
        .first()
    )
    if tutor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tutor not found")

    if tutor.user_id == current_user.id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "You cannot book yourself"
        )

    if not any(subject.id == data.subject_id for subject in tutor.subjects):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "This tutor does not teach that subject",
        )

    if is_in_past(data.session_date, data.start_time):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "You cannot book a date or time that has already passed",
        )

    if not within_availability(tutor, data.session_date, data.start_time, data.end_time):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "The date and time are outside the tutor's availability",
        )

    if has_overlap(
        db,
        data.session_date,
        data.start_time,
        data.end_time,
        statuses=[BookingStatus.accepted],
        tutor_profile_id=tutor.id,
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The tutor already has another session at this time"
        )

    if has_overlap(
        db,
        data.session_date,
        data.start_time,
        data.end_time,
        statuses=[BookingStatus.pending, BookingStatus.accepted],
        booked_by_id=current_user.id,
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You already have an overlapping booking at this time"
        )

    booking = Booking(
        booked_by_id=current_user.id,
        tutor_profile_id=tutor.id,
        subject_id=data.subject_id,
        session_date=data.session_date,
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.notes,
        status=BookingStatus.pending,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.get("/me", response_model=list[BookingOut])
def list_my_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bookings = (
        with_relations(db.query(Booking))
        .filter(Booking.booked_by_id == current_user.id)
        .order_by(Booking.session_date.desc(), Booking.start_time.desc())
        .all()
    )
    return [booking_to_out(b) for b in bookings]


@router.get("/incoming", response_model=list[IncomingBookingOut])
def list_incoming_bookings(
    tutor: TutorProfile = Depends(require_approved_tutor),
    db: Session = Depends(get_db),
):
    bookings = (
        with_relations(db.query(Booking))
        .filter(Booking.tutor_profile_id == tutor.id)
        .order_by(Booking.session_date.desc(), Booking.start_time.desc())
        .all()
    )
    return [booking_to_incoming(b) for b in bookings]


def get_tutor_booking(db: Session, booking_id: int, tutor: TutorProfile) -> Booking:
    """Booking na pag-aari ng tutor na ito lamang. Ni-lock para hindi magsabay ang dalawang aksyon."""
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.tutor_profile_id == tutor.id)
        .with_for_update()
        .first()
    )
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")
    return booking


@router.post("/{booking_id}/accept", response_model=IncomingBookingOut)
def accept_booking(
    booking_id: int,
    tutor: TutorProfile = Depends(require_approved_tutor),
    db: Session = Depends(get_db),
):
    booking = get_tutor_booking(db, booking_id, tutor)

    if booking.status != BookingStatus.pending:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only pending bookings can be accepted"
        )
    if is_in_past(booking.session_date, booking.start_time):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The time of this session has already passed"
        )
    if has_overlap(
        db,
        booking.session_date,
        booking.start_time,
        booking.end_time,
        statuses=[BookingStatus.accepted],
        tutor_profile_id=tutor.id,
        exclude_id=booking.id,
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You have already accepted another session at this time"
        )

    booking.status = BookingStatus.accepted
    db.commit()
    db.refresh(booking)
    return booking_to_incoming(booking)


@router.post("/{booking_id}/reject", response_model=IncomingBookingOut)
def reject_booking(
    booking_id: int,
    tutor: TutorProfile = Depends(require_approved_tutor),
    db: Session = Depends(get_db),
):
    booking = get_tutor_booking(db, booking_id, tutor)

    if booking.status != BookingStatus.pending:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only pending bookings can be rejected"
        )

    booking.status = BookingStatus.rejected
    db.commit()
    db.refresh(booking)
    return booking_to_incoming(booking)


@router.post("/{booking_id}/complete", response_model=IncomingBookingOut)
def complete_booking(
    booking_id: int,
    tutor: TutorProfile = Depends(require_approved_tutor),
    db: Session = Depends(get_db),
):
    booking = get_tutor_booking(db, booking_id, tutor)

    if booking.status != BookingStatus.accepted:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only accepted bookings can be marked as completed",
        )
    if booking.session_date > date.today():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "The date of this session has not arrived yet",
        )

    booking.status = BookingStatus.completed
    db.commit()
    db.refresh(booking)
    return booking_to_incoming(booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ang nag-book lang ang makakakansela, at sa sarili niyang booking lang
    booking = (
        db.query(Booking)
        .filter(Booking.id == booking_id, Booking.booked_by_id == current_user.id)
        .with_for_update()
        .first()
    )
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found.")

    if booking.status not in (BookingStatus.pending, BookingStatus.accepted):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This booking can no longer be cancelled"
        )
    if is_in_past(booking.session_date, booking.start_time):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "The session time has expired."
        )

    booking.status = BookingStatus.cancelled
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)