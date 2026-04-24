"""
chat.py — Socratic Tutor endpoint (CU-003)

POST /api/chat/socratic
  Receives a user message within the context of a specific Knowledge Object.
  Returns the Socratic Tutor's reply grounded in that concept's RAG chunk.
"""
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.api.deps import SupabaseDep
from app.services.llm_service import chat_about_concept, feynman_voice_stream

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class SocraticChatRequest(BaseModel):
    concept_id: str
    message: str
    language: str = "en"   # 'en' | 'es' — set by the client from user_metadata
    history: list[ChatMessage] = []


class SocraticChatResponse(BaseModel):
    reply: str
    concept_label: str
    anchor_label: str


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/socratic", response_model=SocraticChatResponse)
async def socratic_chat(
    req: SocraticChatRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None),
):
    """
    Socratic Tutor chat grounded in a specific concept's RAG chunk (CU-003).

    Flow:
      1. Authenticate the user via JWT.
      2. Fetch the concept row from Supabase (label, chunk_text, anchor_id, palace theme).
      3. Verify the concept belongs to a palace owned by the authenticated user.
      4. Forward context + history to the LLM service.
      5. Return the tutor reply.
    """
    # 1. Auth ----------------------------------------------------------------
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="User not authenticated.")

    try:
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token.")
        user_id = auth_response.user.id
        # Language preference stored in user_metadata; request value takes priority
        meta_lang = (auth_response.user.user_metadata or {}).get("language", "en")
        language  = req.language if req.language in ("en", "es") else meta_lang
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed.")

    # 2. Fetch concept -------------------------------------------------------
    try:
        concept_resp = (
            supabase.table("concepts")
            .select("id, label, chunk_text, anchor_id, palace_id")
            .eq("id", req.concept_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching concept: {e}")

    if not concept_resp.data:
        raise HTTPException(status_code=404, detail="Concept not found.")

    concept = concept_resp.data

    # 3. Ownership check — verify the parent palace belongs to the user ------
    try:
        palace_resp = (
            supabase.table("palaces")
            .select("id, description")
            .eq("id", concept["palace_id"])
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error verifying palace: {e}")

    if not palace_resp.data:
        raise HTTPException(
            status_code=403,
            detail="Access denied: this concept does not belong to your palace."
        )

    palace = palace_resp.data
    # The theme is stored in the description field (current architecture)
    theme = palace.get("description") or "neon_dev"

    # 4. Build context & resolve anchor label --------------------------------
    chunk_text = concept.get("chunk_text") or ""
    concept_label = concept.get("label", "Unknown concept")
    anchor_id = concept.get("anchor_id", "")

    # Resolve a human-readable anchor label from the registry in llm_service
    from app.services.llm_service import ROOM_ANCHORS
    anchors_for_theme = ROOM_ANCHORS.get(theme, ROOM_ANCHORS["neon_dev"])
    anchor_label = next(
        (a["label"] for a in anchors_for_theme if a["id"] == anchor_id),
        anchor_id or concept_label,   # graceful fallback
    )

    # 5. Build history in the format the LLM service expects ----------------
    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    # 6. Call Socratic tutor ------------------------------------------------
    try:
        reply = await chat_about_concept(
            concept_label=concept_label,
            anchor_label=anchor_label,
            theme=theme,
            retrieved_chunks=[chunk_text] if chunk_text else ["No source context available."],
            user_message=req.message,
            history=history_dicts,
            language=language,
        )
    except Exception as e:
        print(f"[Chat] LLM error: {e}")
        raise HTTPException(status_code=503, detail="Tutor unavailable. Try again shortly.")

    return SocraticChatResponse(
        reply=reply,
        concept_label=concept_label,
        anchor_label=anchor_label,
    )


# ---------------------------------------------------------------------------
# Feynman Voice Mentor — Streaming SSE Endpoint
# ---------------------------------------------------------------------------

class FeynmanVoiceRequest(BaseModel):
    concept_id: str
    message: str
    language: str = "en"
    history: list[ChatMessage] = []


@router.post("/feynman-voice")
async def feynman_voice(
    req: FeynmanVoiceRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None),
):
    """
    Streaming endpoint for Feynman Voice Mentor.
    Returns text/event-stream so the frontend can feed tokens to TTS in real time.
    """
    # 1. Auth
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="User not authenticated.")

    try:
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token.")
        user_id = auth_response.user.id
        meta_lang = (auth_response.user.user_metadata or {}).get("language", "en")
        language = req.language if req.language in ("en", "es") else meta_lang
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed.")

    # 2. Fetch concept
    try:
        concept_resp = (
            supabase.table("concepts")
            .select("id, label, chunk_text, anchor_id, palace_id")
            .eq("id", req.concept_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error fetching concept: {e}")

    if not concept_resp.data:
        raise HTTPException(status_code=404, detail="Concept not found.")

    concept = concept_resp.data

    # 3. Ownership check
    try:
        palace_resp = (
            supabase.table("palaces")
            .select("id, description")
            .eq("id", concept["palace_id"])
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error verifying palace: {e}")

    if not palace_resp.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    palace = palace_resp.data
    theme = palace.get("description") or "neon_dev"

    # 4. Resolve
    chunk_text = concept.get("chunk_text") or ""
    concept_label = concept.get("label", "Unknown concept")
    anchor_id = concept.get("anchor_id", "")

    from app.services.llm_service import ROOM_ANCHORS
    anchors_for_theme = ROOM_ANCHORS.get(theme, ROOM_ANCHORS["neon_dev"])
    anchor_label = next(
        (a["label"] for a in anchors_for_theme if a["id"] == anchor_id),
        anchor_id or concept_label,
    )

    history_dicts = [{"role": m.role, "content": m.content} for m in req.history]

    # 5. Stream via SSE
    import json
    async def event_generator():
        try:
            for token in feynman_voice_stream(
                concept_label=concept_label,
                anchor_label=anchor_label,
                theme=theme,
                retrieved_chunks=[chunk_text] if chunk_text else ["No source context available."],
                user_message=req.message,
                history=history_dicts,
                language=language,
            ):
                safe_token = json.dumps({"token": token})
                yield f"data: {safe_token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"[FeynmanVoice] stream error: {e}")
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
