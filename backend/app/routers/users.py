from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import cloudinary
import cloudinary.uploader

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserOut, user_to_out
from app.security import hash_password, verify_password

# 🔥 I-configure ang Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return user_to_out(current_user)

@router.put("/me", response_model=UserOut)
async def update_me(
    full_name: str = Form(None),
    phone_number: str = Form(None),
    description: str = Form(None),
    gcash_number: str = Form(None),
    current_password: str = Form(None),
    new_password: str = Form(None),
    profile_picture: UploadFile = File(None),
    description_picture: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if full_name is not None: current_user.full_name = full_name.strip()
    if phone_number is not None: current_user.phone_number = phone_number.strip()
    if description is not None: current_user.description = description.strip()
    if gcash_number is not None: current_user.gcash_number = gcash_number.strip()
    
    if profile_picture:
        try:
            result = cloudinary.uploader.upload(
                profile_picture.file,
                folder="tutorlink/profiles",
                resource_type="image",
                quality="auto",
                fetch_format="auto"
            )
            current_user.profile_picture = result["secure_url"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Profile upload failed: {str(e)}")

    if description_picture:
        try:
            result = cloudinary.uploader.upload(
                description_picture.file,
                folder="tutorlink/descriptions",
                resource_type="image",
                quality="auto",
                fetch_format="auto"
            )
            current_user.description_picture = result["secure_url"]
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Description upload failed: {str(e)}")

    if new_password:
        if not current_password or not verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Mali ang current password.")
        current_user.password_hash = hash_password(new_password)

    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)