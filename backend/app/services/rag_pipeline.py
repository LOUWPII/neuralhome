"""
RAG Pipeline - Full Implementation
Steps:
  1. Parse PDF → raw text
  2. Split text into overlapping chunks (~500 tokens each)
  3. Generate embeddings for each chunk (local, open-source)
  4. Call LLM to extract Mind Palace structure from combined text
  5. Match each concept to its most relevant chunk (for retrieval later)
  6. Return structured palace data with embeddings ready for Supabase
"""
import io
import re
import fitz  # PyMuPDF is much faster than pypdf
from app.services.embedding_service import embed_texts
from app.services.llm_service import extract_palace_from_chunks, ROOM_ANCHORS

# ---------------------------------------------------------------------------
# Chunking config
# Targets ~500 tokens per chunk with 50-token overlap.
# Rule of thumb: 1 token ≈ 4 characters in English.
# ---------------------------------------------------------------------------
CHUNK_SIZE_CHARS = 1200   # ~300 tokens (faster, less data)
CHUNK_OVERLAP_CHARS = 120  # ~30 tokens overlap


def _extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract raw text from PDF bytes using PyMuPDF (much faster)."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_text = []
    for page in doc:
        text = page.get_text()
        if text:
            pages_text.append(text.strip())
    return "\n\n".join(pages_text)


def _split_into_chunks(text: str) -> list[str]:
    """Split text into overlapping chunks (smaller for speed), ensuring no infinite loops backwards."""
    # Normalise whitespace
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE_CHARS
        if end < len(text):
            # Prefer paragraph break, else sentence, else cut
            boundary = text.rfind("\n\n", start, end)
            if boundary == -1:
                boundary = text.rfind(". ", start, end)
            if boundary != -1:
                end = boundary + 1
                
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
            
        # Calculate next start, but ensure we always move FORWARD
        next_start = end - CHUNK_OVERLAP_CHARS
        if next_start <= start:
            start = end  # If the boundary resulted in a tiny chunk, don't overlap backwards
        else:
            start = next_start
            
    # Limit to first 30 chunks to keep processing time low
    return chunks[:30]


def _find_best_chunk(concept_context: str, chunks: list[str]) -> str:
    """
    Find the chunk most relevant to the concept's context using
    simple keyword overlap (fast, no API needed for this step).
    Falls back to first chunk if no match.
    """
    if not chunks:
        return concept_context

    context_words = set(concept_context.lower().split())
    best_chunk = chunks[0]
    best_score = 0

    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        overlap = len(context_words & chunk_words)
        if overlap > best_score:
            best_score = overlap
            best_chunk = chunk

    return best_chunk


async def process_pdf_and_generate_palace(pdf_bytes: bytes, theme: str = "neon_dev", dynamic_anchors: list = None) -> dict:
    """
    Full RAG pipeline:
    Returns a palace dict with concepts that include an `embedding` and `chunk_text` field.
    """
    import time
    start_total = time.time()

    # --- Step 1: Extract text -------------------------------------------------
    start_step = time.time()
    text = _extract_text_from_pdf(pdf_bytes)
    if not text.strip():
        raise ValueError("No readable text found in the PDF. Please check the file.")
    print(f"[RAG] Step 1 (Extract): {len(text)} chars in {time.time() - start_step:.2f}s")

    # --- Step 2: Chunk -------------------------------------------------------
    start_step = time.time()
    chunks = _split_into_chunks(text)
    print(f"[RAG] Step 2 (Chunking): {len(chunks)} chunks in {time.time() - start_step:.2f}s")

    # --- Step 3: Embed chunks (Remote HF API) -------------------------------
    start_step = time.time()
    print(f"[RAG] Generating embeddings for {len(chunks)} chunks...")
    import asyncio
    loop = asyncio.get_event_loop()
    chunk_embeddings = await loop.run_in_executor(None, embed_texts, chunks)
    print(f"[RAG] Step 3 (Embeddings): {len(chunks)} chunks in {time.time() - start_step:.2f}s")

    # --- Step 4: LLM extraction (Provider-Agnostic) -------------------------
    start_step = time.time()
    summary_text = text[:8000] if len(text) > 8000 else text
    print(f"[RAG] Sending {len(summary_text)} chars to LLM for extraction...")
    palace_data = await extract_palace_from_chunks(summary_text, theme, custom_anchors=dynamic_anchors)
    
    # Enforce strict 1-to-1 mapping limit
    anchors = dynamic_anchors if dynamic_anchors else ROOM_ANCHORS.get(theme, ROOM_ANCHORS["neon_dev"])
    concepts = palace_data.get("concepts", [])
    if len(concepts) > len(anchors):
        print(f"[RAG] Warning: LLM extracted {len(concepts)} concepts, but only {len(anchors)} anchors available. Truncating.")
        palace_data["concepts"] = concepts[:len(anchors)]
        
    print(f"[RAG] Step 4 (LLM Extraction): {len(palace_data.get('concepts', []))} concepts in {time.time() - start_step:.2f}s")

    # --- Step 5: Attach embeddings + source chunk to each concept ------------
    start_step = time.time()
    for concept in palace_data.get("concepts", []):
        context = concept.get("context", concept.get("label", ""))
        best_chunk = _find_best_chunk(context, chunks)
        concept["chunk_text"] = best_chunk
        best_idx = chunks.index(best_chunk) if best_chunk in chunks else 0
        concept["embedding"] = chunk_embeddings[best_idx]
    
    print(f"[RAG] Step 5 (Matching): {time.time() - start_step:.2f}s")
    print(f"[RAG] Total Pipeline Time: {time.time() - start_total:.2f}s")

    return palace_data