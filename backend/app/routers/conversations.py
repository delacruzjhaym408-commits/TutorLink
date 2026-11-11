from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Conversation, Message, User
from app.schemas import (
    ConversationOut, ConversationCreate, MessageOut, MessageCreate
)
from app.websocket import manager

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_or_get_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.participant_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")

    existing = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant1_id == current_user.id,
                 Conversation.participant2_id == data.participant_id),
            and_(Conversation.participant1_id == data.participant_id,
                 Conversation.participant2_id == current_user.id),
        )
    ).first()

    if existing:
        return _build_conversation_out(existing, current_user, db)

    conversation = Conversation(
        participant1_id=current_user.id,
        participant2_id=data.participant_id,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    if data.initial_message and data.initial_message.strip():
        first_message = Message(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            content=data.initial_message.strip(),
            post_id=data.post_id,
            post_subject=data.post_subject,
            post_picture=data.post_picture,
        )
        db.add(first_message)
        db.commit()
        db.refresh(first_message)

        ws_payload = {
            "type": "new_message",
            "conversation_id": conversation.id,
            "unread_count": 1,
            "message": {
                "id": first_message.id,
                "conversation_id": first_message.conversation_id,
                "sender_id": first_message.sender_id,
                "sender_name": current_user.full_name,
                "sender_picture": current_user.profile_picture,
                "content": first_message.content,
                "created_at": first_message.created_at.isoformat(),
                "post_id": first_message.post_id,
                "post_subject": first_message.post_subject,
                "post_picture": first_message.post_picture,
            },
        }
        await manager.send_to_user(data.participant_id, ws_payload)

    return _build_conversation_out(conversation, current_user, db)


def _build_conversation_out(conv: Conversation, current_user: User, db: Session) -> dict:
    other_id = conv.participant2_id if conv.participant1_id == current_user.id else conv.participant1_id
    other_user = db.query(User).filter(User.id == other_id).first()
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    return {
        "id": conv.id,
        "participant1_id": conv.participant1_id,
        "participant2_id": conv.participant2_id,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "other_user_name": other_user.full_name if other_user else "Unknown User",
        "other_user_picture": other_user.profile_picture if other_user else None,
        "lastMessage": last_msg.content if last_msg else "No messages yet",
        "last_sender_id": last_msg.sender_id if last_msg else None, # 🔥 IDINAGDAG
        "unread_count": 0,
    }


@router.get("", response_model=list[ConversationOut])
def list_my_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversations = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant1_id == current_user.id,
                 Conversation.is_deleted_by_p1 == False),
            and_(Conversation.participant2_id == current_user.id,
                 Conversation.is_deleted_by_p2 == False),
        )
    ).order_by(Conversation.updated_at.desc()).all()

    result = []
    for c in conversations:
        other_id = c.participant2_id if c.participant1_id == current_user.id else c.participant1_id
        other_user = db.query(User).filter(User.id == other_id).first()

        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        my_last_read = (
            c.participant1_last_read if c.participant1_id == current_user.id
            else c.participant2_last_read
        )
        if my_last_read:
            unread_count = db.query(Message).filter(
                Message.conversation_id == c.id,
                Message.created_at > my_last_read,
                Message.sender_id != current_user.id,
            ).count()
        else:
            unread_count = db.query(Message).filter(
                Message.conversation_id == c.id,
                Message.sender_id != current_user.id,
            ).count()

        result.append({
            "id": c.id,
            "participant1_id": c.participant1_id,
            "participant2_id": c.participant2_id,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "other_user_name": other_user.full_name if other_user else "Unknown User",
            "other_user_picture": other_user.profile_picture if other_user else None,
            "lastMessage": last_msg.content if last_msg else "No messages yet",
            "last_sender_id": last_msg.sender_id if last_msg else None, # 🔥 IDINAGDAG
            "unread_count": unread_count,
        })
    return result


@router.put("/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conv.participant1_id == current_user.id:
        conv.participant1_last_read = datetime.now()
    elif conv.participant2_id == current_user.id:
        conv.participant2_last_read = datetime.now()
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.commit()
    return {"status": "success"}


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conv.participant1_id == current_user.id:
        conv.is_deleted_by_p1 = True
    elif conv.participant2_id == current_user.id:
        conv.is_deleted_by_p2 = True
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.commit()
    return None


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not part of this conversation")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "sender_id": m.sender_id,
            "sender_name": sender.full_name if sender else "Unknown",
            "sender_picture": sender.profile_picture if sender else None,
            "content": m.content,
            "created_at": m.created_at,
            "post_id": m.post_id,
            "post_subject": m.post_subject,
            "post_picture": m.post_picture,
        })
    return result


@router.post("/{conversation_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if current_user.id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(status_code=403, detail="You are not part of this conversation")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    other_user_id = (
        conversation.participant2_id if conversation.participant1_id == current_user.id
        else conversation.participant1_id
    )

    db.refresh(conversation)
    other_last_read = (
        conversation.participant2_last_read if conversation.participant1_id == current_user.id
        else conversation.participant1_last_read
    )

    if other_last_read:
        other_unread = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.created_at > other_last_read,
            Message.sender_id != other_user_id,
        ).count()
    else:
        other_unread = db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != other_user_id,
        ).count()

    ws_payload = {
        "type": "new_message",
        "conversation_id": conversation_id,
        "unread_count": other_unread,
        "message": {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "sender_name": current_user.full_name,
            "sender_picture": current_user.profile_picture,
            "content": message.content,
            "created_at": message.created_at.isoformat(),
            "post_id": message.post_id,
            "post_subject": message.post_subject,
            "post_picture": message.post_picture,
        },
    }
    await manager.send_to_user(other_user_id, ws_payload)

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": current_user.full_name,
        "sender_picture": current_user.profile_picture,
        "content": message.content,
        "created_at": message.created_at,
        "post_id": message.post_id,
        "post_subject": message.post_subject,
        "post_picture": message.post_picture,
    }


@router.get("/check/{other_user_id}")
def check_conversation(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Conversation).filter(
        or_(
            and_(Conversation.participant1_id == current_user.id, Conversation.participant2_id == other_user_id),
            and_(Conversation.participant1_id == other_user_id, Conversation.participant2_id == current_user.id),
        )
    ).first()

    if existing:
        return {"exists": True, "conversation_id": existing.id}
    return {"exists": False, "conversation_id": None}