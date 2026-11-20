from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, TutorAvailability, Lesson, Enrollment
from app.schemas import TutorAvailabilityCreate, TutorAvailabilityResponse

router = APIRouter(prefix="/calendar", tags=["Calendar"])


# 🔥 1. TUTOR: Kunin ang sariling availability
@router.get("/availability", response_model=List[TutorAvailabilityResponse])
def get_my_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(TutorAvailability).filter(
        TutorAvailability.tutor_id == current_user.id,
        TutorAvailability.is_active == True
    ).all()


# 🔥 2. STUDENT: Kunin ang availability ng specific tutor
@router.get("/availability/{tutor_id}", response_model=List[TutorAvailabilityResponse])
def get_tutor_availability(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(TutorAvailability).filter(
        TutorAvailability.tutor_id == tutor_id,
        TutorAvailability.is_active == True
    ).all()


# 🔥 3. TUTOR: Mag-save ng bagong schedule
@router.post("/availability", response_model=TutorAvailabilityResponse, status_code=status.HTTP_201_CREATED)
def add_availability(
    data: TutorAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    day_of_week = data.day_of_week
    if not day_of_week and data.specific_date:
        try:
            dt = datetime.strptime(data.specific_date, "%Y-%m-%d")
            day_of_week = dt.strftime("%A")
        except ValueError:
            pass

    new_avail = TutorAvailability(
        tutor_id=current_user.id,
        specific_date=data.specific_date,
        day_of_week=day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    db.add(new_avail)
    db.commit()
    db.refresh(new_avail)
    return new_avail


# 🔥 4. TUTOR: I-update ang schedule
@router.put("/availability/{id}", response_model=TutorAvailabilityResponse)
def update_availability(
    id: int,
    data: TutorAvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    avail = db.query(TutorAvailability).filter(
        TutorAvailability.id == id,
        TutorAvailability.tutor_id == current_user.id
    ).first()
    
    if not avail:
        raise HTTPException(status_code=404, detail="Availability not found")
        
    avail.specific_date = data.specific_date
    avail.start_time = data.start_time
    avail.end_time = data.end_time
    
    db.commit()
    db.refresh(avail)
    return avail


# 🔥 5. TUTOR: Mag-delete ng schedule
@router.delete("/availability/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    avail = db.query(TutorAvailability).filter(
        TutorAvailability.id == id,
        TutorAvailability.tutor_id == current_user.id
    ).first()
    
    if not avail:
        raise HTTPException(status_code=404, detail="Availability not found")
        
    db.delete(avail)
    db.commit()
    return None


# 🔥 6. Kunin ang mga BOOKED dates at COUNT
@router.get("/booked-dates/{tutor_id}")
def get_tutor_booked_dates(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models import Lesson, Enrollment, User
    
    booked_lessons = db.query(Lesson).filter(
        Lesson.tutor_id == tutor_id,
        Lesson.next_meeting_date.isnot(None)
    ).all()

    grouped_bookings = {}
    for lesson in booked_lessons:
        # Check if there's an active enrollment (pending or enrolled)
        enrollment = db.query(Enrollment).filter(
            Enrollment.lesson_id == lesson.id,
            Enrollment.status.in_(["enrolled", "pending_payment"])
        ).first()

        if not enrollment:
            continue

        date = lesson.next_meeting_date
        if date not in grouped_bookings:
            grouped_bookings[date] = {
                "date": date,
                "count": 0,
                "times": [],
                "details": []
            }
        
        grouped_bookings[date]["count"] += 1
        
        student = db.query(User).filter(User.id == enrollment.student_id).first()
        student_name = student.full_name if student else "Unknown Student"

        time_str = lesson.next_meeting_time or "TBA"
        
        grouped_bookings[date]["times"].append(time_str)
        grouped_bookings[date]["details"].append({
            "time": time_str,
            "student_name": student_name,
            "lesson_name": lesson.gc_name
        })

    return list(grouped_bookings.values())