"""
Vision Service
==============
Analyzes a room photo using Google Gemini (via google-generativeai SDK).
Returns a structured JSON with room dimensions, aesthetics, and object layout.
"""
import json
import math
import base64
import re
from fastapi import HTTPException
from app.core.config import settings

# ---------------------------------------------------------------------------
# Fallback bounding boxes (w × h × d) in metres
# ---------------------------------------------------------------------------
_SIZE_FALLBACKS = {
    "bed":        {"width": 2.0,  "height": 0.55, "depth": 2.0 },
    "sofa":       {"width": 2.2,  "height": 0.85, "depth": 0.9 },
    "couch":      {"width": 2.2,  "height": 0.85, "depth": 0.9 },
    "chair":      {"width": 0.65, "height": 0.9,  "depth": 0.65},
    "desk":       {"width": 1.2,  "height": 0.75, "depth": 0.6 },
    "table":      {"width": 1.4,  "height": 0.75, "depth": 0.8 },
    "nightstand": {"width": 0.5,  "height": 0.55, "depth": 0.45},
    "wardrobe":   {"width": 1.5,  "height": 2.0,  "depth": 0.6 },
    "dresser":    {"width": 1.2,  "height": 1.0,  "depth": 0.5 },
    "bookshelf":  {"width": 1.0,  "height": 1.8,  "depth": 0.3 },
    "lamp":       {"width": 0.3,  "height": 1.5,  "depth": 0.3 },
    "plant":      {"width": 0.5,  "height": 0.9,  "depth": 0.5 },
    "_default":   {"width": 1.0,  "height": 1.0,  "depth": 0.8 },
}


def _get_fallback_dims(raw_type: str) -> dict:
    t = raw_type.lower()
    for key, dims in _SIZE_FALLBACKS.items():
        if key in t:
            return dims
    return _SIZE_FALLBACKS["_default"]


def _safe_hex(val, default: str) -> str:
    v = str(val or "").strip()
    return v if re.match(r"^#[0-9A-Fa-f]{6}$", v) else default


def _snap_to_wall(obj: dict, half_w: float, half_d: float) -> None:
    """Snap an object flush against the wall indicated by its wall_side field."""
    wall = obj.get("wall_side", "none").lower()
    dims = obj["dimensions"]
    pos  = obj["position"]
    if wall == "left":
        pos["x"] = -half_w + dims["width"] / 2 + 0.05
    elif wall == "right":
        pos["x"] =  half_w - dims["width"] / 2 - 0.05
    elif wall in ("back", "far"):
        pos["z"] = -half_d + dims["depth"] / 2 + 0.05
    elif wall in ("front", "near"):
        pos["z"] =  half_d - dims["depth"] / 2 - 0.05


def _aabb_clear(a: dict, b: dict, gap: float) -> bool:
    pen_x = (a["dimensions"]["width"]  / 2 + b["dimensions"]["width"]  / 2 + gap) - abs(a["position"]["x"] - b["position"]["x"])
    pen_z = (a["dimensions"]["depth"] / 2 + b["dimensions"]["depth"] / 2 + gap) - abs(a["position"]["z"] - b["position"]["z"])
    return not (pen_x > 0 and pen_z > 0)


