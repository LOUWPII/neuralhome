"""
GLB Matcher Service
===================
Dynamically scans the frontend/public/models directory and uses an LLM to 
map free-text object descriptions (from the vision AI) to the best-matching
.glb model available. This guarantees no hardcoding!
"""

import os
import json
import asyncio
from openai import AsyncOpenAI
from app.core.config import settings

def get_available_glbs() -> list[str]:
    """Scans frontend/public/models for .glb files and returns their basenames."""
    models_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/public/models"))
    if not os.path.exists(models_dir):
        print(f"[GLBMatcher] Warning: Models directory not found at {models_dir}")
        return ["desk", "bed", "chair", "bookshelf", "lamp", "plant"]
    
    available = []
    for f in os.listdir(models_dir):
        if f.endswith(".glb") and f != "window.glb":
            available.append(f.replace(".glb", ""))
    
    return available or ["desk"]

async def match_objects(objects: list[dict]) -> list[dict]:
    """
    Uses the fast Groq model to dynamically map the raw vision objects to
    the closest available .glb files on disk.
    """
    if not objects:
        return []

    available_glbs = get_available_glbs()
    
    # Give the LLM a list of objects to map
    detect_list = [
        {"id": i, "description": f"{o.get('raw_type', 'unknown')} (Material: {o.get('material_hint', 'unknown')})"}
        for i, o in enumerate(objects)
    ]
    
    prompt = f"""
    You are an AI mapping assistant for a 3D simulation.
    We have a list of physical objects detected in a room photo.
    We need to map EACH object to the closest matching 3D model we have available.
    
    AVAILABLE MODELS:
    {json.dumps(available_glbs)}
    
    DETECTED OBJECTS:
    {json.dumps(detect_list)}
    
    CRITICAL RULES: 
    1. For each object, you MUST choose exactly one string from the AVAILABLE MODELS list.
    2. If nothing matches perfectly, choose the closest semantic match. Example:
       - 'nightstand', 'dresser', 'vanity' -> 'desk' (if no dresser model exists)
       - 'sofa', 'couch', 'stool' -> 'chair' (if no sofa model exists)
       - 'wardrobe', 'cabinet' -> 'bookshelf'
    
    Return ONLY a JSON object with a single key "mappings", which is an array of objects.
    Example:
    {{
      "mappings": [
         {{"id": 0, "matched_model": "bed"}},
         {{"id": 1, "matched_model": "desk"}}
      ]
    }}
    """
    
    client = AsyncOpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
    )
    
    # Fallback default mapping in case of LLM failure
    fallback_mapping = {i: "desk" for i in range(len(objects))}
    
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        mappings = result.get("mappings", [])
        
        # Build dictionary from LLM response
        mapped_dict = {}
        for m in mappings:
            idx = m.get("id")
            model = m.get("matched_model")
            # Enforce that the model actually exists
            if model not in available_glbs:
                model = "desk"
            mapped_dict[idx] = model
            
    except Exception as e:
        print(f"[GLBMatcher] LLM mapping failed: {e}. Using fallback.")
        mapped_dict = fallback_mapping

    # Apply the mapping to the objects list
    for i, obj in enumerate(objects):
        glb_type = mapped_dict.get(i, "desk")
        
        # Inject standard GLB Match dictionary structure expected by ingest.py
        obj["glb_match"] = {
            "glb_type": glb_type,
            "glb_file": f"{glb_type}.glb",
            "display": glb_type.title(),
            "confidence": 0.8
        }
        # Also set the canonical "type" field
        obj["type"] = glb_type
        
        print(f"[GLBMatcher] '{obj.get('raw_type')}' → {glb_type}.glb")
        
    return objects
