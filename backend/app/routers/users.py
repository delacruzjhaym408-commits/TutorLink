from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import shutil, os, uuid
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserOut, user_to_out
from app.security import hash_password, verify_password

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
        file_extension = profile_picture.filename.split(".")[-1]
        file_name = f"profile_{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/{file_name}"
        os.makedirs("uploads", exist_ok=True)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(profile_picture.file, buffer)
        # RELATIVE PATH: walang http:// at walang IP
        current_user.profile_picture = f"/uploads/{file_name}"

    if description_picture:
        file_extension = description_picture.filename.split(".")[-1]
        file_name = f"desc_{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/{file_name}"
        os.makedirs("uploads", exist_ok=True)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(description_picture.file, buffer)
        # RELATIVE PATH: walang http:// at walang IP
        current_user.description_picture = f"/uploads/{file_name}"

    if new_password:
        if not current_password or not verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Mali ang current password.")
        current_user.password_hash = hash_password(new_password)

    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)