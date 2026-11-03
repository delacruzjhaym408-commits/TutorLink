from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserOut, user_to_out

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return user_to_out(current_user)