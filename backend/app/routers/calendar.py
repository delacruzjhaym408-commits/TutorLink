from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, TutorAvailability
from app.schemas import TutorAvailabilityCreate, TutorAvailabilityResponse

router = APIRouter(prefix="/calendar", tags=["Calendar"])


# 🔥 1. TUTOR: Kunin ang sariling availability (Para sa Calendar Page)
@router.get("/availability", response_model=List[TutorAvailabilityResponse])
def get_my_availability(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(TutorAvailability).filter(
        TutorAvailability.tutor_id == current_user.id,
        TutorAvailability.is_active == True
    ).all()


# 🔥 2. STUDENT: Kunin ang availability ng specific tutor (Para sa Booking Modal)
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
    # AUTO-FILL DAY_OF_WEEK: Kung specific_date ang nilagay pero walang day_of_week,
    # awtomatikong i-convert ang petsa sa araw (e.g., "2026-11-27" -> "Friday")
    # para hindi mag-error ang MySQL na "day_of_week cannot be null".
    day_of_week = data.day_of_week
    if not day_of_week and data.specific_date:
        try:
            dt = datetime.strptime(data.specific_date, "%Y-%m-%d")
            day_of_week = dt.strftime("%A") # Returns "Monday", "Tuesday", etc.
        except ValueError:
            pass # Kung mali ang format, hayaan na lang (baka mag-error sa DB pero valid ang date)

    new_avail = TutorAvailability(
        tutor_id=current_user.id,
        specific_date=data.specific_date,
        day_of_week=day_of_week, # 🔥 IPAPASA NA NATIN PARA HINDI MAG-NULL
        start_time=data.start_time,
        end_time=data.end_time,
        notes=data.notes
    )
    db.add(new_avail)
    db.commit()
    db.refresh(new_avail)
    return new_avail


# 🔥 4. TUTOR: Mag-delete ng schedule
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

# 🔥 5. Kunin ang mga BOOKED dates at COUNT (Para sa Traffic Lights)
@router.get("/booked-dates/{tutor_id}")
def get_tutor_booked_dates(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.models import Lesson, Enrollment, User
    
    booked_lessons = db.query(Lesson).join(Enrollment).filter(
        Lesson.tutor_id == tutor_id,
        Enrollment.status == "enrolled", 
        Lesson.next_meeting_date.isnot(None)
    ).all()

    grouped_bookings = {}
    for lesson in booked_lessons:
        date = lesson.next_meeting_date
        if date not in grouped_bookings:
            grouped_bookings[date] = {
                "date": date,
                "count": 0,
                "times": [],
                "details": [] # 🔥 BAGONG LISTAHAN PARA SA PANGALAN AT ORAS
            }
        
        grouped_bookings[date]["count"] += 1
        
        # Kunin ang pangalan ng estudyante
        enrollment = db.query(Enrollment).filter(
            Enrollment.lesson_id == lesson.id,
            Enrollment.status == "enrolled"
        ).first()
        
        student = db.query(User).filter(User.id == enrollment.student_id).first() if enrollment else None
        student_name = student.full_name if student else "Unknown Student"

        time_str = lesson.next_meeting_time or "TBA"
        
        grouped_bookings[date]["times"].append(time_str)
        grouped_bookings[date]["details"].append({
            "time": time_str,
            "student_name": student_name,
            "lesson_name": lesson.gc_name
        })

    return list(grouped_bookings.values())