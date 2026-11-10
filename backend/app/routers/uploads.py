from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import shutil, os, uuid
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    
    file_extension = file.filename.split(".")[-1]
    file_name = f"post_{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/{file_name}"
    
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # IDINAGDAG: Relative path para hindi na kailangang mag-hardcode ng IP
    return {"url": f"/uploads/{file_name}"}