"""Chat API endpoint powered by LangGraph agent pipeline."""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.database import get_db
from app.models.chat import ChatMessage, ChatSession

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    text: str
    places: list[dict] = Field(default_factory=list)
    session_id: str
    intent: str = ""
    district: str | None = None
    category: str | None = None


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Send a message to the AI agent and get a response with recommended places."""
    session_id = req.session_id or str(uuid.uuid4())

    # Get or create session
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id, title=req.message[:50])
        db.add(session)
        db.commit()

    # Load conversation history from DB (last 10 messages)
    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    messages = [
        {"role": m.role, "content": m.content}
        for m in reversed(history_rows)
    ]

    # Save user message
    db.add(ChatMessage(session_id=session_id, role="user", content=req.message))
    db.commit()

    if not settings.OPENAI_API_KEY:
        fallback_text = "AI 기능을 사용하려면 OPENAI_API_KEY를 설정해주세요."
        db.add(ChatMessage(session_id=session_id, role="assistant", content=fallback_text))
        db.commit()
        return ChatResponse(text=fallback_text, places=[], session_id=session_id)

    from app.agent.graph import run_agent

    result = run_agent(
        user_message=req.message,
        db=db,
        messages=messages,
    )

    # Save assistant message
    places_data = result.get("response_places", [])
    db.add(ChatMessage(
        session_id=session_id,
        role="assistant",
        content=result["response_text"],
        places_json=json.dumps(places_data, ensure_ascii=False) if places_data else None,
    ))
    db.commit()

    return ChatResponse(
        text=result["response_text"],
        places=places_data,
        session_id=session_id,
        intent=result.get("intent", ""),
        district=result.get("district"),
        category=result.get("category"),
    )


@router.post("/stream")
def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    """Stream a chat response via SSE (Server-Sent Events)."""
    session_id = req.session_id or str(uuid.uuid4())

    # Get or create session
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id, title=req.message[:50])
        db.add(session)
        db.commit()

    # Load conversation history
    history_rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    messages = [{"role": m.role, "content": m.content} for m in reversed(history_rows)]

    # Save user message
    db.add(ChatMessage(session_id=session_id, role="user", content=req.message))
    db.commit()

    if not settings.OPENAI_API_KEY:
        def _fallback():
            yield {"event": "error", "data": json.dumps({"text": "OPENAI_API_KEY를 설정해주세요."})}
        return EventSourceResponse(_fallback())

    from app.agent.graph import run_agent_stream

    def _stream():
        full_text = ""
        places_data = []

        for event in run_agent_stream(req.message, db, messages):
            if event["type"] == "intent":
                yield {
                    "event": "intent",
                    "data": json.dumps({**event["data"], "session_id": session_id}, ensure_ascii=False),
                }
            elif event["type"] == "token":
                yield {"event": "token", "data": json.dumps({"text": event["data"]}, ensure_ascii=False)}
            elif event["type"] == "places":
                places_data = event["data"]
                yield {"event": "places", "data": json.dumps({"places": places_data}, ensure_ascii=False)}
            elif event["type"] == "done":
                full_text = event["data"]
                yield {"event": "done", "data": json.dumps({"session_id": session_id}, ensure_ascii=False)}

        # Save assistant message after streaming completes
        db.add(ChatMessage(
            session_id=session_id,
            role="assistant",
            content=full_text,
            places_json=json.dumps(places_data, ensure_ascii=False) if places_data else None,
        ))
        db.commit()

    return EventSourceResponse(_stream())


class SessionOut(BaseModel):
    id: str
    title: str | None
    created_at: str
    message_count: int = 0


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    """List recent chat sessions."""
    sessions = (
        db.query(ChatSession)
        .order_by(ChatSession.updated_at.desc())
        .limit(20)
        .all()
    )
    result = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append(SessionOut(
            id=s.id,
            title=s.title,
            created_at=s.created_at.isoformat() if s.created_at else "",
            message_count=count,
        ))
    return result


class MessageOut(BaseModel):
    role: str
    content: str
    places: list[dict] = Field(default_factory=list)
    created_at: str = ""


@router.get("/history/{session_id}", response_model=list[MessageOut])
def get_history(session_id: str, db: Session = Depends(get_db)):
    """Get all messages for a session."""
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [
        MessageOut(
            role=m.role,
            content=m.content,
            places=json.loads(m.places_json) if m.places_json else [],
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in rows
    ]


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and its messages."""
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.query(ChatSession).filter(ChatSession.id == session_id).delete()
    db.commit()
    return {"status": "ok"}
