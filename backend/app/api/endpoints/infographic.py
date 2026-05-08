from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.api.deps import SupabaseDep
from app.services.infographic_service import generate_infographic_data

router = APIRouter()

class InfographicRequest(BaseModel):
    concept_id: str
    language: str = "es"

@router.post("/generate")
async def api_generate_infographic(
    req: InfographicRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    """
    Endpoint to generate infographic data for a specific concept.
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
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed.")

    # 2. Fetch concept context — use chunk_text for richer content when available
    concept_resp = (
        supabase.table("concepts")
        .select("label, context, chunk_text")
        .eq("id", req.concept_id)
        .single()
        .execute()
    )

    if not concept_resp.data:
        raise HTTPException(status_code=404, detail="Concept not found.")

    concept = concept_resp.data

    # Prefer chunk_text (full PDF excerpt) over context (short summary)
    # chunk_text gives the LLM much more material to extract facts from
    rich_context = concept.get("chunk_text") or concept.get("context") or ""
    if not rich_context.strip():
        raise HTTPException(status_code=422, detail="Concept has no text content to analyze.")

    # 3. Generate data
    try:
        data = await generate_infographic_data(
            concept_label=concept["label"],
            context=rich_context,
            language=req.language
        )
        return data
    except Exception as e:
        print(f"[InfographicAPI] Error: {e}")
        raise HTTPException(status_code=503, detail="Infographic generator is busy. Try again.")
