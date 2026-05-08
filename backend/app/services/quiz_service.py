import json
import asyncio
from openai import OpenAI
from app.core.config import settings

"""
Módulo de Cuestionario (Quiz Module)
------------------------------------
Genera cuestionarios estructurados y evalúa respuestas del usuario.
Usa asyncio.to_thread() para no bloquear el event loop de FastAPI.
"""

# Configuración del cliente LLM (Groq)
_client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

# Modelo robusto para generación de JSON y evaluación semántica
_MODEL = "llama-3.3-70b-versatile"

QUIZ_GENERATION_PROMPT = """
Eres un profesor experto en crear evaluaciones educativas.
Tu tarea es generar un cuestionario basado ESTRICTAMENTE en el siguiente contexto.

CONTEXTO:
{contexto}

IDIOMA Y REGLAS:
1. {language_directive}
2. Genera exactamente 7 preguntas en total mezclando los siguientes tipos:
   - 3 preguntas de tipo "opcion_multiple" (con 4 opciones).
   - 2 preguntas de tipo "abierta".
   - 2 preguntas de tipo "verdadero_falso".
3. Todas las preguntas y respuestas deben basarse únicamente en la información proporcionada en el CONTEXTO.
4. Devuelve el cuestionario en formato JSON, sin texto adicional ni bloques de markdown.

Estructura JSON esperada:
{{
    "cuestionario": [
        {{
            "id": 1,
            "enunciado": "...",
            "tipo": "opcion_multiple",
            "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
            "respuesta_correcta": "Opción A"
        }},
        {{
            "id": 2,
            "enunciado": "...",
            "tipo": "abierta"
        }},
        {{
            "id": 3,
            "enunciado": "...",
            "tipo": "verdadero_falso",
            "opciones": ["Verdadero", "Falso"],
            "respuesta_correcta": "Verdadero"
        }}
    ]
}}
"""

OPEN_EVALUATION_PROMPT = """
Eres un evaluador académico estricto pero justo.
Evalúa la respuesta del estudiante a la siguiente pregunta abierta, basándote en el contexto proporcionado.

PREGUNTA: {pregunta}
RESPUESTA DEL ESTUDIANTE: {respuesta_usuario}

CONTEXTO:
{contexto}

IDIOMA Y REGLAS:
1. {language_directive}
2. Determina si la respuesta del estudiante captura el significado y los puntos clave de forma correcta según el contexto.
3. Calcula una puntuación (0 a 100).
4. Proporciona una breve retroalimentación explicativa (1-2 oraciones).
5. Devuelve únicamente un JSON, sin bloques de código ni texto adicional.

Estructura JSON esperada:
{{
    "correcta": true,
    "puntuacion": 85,
    "feedback": "..."
}}
"""


# ---------------------------------------------------------------------------
# Sync helpers — run in a thread via asyncio.to_thread()
# ---------------------------------------------------------------------------

def _sync_generate_quiz(prompt: str) -> dict:
    response = _client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": "You are a JSON generating system. Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=2048,
    )
    return json.loads(response.choices[0].message.content)


def _sync_evaluate_open(prompt: str) -> dict:
    response = _client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": "You are a JSON generating system. Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
        max_tokens=1024,
    )
    return json.loads(response.choices[0].message.content)


# ---------------------------------------------------------------------------
# Public async API
# ---------------------------------------------------------------------------

async def generar_cuestionario(contexto: str, language: str = "es") -> dict:
    """
    Genera un cuestionario estructurado basado en el contexto proporcionado.
    La llamada sync se ejecuta en un hilo para no bloquear el event loop.
    """
    language_directive = (
        "Responde EXCLUSIVAMENTE en Español. Todo el texto debe estar en Español."
        if language == "es"
        else "Respond EXCLUSIVELY in English. All text must be in English."
    )

    prompt = QUIZ_GENERATION_PROMPT.format(
        contexto=contexto,
        language_directive=language_directive
    )
    
    print(f"[Quiz] Generating {language} quiz ({len(contexto)} chars of context)...")
    try:
        result = await asyncio.to_thread(_sync_generate_quiz, prompt)
        print(f"[Quiz] Done — {len(result.get('cuestionario', []))} questions generated.")
        return result
    except json.JSONDecodeError as e:
        raise ValueError("El modelo LLM no devolvió un JSON válido.") from e
    except Exception as e:
        print(f"[Quiz] Error: {e}")
        raise RuntimeError(f"Error generando cuestionario: {e}")


async def evaluar_respuesta_abierta(pregunta: str, respuesta_usuario: str, contexto: str, language: str = "es") -> dict:
    """
    Evalúa una respuesta a una pregunta abierta comparándola con el contexto.
    Ejecuta la llamada sync en un hilo para no bloquear el event loop.
    """
    language_directive = (
        "Responde EXCLUSIVAMENTE en Español. Todo el texto debe estar en Español."
        if language == "es"
        else "Respond EXCLUSIVELY in English. All text must be in English."
    )

    prompt = OPEN_EVALUATION_PROMPT.format(
        pregunta=pregunta,
        respuesta_usuario=respuesta_usuario,
        contexto=contexto,
        language_directive=language_directive
    )
    try:
        result = await asyncio.to_thread(_sync_evaluate_open, prompt)
        return result
    except json.JSONDecodeError as e:
        raise ValueError("Error parseando el JSON de evaluación.") from e
    except Exception as e:
        raise RuntimeError(f"Error evaluando respuesta abierta: {e}")


def evaluar_respuesta_cerrada(respuesta_usuario: str, respuesta_correcta: str) -> bool:
    """Evalúa automáticamente una respuesta de opción múltiple o verdadero/falso."""
    return respuesta_usuario.strip().lower() == respuesta_correcta.strip().lower()
