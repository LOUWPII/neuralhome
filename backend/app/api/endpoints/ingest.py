from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.rag_pipeline import process_pdf_and_generate_palace
from app.services.llm_service import architect_chat
from app.services.vision_service import analyze_room_photo
from app.services.glb_matcher import match_objects
from app.core.assets import get_glb_for_type
from app.api.deps import SupabaseDep

router = APIRouter()

class ArchitectChatRequest(BaseModel):
    message: str
    history: list[dict] = []

@router.post("/architect")
async def handle_architect_chat(
    req: ArchitectChatRequest,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    """
    Interactive chat endpoint to converse with the Neural Architect before defining a Room.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="User not authenticated.")
        
    try:
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Not authorized")
        
    reply = await architect_chat(req.message, req.history)
    return {"reply": reply}

@router.post("/pdf")
async def ingest_pdf(
    supabase: SupabaseDep,
    file: UploadFile = File(...),
    title: str = Form(None),
    subject: str = Form(None),
    description: str = Form(None),
    objectives: str = Form(None),
    authorization: str = Header(None)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        # --- 0. Get Token from Header ---
        token = None
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]

        if not token:
            raise HTTPException(status_code=401, detail="User not authenticated (token missing).")
        
        print(f"[Ingest] Received token of length {len(token)}")
        # print(f"[Ingest] Token preview: {token[:10]}...{token[-10:]}") # Debug only

        # --- 1. Run full RAG pipeline -----------------------------------------
        theme = description or "neon_dev"
        try:
            pdf_bytes = await file.read()
            palace_data = await process_pdf_and_generate_palace(pdf_bytes, theme)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            import traceback
            print(f"[Ingest] RAG Pipeline Error: {e}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

        # --- 2. Get authenticated user ----------------------------------------
        try:
            auth_response = supabase.auth.get_user(token)
            user_id = auth_response.user.id if auth_response and auth_response.user else None
        except Exception as ae:
            import traceback
            print(f"[Ingest] Auth retrieval failed: {ae}")
            traceback.print_exc()
            user_id = None

        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated.")
        
        print(f"[Ingest] Authenticated user_id: {user_id}")

        # --- 3. Save Palace to Supabase ---------------------------------------
        final_title = title if title else palace_data.get("title", file.filename)
        palace_resp = supabase.table("palaces").insert({
            "user_id": user_id,
            "title": final_title,
            "subject": subject,
            "description": description,
            "objectives": objectives
        }).execute()

        if not palace_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create palace in DB.")

        palace_db = palace_resp.data[0]
        palace_id = palace_db["id"]

        # --- 4. Save Concepts + Embeddings to Supabase -----------------------
        concepts_to_insert = []
        for concept in palace_data.get("concepts", []):
            pos = concept.get("position", {"x": 0.0, "y": 0.0, "z": 0.0})
            embedding = concept.get("embedding")  # list[float] | None

            row = {
                "palace_id": palace_id,
                "label": concept.get("label", "Unknown"),
                "position_x": pos.get("x", 0.0),
                "position_y": pos.get("y", 0.0),
                "position_z": pos.get("z", 0.0),
                "context": concept.get("context", ""),
                "feynman_summary": concept.get("feynman_summary", ""),
                "anchor_id": concept.get("anchor_id", "obj_unassigned"),
                "chunk_text": concept.get("chunk_text", ""),
            }

            # Store embedding as a pgvector-compatible string "[x,y,z,...]"
            if embedding:
                row["embedding"] = str(embedding)

            concepts_to_insert.append(row)

        concepts_db = []
        if concepts_to_insert:
            concepts_resp = supabase.table("concepts").insert(concepts_to_insert).execute()
            concepts_db = concepts_resp.data or []

        palace_db["concepts"] = concepts_db
        return palace_db

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Ingest] Unexpected error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@router.post("/photo-pdf")
async def ingest_photo_pdf(
    supabase: SupabaseDep,
    pdf: UploadFile = File(...),
    photo: UploadFile = File(...),
    title: str = Form(None),
    subject: str = Form(None),
    description: str = Form(None),
    objectives: str = Form(None),
    authorization: str = Header(None)
):
    """
    Combined endpoint: Analyzes a room photo for layout and processes a PDF for RAG.
    Creates a dynamic Mental Palace.
    """
    if not pdf.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # --- 0. Auth ---
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    try:
        auth_user = supabase.auth.get_user(token)
        if not auth_user or not auth_user.user:
            raise HTTPException(status_code=401, detail="Invalid session.")
        user_id = auth_user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid session.")

    try:
        # ── Step 1: Vision — free-text description of the room ────────────────
        photo_bytes = await photo.read()
        room_data = await analyze_room_photo(photo_bytes)
        # vision_service already clamped positions + ran anti-overlap

        objects = room_data.get("objects", [])

        # ── Step 2: GLB Matching — map raw descriptions to available .glb ─────
        # This is the dynamic semantic matching step:
        # "wooden wardrobe" → bookshelf.glb, "leather sofa" → chair.glb, etc.
        objects = await match_objects(objects)
        print(f"[Ingest] GLB matches: { {o['raw_type']: o['glb_match']['glb_type'] for o in objects} }")

        # ── Step 3: Build dynamic anchors for the RAG LLM ────────────────────
        # One anchor per detected + matched object — this is the 1:1 concept mapping.
        dynamic_anchors = []
        for i, obj in enumerate(objects):
            glb_type  = obj["glb_match"]["glb_type"]
            raw_type  = obj.get("raw_type", glb_type)
            label     = obj.get("label", raw_type)
            material  = obj.get("material_hint", "unknown")
            anchor_id = f"dynamic_{glb_type}_{i}"
            dynamic_anchors.append({
                "id": anchor_id,
                "label": label,
                "semantic_hint": f"A {raw_type} made of {material} — matched to {glb_type} model",
                "raw_vision_data": obj,
            })

        # ── Step 4: RAG — process PDF and map concepts to anchors ────────────
        pdf_bytes = await pdf.read()
        palace_data = await process_pdf_and_generate_palace(
            pdf_bytes,
            theme="dynamic",
            dynamic_anchors=dynamic_anchors
        )

        # ── Step 5: Save Palace ───────────────────────────────────────────────
        final_title = title if title else palace_data.get("title", pdf.filename)
        palace_resp = supabase.table("palaces").insert({
            "user_id": user_id,
            "title": final_title,
            "subject": subject,
            "description": description or "Dynamic Palace from Photo",
            "objectives": objectives,
            "dynamic_config": {
                **room_data.get("room_dimensions", {}),
                "aesthetics": room_data.get("room_aesthetics", {})
            }
        }).execute()

        if not palace_resp.data:
            raise HTTPException(status_code=500, detail="Failed to create palace in DB.")

        palace_db  = palace_resp.data[0]
        palace_id  = palace_db["id"]

        # ── Step 6: Save Concepts with full vision + GLB metadata ─────────────
        concepts_to_insert = []
        anchor_map = {a["id"]: a for a in dynamic_anchors}
        used_anchor_ids = set()  # enforce 1 concept per anchor at insert time

        for concept in palace_data.get("concepts", []):
            anchor_id   = concept.get("anchor_id")
            # Skip if this anchor already has a concept (LLM post-processing should
            # prevent this, but guard here as a second line of defence)
            if anchor_id in used_anchor_ids:
                print(f"[Ingest] Skipping duplicate anchor_id '{anchor_id}' for concept '{concept.get('label')}'")
                continue
            used_anchor_ids.add(anchor_id)

            anchor_info = anchor_map.get(anchor_id, {})
            vision_obj  = anchor_info.get("raw_vision_data", {})
            glb_match   = vision_obj.get("glb_match", {})

            # Derive rotation_y from wall_side so objects face inward
            import math as _math
            wall_side = vision_obj.get("wall_side", "none").lower()
            _WALL_ROTATIONS = {
                "left":  90,   # object on left wall faces right (+x)
                "right": -90,  # object on right wall faces left (-x)
                "back":  180,  # object on back wall faces camera (+z)
                "far":   180,
                "front": 0,
                "near":  0,
                "none":  0,
            }
            rotation_y = _WALL_ROTATIONS.get(wall_side, vision_obj.get("rotation_y", 0))

            row = {
                "palace_id":      palace_id,
                "label":          concept.get("label", "Unknown"),
                "context":        concept.get("context", ""),
                "feynman_summary":concept.get("feynman_summary", ""),
                "chunk_text":     concept.get("chunk_text", ""),
                "anchor_id":      anchor_id,
                # Position in real metres (already anti-overlapped by vision_service)
                "position_x":     vision_obj.get("position", {}).get("x", 0.0),
                "position_y":     0.0,
                "position_z":     vision_obj.get("position", {}).get("z", 0.0),
                # GLB asset — result of semantic matching, NOT a hardcoded rule
                "glb_model":      glb_match.get("glb_file", "desk.glb"),
                "hex_color":      vision_obj.get("color", "#c8b89a"),
                "material_props": {
                    "raw_type":      vision_obj.get("raw_type"),
                    "material_hint": vision_obj.get("material_hint"),
                    "dimensions":    vision_obj.get("dimensions"),
                    "glb_type":      glb_match.get("glb_type"),
                    "wall_side":     wall_side,
                    "rotation_y":    rotation_y,
                    "confidence":    glb_match.get("confidence", 0.5)
                }
            }

            embedding = concept.get("embedding")
            if embedding:
                row["embedding"] = str(embedding)

            concepts_to_insert.append(row)

        if concepts_to_insert:
            supabase.table("concepts").insert(concepts_to_insert).execute()

        return {"status": "success", "id": palace_id, "title": final_title}

    except Exception as e:
        import traceback
        print(f"[Ingest] Photo-PDF Error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/palace/{palace_id}")
async def delete_palace(
    palace_id: str,
    supabase: SupabaseDep,
    authorization: str = Header(None)
):
    """
    Backend deletion of a room (palace). Uses service role (implicitly if Deps is configured)
    to bypass RLS if necessary, but this Depend verifies auth first.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="User not authenticated.")

    try:
        # 1. Verify user session manually just in case
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
             raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = auth_response.user.id

        # 2. Verify existence and ownership first
        existing = supabase.table("palaces").select("id").eq("id", palace_id).eq("user_id", user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Room not found or not owned by you.")

        # 3. Explicitly delete child concepts FIRST.
        # This prevents a known Supabase RLS bug where ON DELETE CASCADE fails
        # because the parent row's visibility changes mid-transaction.
        del_concepts = supabase.table("concepts").delete().eq("palace_id", palace_id).execute()

        # 4. Now delete the parent palace
        del_palace = supabase.table("palaces").delete().eq("id", palace_id).eq("user_id", user_id).execute()

        # 5. Final manual verification
        check = supabase.table("palaces").select("id").eq("id", palace_id).execute()
        if check.data:
            raise HTTPException(status_code=500, detail="La base de datos bloqueó la eliminación (fallo silencioso de RLS).")

        return {"status": "success", "deleted": palace_id}

    except HTTPException:
         raise
    except Exception as e:
        print(f"[Ingest] Deletion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
