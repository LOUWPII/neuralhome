from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import json
import logging

from app.services.flashcards_service import generar_flashcards
from app.api.deps import SupabaseDep

router = APIRouter()
logger = logging.getLogger(__name__)

class FlashcardsGenerateRequest(BaseModel):
    concept_id: str
    user_id: str

@router.post("/generate")
async def generate_flashcards(req: FlashcardsGenerateRequest, supabase: SupabaseDep):
    try:
        response = supabase.table("concepts").select("context").eq("id", req.concept_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Concept not found")
        
        contexto = response.data[0].get("context", "")
        if not contexto:
            raise HTTPException(status_code=400, detail="Concept content is empty")
        
        flashcards_data = await generar_flashcards(contexto)
        
        return {
            "success": True,
            "flashcards": flashcards_data.get("flashcards", [])
        }
    except Exception as e:
        logger.error(f"Error en /flashcards/generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))
