from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/calendar",
    tags=["Calendar & 1v1 Bookings"]
)

# ==========================================
# 1. TUTOR AVAILABILITY ENDPOINTS
# ==========================================

@router.post("/availability", response_model=schemas.TutorAvailabilityResponse)
def set_availability(
    availability: schemas.TutorAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Tutor sets their available day and time."""
    if current_user.role != models.UserRole.tutor:
        raise HTTPException(status_code=403, detail="Only tutors can set availability.")

    new_avail = models.TutorAvailability(
        tutor_id=current_user.id,
        day_of_week=availability.day_of_week,
        start_time=availability.start_time,
        end_time=availability.end_time
    )
    db.add(new_avail)
    db.commit()
    db.refresh(new_avail)
    return new_avail

@router.get("/availability/{tutor_id}", response_model=List[schemas.TutorAvailabilityResponse])
def get_tutor_availability(
    tutor_id: int,
    db: Session = Depends(get_db)
):
    """Students view a tutor's availability."""
    availabilities = db.query(models.TutorAvailability).filter(
        models.TutorAvailability.tutor_id == tutor_id,
        models.TutorAvailability.is_active == True
    ).all()
    return availabilities


# ==========================================
# 2. SESSION BOOKING ENDPOINTS
# ==========================================

@router.post("/book", response_model=schemas.SessionBookingResponse)
def book_session(
    booking: schemas.SessionBookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Student books a 1v1 session."""
    if current_user.role != models.UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can book sessions.")

    # Check conflict: Is the tutor already booked on this date and time?
    conflict = db.query(models.SessionBooking).filter(
        models.SessionBooking.tutor_id == booking.tutor_id,
        models.SessionBooking.session_date == booking.session_date,
        models.SessionBooking.start_time == booking.start_time,
        models.SessionBooking.status.in_(["pending", "ongoing", "completed"])
    ).first()

    if conflict:
        raise HTTPException(status_code=400, detail="Tutor is already booked for this time slot.")

    new_booking = models.SessionBooking(
        tutor_id=booking.tutor_id,
        student_id=current_user.id,
        subject=booking.subject,
        session_date=booking.session_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        total_amount=booking.total_amount,
        payment_proof=booking.payment_proof,
        payment_reference=booking.payment_reference,
        status="pending",
        payment_status="unpaid"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

@router.get("/my-sessions", response_model=List[schemas.SessionBookingResponse])
def get_my_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get sessions based on user role (Tutor = see their students, Student = see their tutors)."""
    if current_user.role == models.UserRole.tutor:
        sessions = db.query(models.SessionBooking).filter(
            models.SessionBooking.tutor_id == current_user.id
        ).all()
    else:
        sessions = db.query(models.SessionBooking).filter(
            models.SessionBooking.student_id == current_user.id
        ).all()
    
    return sessions

@router.patch("/session/{session_id}/status", response_model=schemas.SessionBookingResponse)
def update_session_status(
    session_id: int,
    status_update: schemas.SessionBookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Mark session as pending, ongoing, completed, or cancelled.

    SECURITY RULES:
    - Tutor can set: ongoing, completed, cancelled.
    - Tutor can set payment_status = paid/unpaid.
    - Student can set: cancelled ONLY.
    - Student CANNOT set ongoing, completed, or payment_status.
    """
    session = db.query(models.SessionBooking).filter(
        models.SessionBooking.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    is_tutor = (session.tutor_id == current_user.id)
    is_student = (session.student_id == current_user.id)

    if not is_tutor and not is_student:
        raise HTTPException(status_code=403, detail="Not authorized to update this session.")

    # Validate status value
    valid_statuses = ["pending", "ongoing", "completed", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")

    # 🔒 SECURITY: Student can only cancel their own session
    if is_student:
        if status_update.status != "cancelled":
            raise HTTPException(
                status_code=403,
                detail="Students can only cancel a session. Only the tutor can mark it as ongoing or completed."
            )
        if status_update.payment_status is not None:
            raise HTTPException(
                status_code=403,
                detail="Students cannot change the payment status. Only the tutor can verify payments."
            )

    # 🔒 SECURITY: Tutor can set everything (ongoing, completed, cancelled, payment_status)
    session.status = status_update.status

    # Only allow payment_status change if the user is a tutor
    if status_update.payment_status and is_tutor:
        session.payment_status = status_update.payment_status

    db.commit()
    db.refresh(session)
    return session

@router.get("/tutor-sessions")
def get_tutor_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all 1v1 sessions booked for this tutor."""
    if current_user.role != models.UserRole.tutor:
        raise HTTPException(status_code=403, detail="Only tutors can access this.")

    sessions = db.query(models.SessionBooking).filter(
        models.SessionBooking.tutor_id == current_user.id
    ).order_by(models.SessionBooking.session_date.desc(), models.SessionBooking.start_time.desc()).all()

    result = []
    for s in sessions:
        # Kunin ang pangalan at picture ng student
        student = db.query(models.User).filter(models.User.id == s.student_id).first()
        
        result.append({
            "id": s.id,
            "student_id": s.student_id,
            "student_name": student.full_name if student else "Unknown Student",
            "student_picture": student.profile_picture if student else None,
            "subject": s.subject,
            "session_date": s.session_date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "total_amount": float(s.total_amount) if s.total_amount else 0.0,
            "status": s.status,
            "payment_status": s.payment_status,
            "payment_proof": s.payment_proof,
            "payment_reference": s.payment_reference,
        })
    return result