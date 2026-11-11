from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
import os

from app.routers import auth, tutor_posts, users, conversations, lessons, admin, reports, uploads, reviews, admin_messages
from app.database import get_db, SessionLocal
from app.websocket import manager
from app.security import decode_access_token
from app.models import User

app = FastAPI(
    title="TutorLink API",
    description="Backend API ng TutorLink: Tutor Discovery and Hiring Mobile Application",
    version="0.7.0",
)

# AYOS NA CORS: Papayagan lahat ng devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 🔥 IDINAGDAG: MIDDLEWARE PARA SA MALALAKING REQUEST BODY (10MB)
# ============================================================
@app.middleware("http")
async def check_request_size(request: Request, call_next):
    # 10MB limit (10 * 1024 * 1024 bytes)
    if request.headers.get("content-length"):
        try:
            content_length = int(request.headers["content-length"])
            if content_length > 10 * 1024 * 1024:
                return JSONResponse(
                    status_code=413, 
                    content={"detail": "Payload too large. Maximum size is 10MB."}
                )
        except ValueError:
            pass
    return await call_next(request)
# ============================================================

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tutor_posts.router)
app.include_router(conversations.router)
app.include_router(lessons.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(uploads.router)
app.include_router(reviews.router)
app.include_router(admin_messages.router)

# ============ WEBSOCKET ENDPOINT ============
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None:
        await websocket.close(code=1008)
        return

    user_id = int(payload.get("sub"))
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

# ===========================================

@app.get("/")
def read_root():
    return {"message": "Welcome to TutorLink API", "status": "running"}