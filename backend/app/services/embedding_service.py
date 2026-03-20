"""
Embedding Service - Remote Open Source via Hugging Face Inference API
Free, fast, and no local CPU load.
"""
import requests
import json
from app.core.config import settings

# Using an open-source embedding model that strictly returns 384-dim feature extraction vectors
MODEL_ID = "BAAI/bge-small-en-v1.5"
API_URL = f"https://router.huggingface.co/hf-inference/models/{MODEL_ID}"

# Reuse session for speed
_session = requests.Session()

def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings using Hugging Face Inference API.
    """
    if not settings.huggingface_api_key:
        print("[EmbeddingService] WARNING: No HUGGINGFACE_API_KEY found. Falling back to local placeholder.")
        # Return dummy embeddings so it doesn't crash, but tell user to get key
        return [[0.0] * 384 for _ in texts]

    headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}
    
    try:
        # Smaller batch size for Inference API if needed, but let's try session first
        response = _session.post(API_URL, headers=headers, json={"inputs": texts, "options": {"wait_for_model": True}}, timeout=30)
        
        if response.status_code != 200:
            print(f"[EmbeddingService] API Error {response.status_code}: {response.text}")
            raise Exception(f"HF API Error: {response.text}")
            
        return response.json()
    except Exception as e:
        print(f"[EmbeddingService] Unexpected error: {e}")
        # Final fallback for development
        return [[0.0] * 384 for _ in texts]

def embed_single(text: str) -> list[float]:
    """Generate embedding for a single text string."""
    return embed_texts([text])[0]