def _resolve_overlaps(objects: list, half_w: float, half_d: float) -> None:
    """Iterative push-apart + greedy spiral fallback."""
    MIN_GAP  = 0.30
    WALL_BUF = 0.40
    MAX_PASSES = 60

    def cx(v): return max(-half_w + WALL_BUF, min(v, half_w - WALL_BUF))
    def cz(v): return max(-half_d + WALL_BUF, min(v, half_d - WALL_BUF))

    for _pass in range(MAX_PASSES):
        moved = False
        for i in range(len(objects)):
            for j in range(i + 1, len(objects)):
                a, b = objects[i], objects[j]
                ax, az = a["position"]["x"], a["position"]["z"]
                bx, bz = b["position"]["x"], b["position"]["z"]
                aw, ad = a["dimensions"]["width"] / 2, a["dimensions"]["depth"] / 2
                bw, bd = b["dimensions"]["width"] / 2, b["dimensions"]["depth"] / 2
                pen_x = (aw + bw + MIN_GAP) - abs(ax - bx)
                pen_z = (ad + bd + MIN_GAP) - abs(az - bz)
                if pen_x > 0 and pen_z > 0:
                    moved = True
                    eps = 0.01
                    a_wall = a.get("wall_side", "none")
                    b_wall = b.get("wall_side", "none")
                    if pen_x <= pen_z:
                        shift = pen_x / 2 + eps
                        if ax <= bx:
                            if "left"  not in a_wall: a["position"]["x"] = cx(ax - shift)
                            if "right" not in b_wall: b["position"]["x"] = cx(bx + shift)
                        else:
                            if "right" not in a_wall: a["position"]["x"] = cx(ax + shift)
                            if "left"  not in b_wall: b["position"]["x"] = cx(bx - shift)
                    else:
                        shift = pen_z / 2 + eps
                        if az <= bz:
                            if a_wall not in ("back","far"):   a["position"]["z"] = cz(az - shift)
                            if b_wall not in ("front","near"): b["position"]["z"] = cz(bz + shift)
                        else:
                            if a_wall not in ("front","near"): a["position"]["z"] = cz(az + shift)
                            if b_wall not in ("back","far"):   b["position"]["z"] = cz(bz - shift)
        if not moved:
            print(f"[Vision] Anti-overlap converged in {_pass + 1} pass(es).")
            return

    # Greedy spiral fallback
    print("[Vision] Anti-overlap: using greedy spiral placement.")
    objects.sort(key=lambda o: o["dimensions"]["width"] * o["dimensions"]["depth"], reverse=True)
    placed = []
    for obj in objects:
        px, pz = obj["position"]["x"], obj["position"]["z"]
        step = max(obj["dimensions"]["width"], obj["dimensions"]["depth"]) + MIN_GAP
        placed_ok = False
        for radius in range(20):
            angle_steps = max(1, 8 * radius)
            for k in range(angle_steps):
                angle = 2 * math.pi * k / angle_steps
                obj["position"]["x"] = cx(px + radius * step * math.cos(angle))
                obj["position"]["z"] = cz(pz + radius * step * math.sin(angle))
                if all(_aabb_clear(obj, p, MIN_GAP) for p in placed):
                    placed_ok = True
                    break
            if placed_ok:
                break
        placed.append(obj)


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------
_VISION_PROMPT = """You are a precise 3D room layout analyst. Study this photo carefully and output a JSON description.

STEP 1 — UNDERSTAND THE ROOM GEOMETRY:
- Identify the back wall (farthest from camera), left wall, right wall.
- Estimate the room's real size in metres. Typical bedroom: width=4.5, depth=4.5, height=2.6.

STEP 2 — DETECT OBJECTS:
List every piece of furniture or freestanding object clearly visible.
Use natural English names: "wooden dresser", "double bed", "floor lamp", "nightstand".
DO NOT include: walls, ceiling, floor, windows, doors, curtains, paintings, rugs.

STEP 3 — POSITIONS (CRITICAL):
Coordinate system — origin at room center, y=0 at floor:
  x: LEFT wall = -(width/2),  RIGHT wall = +(width/2)
  z: BACK wall = -(depth/2),  FRONT (camera) = +(depth/2)

Rules:
- Object touching LEFT wall  → x ≈ -(width/2) + object_width/2
- Object touching RIGHT wall → x ≈ +(width/2) - object_width/2
- Object against BACK wall   → z ≈ -(depth/2) + object_depth/2
- Nightstand beside a bed    → same z as bed, x offset by bed_width/2 + nightstand_width/2 + 0.1
- Freestanding center object → x ≈ 0

For each object output "wall_side": "left", "right", "back", "front", or "none".

STEP 4 — AESTHETICS:
Look at the actual colors in the photo:
- wall_color: hex of walls (e.g. "#FFFFFF" for white)
- floor_color: hex of floor
- floor_material: "wood", "tile", "carpet", "concrete", or "stone"
- ceiling_color: hex of ceiling
- ambient_light: "warm", "cool", "neutral", or "dark"

STEP 5 — OBJECT DETAILS:
- color: actual hex color of the object as seen in photo
- material_hint: "wood", "metal", "fabric", "plastic", etc.
- dimensions: real bounding box in metres (width × height × depth)

Reference sizes:
  double bed: 2.0×0.55×2.0, nightstand: 0.5×0.55×0.45
  dresser: 1.2×1.0×0.5, floor lamp: 0.3×1.7×0.3
  bookshelf: 1.0×1.8×0.3, chair: 0.65×0.9×0.65

OUTPUT — return ONLY valid JSON, no markdown:
{
  "room_dimensions": {"width": 4.5, "height": 2.6, "depth": 4.5},
  "room_aesthetics": {
    "wall_color": "#FFFFFF",
    "floor_color": "#E8D5B0",
    "floor_material": "wood",
    "ceiling_color": "#FFFFFF",
    "ambient_light": "cool"
  },
  "objects": [
    {
      "raw_type": "double bed",
      "label": "Double Bed",
      "material_hint": "wood",
      "color": "#D4B896",
      "wall_side": "back",
      "position": {"x": 0.0, "y": 0, "z": -1.0},
      "dimensions": {"width": 2.0, "height": 0.55, "depth": 2.0}
    }
  ]
}"""


