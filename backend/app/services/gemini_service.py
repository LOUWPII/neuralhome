import json
from openai import OpenAI
from app.core.config import settings

# Groq uses OpenAI-compatible API
client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

SYSTEM_PROMPT = """
You are an expert educational AI and architect for a 'Mind Palace' 3D application.
The user will provide the text extracted from a PDF.
Your task is to analyze the text and extract the most important concepts and organize them into a deterministic JSON structure.

For each key concept extracted:
1. `id`: generate a unique string (easiest is a sequential 1, 2, 3...)
2. `label`: A very short name of the concept (max 3-4 words).
3. `context`: The original text/paragraph related to this concept in the PDF (keep it concise but informative).
4. `feynman_summary`: A very simplified explanation (level: 5 year old) of this concept.
5. `model_type`: Suggest a simple 3D model primitive (e.g., 'cube', 'sphere', 'cylinder', 'pyramid') or a simple object name that represents the concept visually.
6. `position`: Assign a 3D coordinate dict { "x": float, "y": float, "z": float } for where this object should be placed in the room.
   - The room is roughly a 20x20 space. 
   - Spread the objects out so they do not collide!
   - Example position: {"x": 2.5, "y": 0.0, "z": -3.0} (Y is usually up, so keeping it 0.0 or slightly above floor is good).

Ensure your entire output is strictly a VALID JSON object of the following structure:
{
    "title": "Suggested title for this document/palace",
    "concepts": [
        {
            "id": "1",
            "label": "Concept Name",
            "context": "Original text...",
            "feynman_summary": "Simple text...",
            "model_type": "cube",
            "position": {"x": 0.0, "y": 0.0, "z": 0.0}
        }
    ]
}

DO NOT print ANY markdown formatting outside of the JSON. Only return the raw JSON object.
"""

async def extract_concepts_from_text(text: str) -> dict:
    """
    Calls Groq (Llama 3.3 70B) to process the text and return the JSON Mind Palace architecture.
    Uses OpenAI-compatible API via Groq.
    """
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
        
        raw_text = response.choices[0].message.content
        print(f"Groq response received ({len(raw_text)} chars)")
        
        data = json.loads(raw_text)
        return data
        
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Groq: {raw_text}")
        raise ValueError("Invalid JSON response from Groq") from e
    except Exception as e:
        print(f"Groq API Error: {type(e).__name__}: {e}")
        raise
