import json
from openai import OpenAI
from app.core.config import settings

"""
Módulo de Cuestionario (Quiz Module)
------------------------------------
Este módulo se encarga de generar cuestionarios estructurados a partir de un texto de contexto
(por ejemplo, un concepto RAG extraído del PDF del usuario) y de evaluar las respuestas del usuario.

Requisitos técnicos:
- Lenguaje: Python 3
- Dependencias: openai (para la API compatible con Groq)
- Salida esperada: JSON estructurado
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

REGLAS:
1. Genera exactamente 7 preguntas en total mezclando los siguientes tipos:
   - 3 preguntas de tipo "opcion_multiple" (con 4 opciones).
   - 2 preguntas de tipo "abierta".
   - 2 preguntas de tipo "verdadero_falso".
2. Todas las preguntas y respuestas deben basarse únicamente en la información proporcionada en el CONTEXTO.
3. Devuelve el cuestionario en formato JSON, sin texto adicional ni bloques de markdown (```json).

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

REGLAS:
1. Determina si la respuesta del estudiante captura el significado y los puntos clave de forma correcta según el contexto.
2. Calcula una puntuación (0 a 100).
3. Proporciona una breve retroalimentación explicativa (1-2 oraciones).
4. Devuelve únicamente un JSON, sin bloques de código ni texto adicional.

Estructura JSON esperada:
{{
    "correcta": true,  // true si puntuación >= 60, false en caso contrario
    "puntuacion": 85,
    "feedback": "..."
}}
"""


async def generar_cuestionario(contexto: str) -> dict:
    """
    Genera un cuestionario estructurado basado en el contexto proporcionado.
    
    Args:
        contexto (str): Texto fuente (concepto/objeto de estudio) sobre el cual generar preguntas.
        
    Returns:
        dict: Objeto con la lista de preguntas generadas.
        
    Example:
        >>> contexto = "El Sol es una estrella amarilla compuesta principalmente de hidrógeno y helio."
        >>> quiz = await generar_cuestionario(contexto)
        >>> print(quiz['cuestionario'][0]['tipo'])
        'opcion_multiple'
    """
    prompt = QUIZ_GENERATION_PROMPT.format(contexto=contexto)
    
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
        raise RuntimeError(f"Error generando cuestionario: {e}")


async def evaluar_respuesta_abierta(pregunta: str, respuesta_usuario: str, contexto: str) -> dict:
    """
    Evalúa una respuesta a una pregunta abierta comparándola con el contexto utilizando un LLM.
    
    Args:
        pregunta (str): El enunciado de la pregunta abierta.
        respuesta_usuario (str): La respuesta escrita por el estudiante.
        contexto (str): El material de estudio original que contiene la verdad semántica.
        
    Returns:
        dict: Resultado de la evaluación (correcta, puntuación y feedback).
    """
    prompt = OPEN_EVALUATION_PROMPT.format(
        pregunta=pregunta,
        respuesta_usuario=respuesta_usuario,
        contexto=contexto
    )
    
    try:
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
        raw_text = response.choices[0].message.content
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError("Error parseando el JSON de evaluación.") from e
    except Exception as e:
        raise RuntimeError(f"Error evaluando respuesta abierta: {e}")


def evaluar_respuesta_cerrada(respuesta_usuario: str, respuesta_correcta: str) -> bool:
    """
    Evalúa automáticamente una respuesta de opción múltiple o verdadero/falso.
    
    Args:
        respuesta_usuario (str): La opción seleccionada por el usuario.
        respuesta_correcta (str): La respuesta correcta esperada.
        
    Returns:
        bool: True si coinciden exactamente (insensible a mayúsculas y espacios extra).
        
    Example:
        >>> evaluar_respuesta_cerrada(" Opción A ", "opción a")
        True
    """
    # Normalización simple: minúsculas y eliminación de espacios en los extremos
    resp_user_norm = respuesta_usuario.strip().lower()
    resp_corr_norm = respuesta_correcta.strip().lower()
    
    return resp_user_norm == resp_corr_norm

