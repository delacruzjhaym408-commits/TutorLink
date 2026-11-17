from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_
from datetime import datetime
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.models import Report, UserRole
from app.database import get_db
from app.dependencies import require_admin
from app.models import (
    User, TutorPost, Report, Conversation, Message,
    Enrollment, Review, AdminMessage, Lesson, LessonMessage, UserAppeal)
from sqlalchemy import func
from app.schemas import UserOut, TutorPostOut, ReportOut, user_to_out

router = APIRouter(prefix="/admin", tags=["Admin"])

# Schema para sa Disable Request
class UserDisableRequest(BaseModel):
    reason: str

# 1. Manage Users (List at Delete)
@router.get("/users", response_model=List[UserOut])
def get_all_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [user_to_out(u) for u in users]

# 🔥 DISABLE USER (AUTO-DISABLE POSTS AND LESSONS)
@router.put("/users/{user_id}/disable", response_model=UserOut)
def disable_user(
    user_id: int, 
    data: UserDisableRequest, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot disable your own admin account")
    
    # 1. I-disable ang account
    user.is_active = False
    user.disabled_reason = data.reason.strip()
    user.disabled_at = datetime.now()

    # 2. I-disable ang lahat ng Posts ng user
    posts = db.query(TutorPost).filter(TutorPost.user_id == user.id).all()
    for post in posts:
        post.status = "disabled"
        post.disabled_reason = "Tutor account disabled"

    # 3. I-disable ang lahat ng Group Chats (Lessons) ng user
    lessons = db.query(Lesson).filter(Lesson.tutor_id == user.id).all()
    for lesson in lessons:
        lesson.status = "disabled"
        lesson.disabled_reason = "Tutor account disabled"

    db.commit()
    db.refresh(user)
    return user_to_out(user)

# 🔥 ENABLE USER (AUTO-ENABLE POSTS AND LESSONS)
@router.put("/users/{user_id}/enable", response_model=UserOut)
def enable_user(
    user_id: int, 
    current_user: User = Depends(require_admin), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 1. I-enable ang account
    user.is_active = True
    user.disabled_reason = None
    user.disabled_at = None

    # 2. I-enable ang lahat ng Posts
    posts = db.query(TutorPost).filter(TutorPost.user_id == user.id).all()
    for post in posts:
        post.status = "published"
        post.disabled_reason = None

    # 3. I-enable ang lahat ng Group Chats
    lessons = db.query(Lesson).filter(Lesson.tutor_id == user.id).all()
    for lesson in lessons:
        lesson.status = "active"
        lesson.disabled_reason = None

    db.commit()
    db.refresh(user)
    return user_to_out(user)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")
    
    try:
        convs = db.query(Conversation).filter(
            or_(Conversation.participant1_id == user_id, Conversation.participant2_id == user_id)
        ).all()
        for c in convs:
            db.query(Message).filter(Message.conversation_id == c.id).delete()
            db.delete(c)
        
        db.query(Enrollment).filter(Enrollment.student_id == user_id).delete()
        db.query(Report).filter(Report.reporter_id == user_id).delete()
        db.query(Report).filter(Report.reported_user_id == user_id).delete()
        db.query(Review).filter(Review.tutor_id == user_id).delete()
        db.query(Review).filter(Review.reviewer_id == user_id).delete()
        db.query(AdminMessage).filter(AdminMessage.user_id == user_id).delete()
        
        posts = db.query(TutorPost).filter(TutorPost.user_id == user_id).all()
        for p in posts:
            db.query(Report).filter(Report.reported_post_id == p.id).delete()
            db.delete(p)
        
        lessons = db.query(Lesson).filter(Lesson.tutor_id == user_id).all()
        for l in lessons:
            db.query(LessonMessage).filter(LessonMessage.lesson_id == l.id).delete()
            db.query(Enrollment).filter(Enrollment.lesson_id == l.id).delete()
            db.delete(l)
        
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"ERROR DELETING USER {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return None

# 2. Manage Posts (List at Delete)
@router.get("/posts", response_model=List[TutorPostOut])
def get_all_posts(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    posts = db.query(TutorPost).order_by(TutorPost.created_at.desc()).all()
    result = []
    for post in posts:
        post_dict = TutorPostOut.model_validate(post).model_dump()
        post_dict['tutor_name'] = post.owner.full_name if post.owner else "Unknown"
        post_dict['tutor_picture'] = post.owner.profile_picture if post.owner else None
        result.append(post_dict)
    return result

@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    try:
        db.query(Report).filter(Report.reported_post_id == post_id).delete()
        db.delete(post)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return None

# 3. Manage Reports (List)
@router.get("/reports", response_model=List[ReportOut])
def get_all_reports(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).all()
    result = []
    
    for r in reports:
        total_reports_for_user = 0
        if r.reported_user_id:
            total_reports_for_user = db.query(Report).filter(Report.reported_user_id == r.reported_user_id).count()
            
        post_details = None
        if r.reported_post:
            post_details = {
                "id": r.reported_post.id,
                "subject": r.reported_post.subject,
                "description": r.reported_post.description,
                "tutor_name": r.reported_post.owner.full_name if r.reported_post.owner else "Unknown",
                "tutor_email": r.reported_post.owner.email if r.reported_post.owner else "Unknown",
                "post_pictures": r.reported_post.post_pictures,
                "hourly_rate": r.reported_post.hourly_rate
            }
            
        user_details = None
        if r.reported_user:
            user_details = {
                "id": r.reported_user.id,
                "full_name": r.reported_user.full_name,
                "email": r.reported_user.email,
                "profile_picture": r.reported_user.profile_picture,
                "description": r.reported_user.description
            }

        report_dict = {
            "id": r.id,
            "reporter_id": r.reporter_id,
            "reporter_name": r.reporter.full_name if r.reporter else "Unknown",
            "reported_user_id": r.reported_user_id,
            "reported_user_name": r.reported_user.full_name if r.reported_user else None,
            "reported_post_id": r.reported_post_id,
            "reported_post_subject": r.reported_post.subject if r.reported_post else None,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at,
            "total_user_reports": total_reports_for_user,
            "post_details": post_details,
            "user_details": user_details
        }
        result.append(report_dict)
    return result

@router.put("/reports/{report_id}/resolve")
def resolve_report(report_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "resolved"
    db.commit()
    return {"status": "success"}

# 🔥 BAGONG ENDPOINTS PARA SA POSTS
class PostDisableRequest(BaseModel):
    reason: str

@router.put("/posts/{post_id}/disable", response_model=TutorPostOut)
def disable_post(post_id: int, data: PostDisableRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "disabled"
    post.disabled_reason = data.reason.strip()
    db.commit()
    db.refresh(post)
    return post

@router.put("/posts/{post_id}/enable", response_model=TutorPostOut)
def enable_post(post_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "published"
    post.disabled_reason = None
    db.commit()
    db.refresh(post)
    return post

# 🔥 BAGONG ENDPOINTS PARA SA LESSONS (GC)
class LessonDisableRequest(BaseModel):
    reason: str

@router.put("/lessons/{lesson_id}/disable")
def disable_lesson(lesson_id: int, data: LessonDisableRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson.status = "disabled"
    lesson.disabled_reason = data.reason.strip()
    db.commit()
    return {"status": "disabled"}

@router.put("/lessons/{lesson_id}/enable")
def enable_lesson(lesson_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson.status = "active"
    lesson.disabled_reason = None
    db.commit()
    return {"status": "active"}

@router.get("/lessons/all")
def get_all_lessons(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    lessons = db.query(Lesson).order_by(Lesson.created_at.desc()).all()
    result = []
    for l in lessons:
        tutor = db.query(User).filter(User.id == l.tutor_id).first()
        result.append({
            "id": l.id,
            "gc_name": l.gc_name,
            "tutor_name": tutor.full_name if tutor else "Unknown",
            "status": l.status,
            "disabled_reason": l.disabled_reason,
            "created_at": l.created_at
        })
    return result


@router.post("/trigger-automatic-disable")
def trigger_automatic_disable(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        one_month_ago = datetime.now() - timedelta(days=30)
        
        inactive_tutors = db.query(User).filter(
            User.role == UserRole.tutor,
            User.is_active == True,
            or_(User.last_login_at < one_month_ago, User.last_login_at == None)
        ).all()
        
        disabled_count = 0
        for tutor in inactive_tutors:
            tutor.is_active = False
            tutor.disabled_reason = "Automatically disabled: Inactive for 1 month."
            tutor.disabled_at = datetime.now()
            
            # Auto-disable posts and lessons
            posts = db.query(TutorPost).filter(TutorPost.user_id == tutor.id).all()
            for post in posts:
                post.status = "disabled"
                post.disabled_reason = "Tutor automatically disabled"
                
            lessons = db.query(Lesson).filter(Lesson.tutor_id == tutor.id).all()
            for lesson in lessons:
                lesson.status = "disabled"
                lesson.disabled_reason = "Tutor automatically disabled"

            disabled_count += 1
            
        reported_users = db.query(Report.reported_user_id, func.count(Report.id).label('count')).group_by(Report.reported_user_id).having(func.count(Report.id) >= 3).all()
        
        for user_id, count in reported_users:
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user and user.is_active:
                    user.is_active = False
                    user.disabled_reason = f"Automatically disabled: Received {count} reports."
                    user.disabled_at = datetime.now()
                    
                    posts = db.query(TutorPost).filter(TutorPost.user_id == user.id).all()
                    for post in posts:
                        post.status = "disabled"
                        post.disabled_reason = "Tutor automatically disabled"

                    lessons = db.query(Lesson).filter(Lesson.tutor_id == user.id).all()
                    for lesson in lessons:
                        lesson.status = "disabled"
                        lesson.disabled_reason = "Tutor automatically disabled"
                        
                    disabled_count += 1

        db.commit()
        return {"message": f"Check completed. {disabled_count} users disabled."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.put("/posts/{post_id}/approve", response_model=TutorPostOut)
def approve_post(post_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "published"
    db.commit()
    db.refresh(post)
    return post

@router.put("/posts/{post_id}/reject", response_model=TutorPostOut)
def reject_post(post_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.status = "rejected"
    db.commit()
    db.refresh(post)
    return post

# ==========================================
# 🔥 APPEALS ENDPOINTS
# ==========================================

@router.get("/appeals")
def get_all_appeals(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    # Kunin lahat ng appeals, pinakabago (latest) ang nasa unahan
    appeals = db.query(UserAppeal).order_by(UserAppeal.created_at.desc()).all()
    result = []
    for a in appeals:
        user = db.query(User).filter(User.id == a.user_id).first()
        result.append({
            "id": a.id,
            "user_id": a.user_id,
            "user_name": user.full_name if user else "Unknown",
            "email": user.email if user else "Unknown",
            "reason": a.reason,
            "status": a.status,
            "created_at": a.created_at
        })
    return result

class AppealActionRequest(BaseModel):
    reason: Optional[str] = None

@router.put("/appeals/{appeal_id}/approve")
def approve_appeal(appeal_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    appeal = db.query(UserAppeal).filter(UserAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    # I-update ang appeal status
    appeal.status = "approved"
    
    # I-enable ang user
    user = db.query(User).filter(User.id == appeal.user_id).first()
    if user:
        user.is_active = True
        user.disabled_reason = None
        user.disabled_at = None
        
        # I-enable ang posts at lessons
        posts = db.query(TutorPost).filter(TutorPost.user_id == user.id).all()
        for post in posts:
            post.status = "published"
            post.disabled_reason = None
        lessons = db.query(Lesson).filter(Lesson.tutor_id == user.id).all()
        for lesson in lessons:
            lesson.status = "active"
            lesson.disabled_reason = None
            
    db.commit()
    return {"status": "approved"}

@router.put("/appeals/{appeal_id}/reject")
def reject_appeal(appeal_id: int, data: AppealActionRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    appeal = db.query(UserAppeal).filter(UserAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    
    appeal.status = "rejected"
    db.commit()
    return {"status": "rejected"}

@router.delete("/appeals/{appeal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appeal(appeal_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    appeal = db.query(UserAppeal).filter(UserAppeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Appeal not found")
    db.delete(appeal)
    db.commit()
    return None