from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Any
from app.api.deps import SupabaseDep
from app.services.quiz_service import generar_cuestionario, evaluar_respuesta_abierta, evaluar_respuesta_cerrada

router = APIRouter()

# --- Schemas ---

class GenerateQuizRequest(BaseModel):
    concept_id: str
    language: str = "es"

class EvaluateOpenAnswerRequest(BaseModel):
    concept_id: str
    pregunta: str
    respuesta_usuario: str
    language: str = "es"

class EvaluateClosedAnswerRequest(BaseModel):
    respuesta_usuario: str
    respuesta_correcta: str

class QuizResponse(BaseModel):
    id: Optional[str] = None
    cuestionario: list[dict]
    created_at: Optional[str] = None

class OpenAnswerEvaluationResponse(BaseModel):
    correcta: bool
    puntuacion: int
    feedback: str

class ClosedAnswerEvaluationResponse(BaseModel):
    correcta: bool


# --- Helper to get concept context and user_id ---
def get_concept_context(supabase, concept_id: str, authorization: str) -> tuple[str, str]:
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
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed.")

    concept_resp = (
        supabase.table("concepts")
        .select("id, chunk_text, palace_id")
        .eq("id", concept_id)
        .single()
        .execute()
    )

    if not concept_resp.data:
        raise HTTPException(status_code=404, detail="Concept not found.")

    # Ownership check
    palace_resp = (
        supabase.table("palaces")
        .select("id")
        .eq("id", concept_resp.data["palace_id"])
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    if not palace_resp.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    return concept_resp.data.get("chunk_text") or "", user_id


# --- Endpoints ---

@router.post("/generate", response_model=QuizResponse)
async def api_generate_quiz(
    req: GenerateQuizRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    contexto, user_id = get_concept_context(supabase, req.concept_id, authorization)
    if not contexto:
        raise HTTPException(status_code=400, detail="No text context available for this concept.")
    
    quiz_data = await generar_cuestionario(contexto, req.language)
    preguntas = quiz_data.get("cuestionario", [])
    
    # Save to database
    try:
        insert_resp = (
            supabase.table("quizzes")
            .insert({
                "user_id": user_id,
                "concept_id": req.concept_id,
                "questions": preguntas
            })
            .execute()
        )
        saved_quiz = insert_resp.data[0] if insert_resp.data else None
    except Exception as e:
        print(f"[QuizAPI] DB Error saving quiz: {e}")
        saved_quiz = None

    return QuizResponse(
        id=saved_quiz["id"] if saved_quiz else None,
        cuestionario=preguntas,
        created_at=saved_quiz["created_at"] if saved_quiz else None
    )

@router.get("/last", response_model=QuizResponse)
async def api_get_last_quiz(
    concept_id: str,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    _, user_id = get_concept_context(supabase, concept_id, authorization)
    
    try:
        resp = (
            supabase.table("quizzes")
            .select("*")
            .eq("user_id", user_id)
            .eq("concept_id", concept_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            last_quiz = resp.data[0]
            return QuizResponse(
                id=last_quiz["id"],
                cuestionario=last_quiz["questions"],
                created_at=last_quiz["created_at"]
            )
    except Exception as e:
        print(f"[QuizAPI] DB Error fetching last quiz: {e}")
        
    # Return empty response if no previous quiz
    return QuizResponse(cuestionario=[])


@router.post("/evaluate/open", response_model=OpenAnswerEvaluationResponse)
async def api_evaluate_open(
    req: EvaluateOpenAnswerRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    contexto, _ = get_concept_context(supabase, req.concept_id, authorization)
    if not contexto:
        raise HTTPException(status_code=400, detail="No text context available for this concept.")
    
    eval_result = await evaluar_respuesta_abierta(req.pregunta, req.respuesta_usuario, contexto, req.language)
    return OpenAnswerEvaluationResponse(
        correcta=eval_result.get("correcta", False),
        puntuacion=eval_result.get("puntuacion", 0),
        feedback=eval_result.get("feedback", "No feedback provided.")
    )


@router.post("/evaluate/closed", response_model=ClosedAnswerEvaluationResponse)
async def api_evaluate_closed(req: EvaluateClosedAnswerRequest):
    # Does not need supabase or context, evaluated statically
    is_correct = evaluar_respuesta_cerrada(req.respuesta_usuario, req.respuesta_correcta)
    return ClosedAnswerEvaluationResponse(correcta=is_correct)
