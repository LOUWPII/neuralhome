import json
from openai import OpenAI
from app.core.config import settings

_client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

_MODEL = "llama-3.3-70b-versatile"

FLASHCARDS_GENERATION_PROMPT = """
Eres un profesor experto en la creación de tarjetas de estudio (flashcards) para el repaso espaciado.
Tu tarea es generar 10 flashcards basadas ESTRICTAMENTE en el siguiente contexto.

CONTEXTO:
{contexto}

REGLAS:
1. Genera exactamente 10 flashcards.
2. Cada flashcard debe tener uno de los dos tipos siguientes:
   - "pregunta": Una pregunta directa en el frente, y la respuesta corta en el reverso.
   - "completar": Una frase con un espacio en blanco (representado por "___") en el frente, y la palabra o concepto que falta en el reverso.
3. El contenido debe ser conciso, ideal para memorización rápida.
4. Devuelve el resultado en formato JSON estricto, sin bloques de código ni texto adicional.

Estructura JSON esperada:
{{
    "flashcards": [
        {{
            "id": 1,
            "tipo": "pregunta",
            "frente": "¿Qué es X?",
            "reverso": "Es una Y."
        }},
        {{
            "id": 2,
            "tipo": "completar",
            "frente": "El componente principal de X es ___.",
            "reverso": "Y"
        }}
    ]
}}
"""

async def generar_flashcards(contexto: str) -> dict:
    prompt = FLASHCARDS_GENERATION_PROMPT.format(contexto=contexto)
    
    try:
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
        raw_text = response.choices[0].message.content
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError("El modelo LLM no devolvió un JSON válido.") from e
    except Exception as e:
        raise RuntimeError(f"Error generando flashcards: {e}")
