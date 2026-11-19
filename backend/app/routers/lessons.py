from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_, and_
from datetime import datetime
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Lesson, Enrollment, LessonMessage, User, Conversation, Message, LessonMessageDeletion, TutorPost
from app.schemas import (
    LessonCreate, LessonOut, EnrollmentCreate, EnrollmentOut,
    LessonMessageCreate, LessonMessageOut, LessonUpdate, EnrollmentApplyRequest, EnrollmentStatusUpdate
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

@router.get("/lessons/tutor/students")
def get_tutor_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.expire_all()
    lessons = db.query(Lesson).filter(Lesson.tutor_id == current_user.id).all()
    lesson_ids = [l.id for l in lessons]
    
    if not lesson_ids:
        return []

    enrollments = db.query(Enrollment).filter(
        Enrollment.lesson_id.in_(lesson_ids),
        Enrollment.status != "tutor"
    ).all()

    result = []
    for e in enrollments:
        student = db.query(User).filter(User.id == e.student_id).first()
        if student:
            conv = db.query(Conversation).filter(
                Conversation.conversation_type == "session",
                Conversation.lesson_id == e.lesson_id
            ).first()

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
                "lesson_type": e.lesson_type,
                "monthly_rate": float(e.lesson.monthly_rate) if e.lesson.monthly_rate else 0.0,
                "next_meeting_date": e.lesson.next_meeting_date,
                "next_meeting_time": e.lesson.next_meeting_time,
                "conversation_id": conv.id if conv else None, 
            })
    return result

@router.post("/sessions/apply")
def apply_1v1_session(
    data: dict = Body(...), 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post_id = data.get("post_id")
    reference = data.get("reference")
    receipt = data.get("receipt")
    amount = data.get("amount")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    session_date = data.get("session_date")

    # 🔥 1. DUPLICATE GCASH REFERENCE CHECK
    if reference:
        existing_ref = db.query(Enrollment).filter(
            Enrollment.payment_reference == reference.strip()
        ).first()
        if existing_ref:
            raise HTTPException(
                status_code=400, 
                detail="This GCash reference number has already been used."
            )

    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 🔥 2. DOWNPAYMENT COMPUTATION
    total_amount = float(amount)
    downpayment = total_amount * 0.50
    remaining = total_amount - downpayment

    new_session = Lesson(
        tutor_id=post.user_id,
        gc_name=f"{post.subject} 1v1 Session",
        description=f"1v1 Session with {current_user.full_name}",
        monthly_rate=total_amount,
        total_amount=total_amount,
        downpayment_amount=downpayment,
        remaining_balance=remaining,
        gcash_number=post.gcash_number,
        next_meeting_date=session_date,
        next_meeting_time=f"{start_time} - {end_time}",
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    enrollment = Enrollment(
        student_id=current_user.id,
        lesson_id=new_session.id,
        status="pending_payment",
        payment_status="pending",
        payment_reference=reference,
        payment_proof=receipt,
        lesson_type="1v1"
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    return {"status": "success", "lesson_id": new_session.id, "enrollment_id": enrollment.id}


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

        # 🔥 FIX: Hanapin lang gamit ang lesson_id at conversation_type
        conv = db.query(Conversation).filter(
            Conversation.conversation_type == "session",
            Conversation.lesson_id == e.lesson_id
        ).first()

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
            "conversation_id": conv.id if conv else None,
        })
    return result


@router.post("/enrollments/apply-payment", response_model=EnrollmentOut)
def apply_with_payment(data: EnrollmentApplyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    # 🔥 2. DUPLICATE GCASH REFERENCE CHECK
    existing_ref = db.query(Enrollment).filter(
        Enrollment.payment_reference == data.reference_number.strip()
    ).first()
    if existing_ref:
        raise HTTPException(
            status_code=400, 
            detail="This GCash reference number has already been used."
        )

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
        raise HTTPException(status_code=400, detail="Already approved or rejected.")

    enrollment.status = "enrolled"
    enrollment.payment_status = "paid"
    
    # 🔥 FIX: HANAPIN ANG EXISTING PRIVATE CHAT PARA DITO I-SEND ANG MESSAGE
    existing_conv = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant1_id == current_user.id, Conversation.participant2_id == student_id),
            and_(Conversation.participant1_id == student_id, Conversation.participant2_id == current_user.id)
        )
    ).first()

    if existing_conv:
        # I-update ang existing chat para maging session
        existing_conv.conversation_type = "session"
        existing_conv.lesson_id = lesson_id
        existing_conv.is_deleted_by_p1 = False
        existing_conv.is_deleted_by_p2 = False
        session_conv = existing_conv
        db.commit()
    else:
        # Kung wala talagang existing chat (bihira mangyari), gumawa ng bago
        session_conv = Conversation(
            participant1_id=current_user.id,
            participant2_id=student_id,
            conversation_type="session",   
            lesson_id=lesson_id,            
        )
        db.add(session_conv)
        db.commit()
        db.refresh(session_conv)
    
    # 🔥 I-SEND ANG APPROVAL MESSAGE SA EXISTING CHAT
    initial_msg = Message(
        conversation_id=session_conv.id,
        sender_id=current_user.id,
        content=f"Hi! I have approved your 1v1 session for {lesson.gc_name}. Let's discuss the details here."
    )
    db.add(initial_msg)
    db.commit()

    await manager.send_to_user(current_user.id, {
        "type": "pending_payment_update",
        "lesson_id": lesson_id
    })

    return {"status": "approved"}

