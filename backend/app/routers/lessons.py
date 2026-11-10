from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import or_
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Lesson, Enrollment, LessonMessage, User, Conversation, Message
from app.schemas import (
    LessonCreate, LessonOut, EnrollmentCreate, EnrollmentOut,
    LessonMessageCreate, LessonMessageOut, LessonUpdate, EnrollmentApplyRequest
)
from app.websocket import manager

router = APIRouter(tags=["Lessons"])


# ============================================================
# LESSON CRUD
# ============================================================

@router.post("/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def create_lesson(
    data: LessonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = Lesson(
        tutor_id=current_user.id,
        gc_name=data.gc_name,
        description=data.description,
        photo=data.photo,
        gcash_number=data.gcash_number,
        monthly_rate=data.monthly_rate,
        next_meeting_date=data.next_meeting_date,
        next_meeting_time=data.next_meeting_time,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    enrollment = Enrollment(
        student_id=current_user.id,
        lesson_id=lesson.id,
        status="tutor",
        payment_status="paid",
    )
    db.add(enrollment)
    db.commit()
    return lesson


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: int,
    data: LessonUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can edit this group")

    if data.gc_name is not None:
        lesson.gc_name = data.gc_name
    if data.description is not None:
        lesson.description = data.description
    if data.photo is not None:
        lesson.photo = data.photo
    if data.next_meeting_date is not None:
        lesson.next_meeting_date = data.next_meeting_date
    if data.next_meeting_time is not None:
        lesson.next_meeting_time = data.next_meeting_time

    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("/tutors/{tutor_id}/lessons", response_model=List[LessonOut])
def get_tutor_lessons(
    tutor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lessons = db.query(Lesson).filter(Lesson.tutor_id == tutor_id).all()
    return lessons


# ============================================================
# ENROLLMENT / PAYMENT
# ============================================================

# 🔥 IDINAGDAG DITO SA TAAS PARA HINDI MA-CONFLICT SA {lesson_id}
@router.get("/lessons/tutor/students")
def get_tutor_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Kunin lahat ng lessons na pagmamay-ari ng tutor
    lessons = db.query(Lesson).filter(Lesson.tutor_id == current_user.id).all()
    lesson_ids = [l.id for l in lessons]
    
    if not lesson_ids:
        return []

    # Kunin lahat ng enrollments sa mga lessons na 'yon (exclude tutor)
    enrollments = db.query(Enrollment).filter(
        Enrollment.lesson_id.in_(lesson_ids),
        Enrollment.status != "tutor"
    ).all()

    result = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        if student:
            result.append({
                "enrollment_id": e.id,
                "lesson_id": e.lesson_id,
                "lesson_name": e.lesson.gc_name,
                "student_id": student.id,
                "full_name": student.full_name,
                "profile_picture": student.profile_picture,
                "status": e.status,
                "payment_status": e.payment_status,
                "payment_proof": e.payment_proof,
                "payment_reference": e.payment_reference,
                "rejection_reason": e.rejection_reason,
            })
    return result


@router.put("/enrollments/{lesson_id}/read")
def mark_as_read(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == current_user.id,
    ).first()
    if enrollment:
        enrollment.last_read_at = datetime.now()
        db.commit()
        db.refresh(enrollment)
    return {"status": "success"}


@router.delete("/enrollments/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def leave_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == current_user.id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled")
    db.delete(enrollment)
    db.commit()
    return None


@router.get("/enrollments/my", response_model=List[EnrollmentOut])
def get_my_enrollments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id
    ).all()

    result = []
    for e in enrollments:
        if e.last_read_at:
            unread_count = db.query(LessonMessage).filter(
                LessonMessage.lesson_id == e.lesson_id,
                LessonMessage.created_at > e.last_read_at,
                LessonMessage.sender_id != current_user.id,
            ).count()
        else:
            unread_count = db.query(LessonMessage).filter(
                LessonMessage.lesson_id == e.lesson_id,
                LessonMessage.sender_id != current_user.id,
            ).count()

        result.append({
            "id": e.id,
            "student_id": e.student_id,
            "lesson_id": e.lesson_id,
            "status": e.status,
            "enrolled_at": e.enrolled_at,
            "last_read_at": e.last_read_at,
            "unread_count": unread_count,
            "lesson": e.lesson,
            "payment_status": e.payment_status,
            "payment_proof": e.payment_proof,
            "payment_reference": e.payment_reference,
        })
    return result


@router.post("/enrollments/apply-payment", response_model=EnrollmentOut)
def apply_with_payment(data: EnrollmentApplyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Enrollment).filter(Enrollment.student_id == current_user.id, Enrollment.lesson_id == data.lesson_id).first()
    if existing:
        if existing.status == "rejected":
            existing.status = "pending_payment"
            existing.payment_status = "pending"
            existing.payment_proof = data.receipt_base64
            existing.payment_reference = data.reference_number.strip()
            existing.rejection_reason = None
            db.commit()
            db.refresh(existing)
            return existing
        else:
            raise HTTPException(status_code=400, detail="Already applied to this group.")

    enrollment = Enrollment(
        student_id=current_user.id, lesson_id=data.lesson_id, status="pending_payment",
        payment_status="pending", payment_proof=data.receipt_base64, payment_reference=data.reference_number.strip()
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.put("/enrollments/{lesson_id}/approve/{student_id}")
async def approve_payment(
    lesson_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the tutor can approve payments")

    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == student_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    if enrollment.status != "pending_payment":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve. Current status: {enrollment.status}",
        )

    enrollment.status = "enrolled"
    enrollment.payment_status = "paid"
    db.commit()

    await manager.send_to_user(current_user.id, {
        "type": "pending_payment_update",
        "lesson_id": lesson_id
    })

    return {"status": "approved"}


@router.put("/enrollments/{lesson_id}/reject/{student_id}")
async def reject_payment(
    lesson_id: int,
    student_id: int,
    reason_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the tutor can reject payments")

    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == student_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    enrollment.status = "rejected"
    enrollment.payment_status = "rejected"
    enrollment.rejection_reason = reason_data.get("reason", "No reason provided")
    db.commit()
    
    conv = db.query(Conversation).filter(
        or_(
            (Conversation.participant1_id == current_user.id) & (Conversation.participant2_id == student_id),
            (Conversation.participant1_id == student_id) & (Conversation.participant2_id == current_user.id)
        )
    ).first()

    if not conv:
        conv = Conversation(participant1_id=current_user.id, participant2_id=student_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=f"❌ Your application to '{lesson.gc_name}' was rejected.\nReason: {enrollment.rejection_reason}"
    )
    db.add(msg)
    db.commit()

    await manager.send_to_user(current_user.id, {
        "type": "pending_payment_update",
        "lesson_id": lesson_id
    })

    return {"status": "rejected"}


@router.get("/lessons/{lesson_id}/members")
def get_lesson_members(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    is_member = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == current_user.id,
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    is_tutor = lesson.tutor_id == current_user.id
    enrollments = db.query(Enrollment).filter(Enrollment.lesson_id == lesson_id).all()

    result = []
    for e in enrollments:
        if not is_tutor and e.status in ("pending_payment", "rejected"):
            continue

        student = db.query(User).filter(User.id == e.student_id).first()
        if student:
            result.append({
                "enrollment_id": e.id,
                "student_id": student.id,
                "full_name": student.full_name,
                "profile_picture": student.profile_picture,
                "status": e.status,
                "payment_status": e.payment_status,
                "payment_proof": e.payment_proof if is_tutor else None,
                "payment_reference": e.payment_reference if is_tutor else None,
            })
    return result


@router.delete("/lessons/{lesson_id}/kick/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def kick_member(
    lesson_id: int,
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can kick members")
    if student_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot kick yourself")

    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == student_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(enrollment)
    db.commit()
    return None


# ============================================================
# LESSON MESSAGES
# ============================================================

@router.get("/lessons/{lesson_id}/messages", response_model=List[LessonMessageOut])
def get_lesson_messages(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    messages = db.query(LessonMessage).filter(
        LessonMessage.lesson_id == lesson_id
    ).order_by(LessonMessage.created_at.asc()).all()

    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id,
            "lesson_id": m.lesson_id,
            "sender_id": m.sender_id,
            "sender_name": sender.full_name if sender else "Unknown",
            "sender_picture": sender.profile_picture if sender else None,
            "content": m.content,
            "created_at": m.created_at,
        })
    return result


@router.post(
    "/lessons/{lesson_id}/messages",
    response_model=LessonMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_lesson_message(
    lesson_id: int,
    data: LessonMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = db.query(Enrollment).filter(Enrollment.lesson_id == lesson_id, Enrollment.student_id == current_user.id).first()
    
    if not enrollment or enrollment.status == "pending_payment" or enrollment.status == "rejected":
        raise HTTPException(status_code=403, detail="Wait for tutor approval or you are rejected.")

    message = LessonMessage(
        lesson_id=lesson_id,
        sender_id=current_user.id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    msg_dict = {
        "id": message.id,
        "lesson_id": message.lesson_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "sender_picture": current_user.profile_picture,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
    }

    enrollments = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.status.in_(["enrolled", "tutor"]),
    ).all()

    for e in enrollments:
        if e.student_id != current_user.id:
            
            # FIX: Tamang computation ng unread
            if e.last_read_at:
                unread = db.query(LessonMessage).filter(
                    LessonMessage.lesson_id == lesson_id,
                    LessonMessage.created_at > e.last_read_at,
                    LessonMessage.sender_id != e.student_id,
                ).count()
            else:
                unread = db.query(LessonMessage).filter(
                    LessonMessage.lesson_id == lesson_id,
                    LessonMessage.sender_id != e.student_id,
                ).count()

            await manager.send_to_user(e.student_id, {
                "type": "new_lesson_message",
                "lesson_id": lesson_id,
                "unread_count": unread, 
                "message": msg_dict,
            })

    return msg_dict