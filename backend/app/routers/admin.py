from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import or_

from app.database import get_db
from app.dependencies import require_admin
from app.models import (
    User, TutorPost, Report, Conversation, Message,
    Enrollment, Review, AdminMessage, Lesson, LessonMessage
)
from app.schemas import UserOut, TutorPostOut, ReportOut, user_to_out

router = APIRouter(prefix="/admin", tags=["Admin"])

# 1. Manage Users (List at Delete)
@router.get("/users", response_model=List[UserOut])
def get_all_users(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [user_to_out(u) for u in users]

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")
    
    try:
        # 1. Delete Conversations & Messages
        convs = db.query(Conversation).filter(
            or_(Conversation.participant1_id == user_id, Conversation.participant2_id == user_id)
        ).all()
        for c in convs:
            db.query(Message).filter(Message.conversation_id == c.id).delete()
            db.delete(c)
        
        # 2. Delete Enrollments
        db.query(Enrollment).filter(Enrollment.student_id == user_id).delete()
        
        # 3. Delete Reports
        db.query(Report).filter(Report.reporter_id == user_id).delete()
        db.query(Report).filter(Report.reported_user_id == user_id).delete()
        
        # 4. Delete Reviews
        db.query(Review).filter(Review.tutor_id == user_id).delete()
        db.query(Review).filter(Review.reviewer_id == user_id).delete()
        
        # 5. Delete Admin Messages
        db.query(AdminMessage).filter(AdminMessage.user_id == user_id).delete()
        
        # 6. Delete Posts
        posts = db.query(TutorPost).filter(TutorPost.user_id == user_id).all()
        for p in posts:
            db.query(Report).filter(Report.reported_post_id == p.id).delete()
            db.delete(p)
        
        # 7. Delete Lessons
        lessons = db.query(Lesson).filter(Lesson.tutor_id == user_id).all()
        for l in lessons:
            db.query(LessonMessage).filter(LessonMessage.lesson_id == l.id).delete()
            db.query(Enrollment).filter(Enrollment.lesson_id == l.id).delete()
            db.delete(l)
        
        # 8. Delete User
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
            
        # IDINAGDAG: Post Details
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
            
        # IDINAGDAG: User Details
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