async def analyze_room_photo(photo_bytes: bytes) -> dict:
    """
    Analyzes a room photo using Google Gemini (gemini-1.5-flash).
    Falls back to gemini-1.5-pro if flash fails.
    """
    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")

    try:
        from google import genai
        from google.genai import types as genai_types
    except ImportError:
        raise HTTPException(status_code=500, detail="google-genai not installed. Run: pip install google-genai")

    client = genai.Client(api_key=settings.gemini_api_key)

    # Models to try in order (both available on free tier)
    _MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"]

    result = None
    last_error = None

    for model_name in _MODELS:
        try:
            print(f"[Vision] Trying Gemini model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    genai_types.Part.from_bytes(data=photo_bytes, mime_type="image/jpeg"),
                    _VISION_PROMPT,
                ],
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                    max_output_tokens=2048,
                ),
            )
            raw_text = response.text.strip()
            # Strip markdown fences if present
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text).strip()
            result = json.loads(raw_text)
            print(f"[Vision] Success with {model_name}")
            break
        except Exception as e:
            last_error = e
            print(f"[Vision] {model_name} failed: {type(e).__name__}: {e}")
            continue

    if result is None:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini vision failed. Last error: {last_error}"
        )

    # ── Clamp room dimensions ─────────────────────────────────────────────────
    dims = result.get("room_dimensions", {})
    dims["width"]  = max(3.0, min(float(dims.get("width",  4.5)), 12.0))
    dims["height"] = max(2.2, min(float(dims.get("height", 2.6)),  4.0))
    dims["depth"]  = max(3.0, min(float(dims.get("depth",  4.5)), 12.0))
    result["room_dimensions"] = dims

    half_w = dims["width"]  / 2
    half_d = dims["depth"]  / 2
    WALL_BUF = 0.40

    # ── Validate & normalise objects ──────────────────────────────────────────
    clean_objects = []
    for obj in result.get("objects", []):
        raw = obj.get("raw_type", obj.get("type", "unknown furniture"))
        obj["raw_type"] = raw

        # Dimensions first (needed for wall snapping)
        fb   = _get_fallback_dims(raw)
        d_in = obj.get("dimensions", {})
        obj["dimensions"] = {
            "width":  max(0.2, min(float(d_in.get("width",  fb["width"])),  5.0)),
            "height": max(0.1, min(float(d_in.get("height", fb["height"])), 4.0)),
            "depth":  max(0.2, min(float(d_in.get("depth",  fb["depth"])),  5.0)),
        }

        # Position — clamp inside room
        pos = obj.get("position", {})
        obj["position"] = {
            "x": max(-half_w + WALL_BUF, min(float(pos.get("x", 0.0)), half_w - WALL_BUF)),
            "z": max(-half_d + WALL_BUF, min(float(pos.get("z", 0.0)), half_d - WALL_BUF)),
            "y": 0.0,
        }

        # Wall-snap
        wall_side = obj.get("wall_side", "none").lower()
        obj["wall_side"] = wall_side
        if wall_side != "none":
            _snap_to_wall(obj, half_w, half_d)

        clean_objects.append(obj)

    # ── Anti-overlap ──────────────────────────────────────────────────────────
    _resolve_overlaps(clean_objects, half_w, half_d)

    # ── Validate aesthetics ───────────────────────────────────────────────────
    raw_aes = result.get("room_aesthetics", {})
    valid_mats   = {"wood", "tile", "carpet", "concrete", "stone"}
    valid_lights = {"warm", "cool", "neutral", "dark"}

    aesthetics = {
        "wall_color":     _safe_hex(raw_aes.get("wall_color"),    "#f0ece4"),
        "floor_color":    _safe_hex(raw_aes.get("floor_color"),   "#d4b896"),
        "floor_material": raw_aes.get("floor_material", "wood") if raw_aes.get("floor_material") in valid_mats  else "wood",
        "ceiling_color":  _safe_hex(raw_aes.get("ceiling_color"), "#ffffff"),
        "ambient_light":  raw_aes.get("ambient_light",  "warm") if raw_aes.get("ambient_light")  in valid_lights else "warm",
    }
    result["room_aesthetics"] = aesthetics
    result["objects"] = clean_objects

    raw_types = [o["raw_type"] for o in clean_objects]
    print(f"[Vision] Detected {len(clean_objects)} objects: {raw_types}")
    print(f"[Vision] Room: {dims['width']}m × {dims['depth']}m × {dims['height']}m")
    print(f"[Vision] Aesthetics: walls={aesthetics['wall_color']}, floor={aesthetics['floor_color']} ({aesthetics['floor_material']}), light={aesthetics['ambient_light']}")
    return result