@router.put("/enrollments/{lesson_id}/status")
async def update_enrollment_status(
    lesson_id: int,
    data: EnrollmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    if lesson.tutor_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the tutor of this lesson can update enrollment status."
        )

    allowed_statuses = ["enrolled", "completed", "cancelled"]
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of {allowed_statuses}."
        )

    enrollments = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.status != "tutor", 
    ).all()

    if not enrollments:
        raise HTTPException(status_code=404, detail="No students enrolled in this lesson.")

    for e in enrollments:
        e.status = data.status

    db.commit()

    return {
        "status": "success",
        "lesson_id": lesson_id,
        "new_status": data.status,
        "updated_count": len(enrollments),
    }

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
    
    # 🔥 GUMAWA NG BAGONG SESSION CONVERSATION PARA SA REJECTION NOTICE
    conv = Conversation(
        participant1_id=current_user.id,
        participant2_id=student_id,
        conversation_type="session",
        lesson_id=lesson_id,
    )
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
            conv = db.query(Conversation).filter(
                Conversation.conversation_type == "session",
                Conversation.lesson_id == e.lesson_id,
                or_(
                    (Conversation.participant1_id == current_user.id) & (Conversation.participant2_id == e.lesson.tutor_id),
                    (Conversation.participant1_id == e.lesson.tutor_id) & (Conversation.participant2_id == current_user.id)
                )
            ).first()

            result.append({
                "id": e.id,
                "student_id": e.student_id,
                "lesson_id": e.lesson_id,
                "status": e.status,
                "enrolled_at": e.enrolled_at,
                "last_read_at": e.last_read_at,
                "unread_count": 0,
                "lesson": e.lesson,
                "payment_status": e.payment_status,
                "payment_proof": e.payment_proof,
                "payment_reference": e.payment_reference,
                "conversation_id": conv.id if conv else None,
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
# 🔥 MARK AS DONE & CANCEL WITH REASON (FIXED)
# ============================================================

from pydantic import BaseModel

class CancelRequest(BaseModel):
    reason: str
    refund_proof: Optional[str] = None

@router.put("/enrollments/{enrollment_id}/complete")
async def mark_as_completed(
    enrollment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Hinahanap natin gamit ang ID ng mismong enrollment
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    lesson = db.query(Lesson).filter(Lesson.id == enrollment.lesson_id).first()
    
    # Siguraduhin na Student o Tutor ka sa lesson na 'to
    if enrollment.student_id != current_user.id and lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this session.")

    if enrollment.status == "completed":
        raise HTTPException(status_code=400, detail="Session already marked as done.")

    enrollment.status = "completed"
    db.commit()
    
    if lesson:
        await manager.send_to_user(lesson.tutor_id, {
            "type": "session_completed",
            "lesson_id": lesson.id
        })

    return {"status": "completed", "message": "Session marked as done."}


@router.put("/enrollments/{enrollment_id}/cancel")
async def cancel_with_reason(
    enrollment_id: int,
    data: CancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    lesson = db.query(Lesson).filter(Lesson.id == enrollment.lesson_id).first()
    
    if enrollment.student_id != current_user.id and lesson.tutor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this session.")

    if enrollment.status == "cancelled":
        raise HTTPException(status_code=400, detail="Session already cancelled.")

    enrollment.status = "cancelled"
    enrollment.cancel_reason = data.reason
    if data.refund_proof:
        enrollment.refund_proof = data.refund_proof
    db.commit()
    
    if lesson:
        await manager.send_to_user(lesson.tutor_id, {
            "type": "session_cancelled",
            "lesson_id": lesson.id,
            "reason": data.reason
        })

    return {"status": "cancelled", "message": "Session cancelled with reason."}

# ============================================================
# LESSON MESSAGES
# ============================================================

@router.get("/lessons/{lesson_id}/messages", response_model=List[LessonMessageOut])
def get_lesson_messages(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted_ids = set(
        row[0] for row in db.query(LessonMessageDeletion.message_id).filter(
            LessonMessageDeletion.user_id == current_user.id
        ).all()
    )

    messages = db.query(LessonMessage).filter(
        LessonMessage.lesson_id == lesson_id
    ).order_by(LessonMessage.created_at.asc()).all()

    result = []
    for m in messages:
        if m.id in deleted_ids:
            continue 

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
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or lesson.status == "disabled":
        raise HTTPException(status_code=403, detail="This group chat has been disabled by the admin.")

    if not current_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account is disabled. You cannot send messages."
        )

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

@router.delete("/lessons/{lesson_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson_message_for_me(
    lesson_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.lesson_id == lesson_id,
        Enrollment.student_id == current_user.id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not a member of this lesson")

    message = db.query(LessonMessage).filter(
        LessonMessage.id == message_id,
        LessonMessage.lesson_id == lesson_id,
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = db.query(LessonMessageDeletion).filter(
        LessonMessageDeletion.message_id == message_id,
        LessonMessageDeletion.user_id == current_user.id,
    ).first()
    if existing:
        return None

    deletion = LessonMessageDeletion(
        message_id=message_id,
        user_id=current_user.id,
    )
    db.add(deletion)
    db.commit()
    return None