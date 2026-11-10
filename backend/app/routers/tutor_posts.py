from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
import json

from app.database import get_db
from app.dependencies import get_current_user
from app.models import TutorPost, User, Lesson, Enrollment, Review
from app.schemas import TutorPostCreate, TutorPostOut, TutorPostUpdate

router = APIRouter(prefix="/tutor-posts", tags=["Tutor Posts"])


@router.post("", response_model=TutorPostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    data: TutorPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = TutorPost(
        user_id=current_user.id,
        subject=data.subject,
        hourly_rate=data.hourly_rate,
        session_rate=data.session_rate,
        education_level=data.education_level,
        description=data.description,
        tutor_picture=data.tutor_picture,
        post_pictures=data.post_pictures,
        status="published",
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # 🔥 AUTO-CREATE GC LOGIC (Option B: Reuse existing)
    if data.session_rate:
        existing_gc = db.query(Lesson).filter(
            Lesson.tutor_id == current_user.id,
            Lesson.gc_name == post.subject
        ).first()

        if not existing_gc:
            new_gc = Lesson(
                tutor_id=current_user.id,
                gc_name=post.subject,
                description=post.description,
                monthly_rate=post.session_rate,
                gcash_number=post.gcash_number,
            )
            db.add(new_gc)
            db.commit()
            db.refresh(new_gc)

            enrollment = Enrollment(
                student_id=current_user.id,
                lesson_id=new_gc.id,
                status="tutor",
                payment_status="paid",
            )
            db.add(enrollment)
            db.commit()
    
    post_dict = TutorPostOut.model_validate(post).model_dump()
    post_dict['tutor_name'] = current_user.full_name
    post_dict['tutor_picture'] = current_user.profile_picture or post.tutor_picture
    post_dict['tutor_description'] = current_user.description
    post_dict['tutor_description_picture'] = current_user.description_picture
    post_dict['learners_count'] = 0
    post_dict['total_reviews'] = 0
    return post_dict


@router.get("", response_model=list[TutorPostOut])
def list_published_posts(
    db: Session = Depends(get_db),
    search: str | None = None,
):
    query = db.query(TutorPost).join(User).filter(TutorPost.status == "published")

    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            or_(
                TutorPost.subject.ilike(search_pattern),
                TutorPost.description.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                TutorPost.hourly_rate == search if search.isdigit() else False
            )
        )

    posts = query.order_by(TutorPost.created_at.desc()).all()
    
    result = []
    for post in posts:
        post_dict = TutorPostOut.model_validate(post).model_dump()
        post_dict['tutor_name'] = post.owner.full_name
        post_dict['tutor_picture'] = post.owner.profile_picture or post.tutor_picture
        post_dict['tutor_description'] = post.owner.description
        post_dict['tutor_description_picture'] = post.owner.description_picture
        
        lessons = db.query(Lesson).filter(Lesson.tutor_id == post.user_id).all()
        lesson_ids = [l.id for l in lessons]
        learners_count = db.query(Enrollment).filter(
            Enrollment.lesson_id.in_(lesson_ids),
            Enrollment.status == "enrolled"
        ).count() if lesson_ids else 0
        
        total_reviews = db.query(Review).filter(Review.tutor_id == post.user_id).count()
        
        post_dict['learners_count'] = learners_count
        post_dict['total_reviews'] = total_reviews
        result.append(post_dict)
    return result


@router.get("/me", response_model=list[TutorPostOut])
def list_my_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    posts = (
        db.query(TutorPost)
        .filter(TutorPost.user_id == current_user.id)
        .order_by(TutorPost.created_at.desc())
        .all()
    )
    
    result = []
    for post in posts:
        post_dict = TutorPostOut.model_validate(post).model_dump()
        post_dict['tutor_name'] = current_user.full_name
        post_dict['tutor_picture'] = current_user.profile_picture or post.tutor_picture
        post_dict['tutor_description'] = current_user.description
        post_dict['tutor_description_picture'] = current_user.description_picture
        post_dict['learners_count'] = 0
        post_dict['total_reviews'] = 0
        result.append(post_dict)
    return result


@router.get("/{post_id}", response_model=TutorPostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post_dict = TutorPostOut.model_validate(post).model_dump()
    post_dict['tutor_name'] = post.owner.full_name
    post_dict['tutor_picture'] = post.owner.profile_picture or post.tutor_picture
    post_dict['tutor_description'] = post.owner.description
    post_dict['tutor_description_picture'] = post.owner.description_picture
    
    lessons = db.query(Lesson).filter(Lesson.tutor_id == post.user_id).all()
    lesson_ids = [l.id for l in lessons]
    learners_count = db.query(Enrollment).filter(
        Enrollment.lesson_id.in_(lesson_ids),
        Enrollment.status == "enrolled"
    ).count() if lesson_ids else 0
    total_reviews = db.query(Review).filter(Review.tutor_id == post.user_id).count()
    
    post_dict['learners_count'] = learners_count
    post_dict['total_reviews'] = total_reviews
    return post_dict


@router.put("/{post_id}", response_model=TutorPostOut)
def update_post(
    post_id: int,
    data: TutorPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    db.commit()
    db.refresh(post)
    
    post_dict = TutorPostOut.model_validate(post).model_dump()
    post_dict['tutor_name'] = current_user.full_name
    post_dict['tutor_picture'] = current_user.profile_picture or post.tutor_picture
    post_dict['tutor_description'] = current_user.description
    post_dict['tutor_description_picture'] = current_user.description_picture
    post_dict['learners_count'] = 0
    post_dict['total_reviews'] = 0
    return post_dict


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(TutorPost).filter(TutorPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")

    db.delete(post)
    db.commit()
    return None

@router.get("/user/{user_id}/gallery")
def get_tutor_gallery(user_id: int, db: Session = Depends(get_db)):
    posts = db.query(TutorPost).filter(
        TutorPost.user_id == user_id,
        TutorPost.status == "published"
    ).all()
    
    all_images = []
    for post in posts:
        if post.post_pictures:
            try:
                images = json.loads(post.post_pictures)
                if isinstance(images, list):
                    all_images.extend(images)
            except Exception:
                pass
                
    return {"images": all_images}