"""
Vision Service
==============
Analyzes a room photo using an OpenRouter vision model and returns a structured
JSON description with:
  - room_dimensions (real metres)
  - objects[], each with: raw_type, label, color, material_hint, position, dimensions

NOTE: The vision model is NOT restricted to any predetermined type list.
      It describes what it actually sees in natural language.
      The GLB matching step (glb_matcher.py) handles mapping to 3D assets.
"""
import json
import math
import base64
from fastapi import HTTPException
from openai import OpenAI
from app.core.config import settings

_VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"

# Realistic default bounding boxes (w × h × d) in metres, used as fallback
# when the vision model doesn't return dimensions for a specific type.
_SIZE_FALLBACKS = {
    "bed":       {"width": 2.0,  "height": 0.55, "depth": 2.0 },
    "sofa":      {"width": 2.2,  "height": 0.85, "depth": 0.9 },
    "couch":     {"width": 2.2,  "height": 0.85, "depth": 0.9 },
    "chair":     {"width": 0.65, "height": 0.9,  "depth": 0.65},
    "desk":      {"width": 1.2,  "height": 0.75, "depth": 0.6 },
    "table":     {"width": 1.4,  "height": 0.75, "depth": 0.8 },
    "nightstand":{"width": 0.5,  "height": 0.55, "depth": 0.45},
    "wardrobe":  {"width": 1.5,  "height": 2.0,  "depth": 0.6 },
    "dresser":   {"width": 1.2,  "height": 1.0,  "depth": 0.5 },
    "bookshelf": {"width": 1.0,  "height": 1.8,  "depth": 0.3 },
    "lamp":      {"width": 0.3,  "height": 1.5,  "depth": 0.3 },
    "plant":     {"width": 0.5,  "height": 0.9,  "depth": 0.5 },
    # generic fallback
    "_default":  {"width": 1.0,  "height": 1.0,  "depth": 0.8 },
}


def _get_fallback_dims(raw_type: str) -> dict:
    """Return the most appropriate default dimensions for a raw object type."""
    t = raw_type.lower()
    for key, dims in _SIZE_FALLBACKS.items():
        if key in t:
            return dims
    return _SIZE_FALLBACKS["_default"]


def _aabb_clear(a: dict, b: dict, gap: float) -> bool:
    """Return True if two objects have at least `gap` metres between footprints."""
    pen_x = (a["dimensions"]["width"]  / 2 + b["dimensions"]["width"]  / 2 + gap) - abs(a["position"]["x"] - b["position"]["x"])
    pen_z = (a["dimensions"]["depth"] / 2 + b["dimensions"]["depth"] / 2 + gap) - abs(a["position"]["z"] - b["position"]["z"])
    return not (pen_x > 0 and pen_z > 0)


def _resolve_overlaps(objects: list, half_w: float, half_d: float) -> None:
    """
    Two-phase anti-overlap solver.

    Phase 1 — Iterative push-apart (up to 50 passes, early exit on convergence).
    Phase 2 — Greedy spiral placement as a guaranteed fallback.
    """
    MIN_GAP  = 0.35
    WALL_BUF = 0.45
    MAX_PASSES = 50

    def cx(v): return max(-half_w + WALL_BUF, min(v, half_w - WALL_BUF))
    def cz(v): return max(-half_d + WALL_BUF, min(v, half_d - WALL_BUF))

    # Phase 1
    for _pass in range(MAX_PASSES):
        moved = False
        for i in range(len(objects)):
            for j in range(i + 1, len(objects)):
                a, b = objects[i], objects[j]
                ax, az = a["position"]["x"], a["position"]["z"]
                bx, bz = b["position"]["x"], b["position"]["z"]
                aw = a["dimensions"]["width"]  / 2
                ad = a["dimensions"]["depth"] / 2
                bw = b["dimensions"]["width"]  / 2
                bd = b["dimensions"]["depth"] / 2

                pen_x = (aw + bw + MIN_GAP) - abs(ax - bx)
                pen_z = (ad + bd + MIN_GAP) - abs(az - bz)

                if pen_x > 0 and pen_z > 0:
                    moved = True
                    eps = 0.01
                    if pen_x <= pen_z:
                        shift = pen_x / 2 + eps
                        if ax <= bx:
                            a["position"]["x"] = cx(ax - shift)
                            b["position"]["x"] = cx(bx + shift)
                        else:
                            a["position"]["x"] = cx(ax + shift)
                            b["position"]["x"] = cx(bx - shift)
                    else:
                        shift = pen_z / 2 + eps
                        if az <= bz:
                            a["position"]["z"] = cz(az - shift)
                            b["position"]["z"] = cz(bz + shift)
                        else:
                            a["position"]["z"] = cz(az + shift)
                            b["position"]["z"] = cz(bz - shift)
        if not moved:
            print(f"[Vision] Anti-overlap: converged in {_pass + 1} pass(es).")
            return

    # Phase 2 — greedy spiral
    print("[Vision] Anti-overlap: iterative solver did not converge; using greedy placement.")
    objects.sort(key=lambda o: o["dimensions"]["width"] * o["dimensions"]["depth"], reverse=True)
    placed = []

    for obj in objects:
        px = obj["position"]["x"]
        pz = obj["position"]["z"]
        step = max(obj["dimensions"]["width"], obj["dimensions"]["depth"]) + MIN_GAP
        placed_ok = False

        for radius in range(0, 20):
            angle_steps = max(1, 8 * radius)
            for k in range(angle_steps):
                angle = 2 * math.pi * k / angle_steps
                tx = cx(px + radius * step * math.cos(angle))
                tz = cz(pz + radius * step * math.sin(angle))
                obj["position"]["x"] = tx
                obj["position"]["z"] = tz
                if all(_aabb_clear(obj, p, MIN_GAP) for p in placed):
                    placed_ok = True
                    break
            if placed_ok:
                break

        placed.append(obj)

    print("[Vision] Anti-overlap: greedy placement complete.")


async def analyze_room_photo(photo_bytes: bytes) -> dict:
    """
    Analyzes a room photo.

    Returns a dict:
    {
      "room_dimensions": {"width": ..., "height": ..., "depth": ...},
      "objects": [
        {
          "raw_type":      "wooden wardrobe",   # free-text, no restrictions
          "label":         "Wardrobe",
          "material_hint": "wood",
          "color":         "#8B6F47",
          "position":      {"x": ..., "y": 0, "z": ...},
          "dimensions":    {"width": ..., "height": ..., "depth": ...}
        }, ...
      ]
    }
    The glb_matcher.py step (called in ingest.py) will then map each
    raw_type to the best available .glb model.
    """
    if not settings.openrouter_api_key:
        raise HTTPException(status_code=500, detail="OpenRouter API Key not configured")

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.openrouter_api_key,
    )

    try:
        base64_image = base64.b64encode(photo_bytes).decode('utf-8')
        image_data_uri = f"data:image/jpeg;base64,{base64_image}"

        prompt = """You are a precise 3D room layout analyst. Examine this photo and output a JSON description.

── WHAT TO DETECT ──
List EVERY piece of furniture or freestanding object that is CLEARLY VISIBLE.
Describe each object as you actually see it — use natural English names like:
  "wooden wardrobe", "double bed", "leather armchair", "floor lamp", "nightstand"
DO NOT classify into predefined categories. Just describe what you see.
DO NOT include: walls, ceiling, floor, windows, doors, curtains, paintings, rugs.

── ROOM DIMENSIONS ──
Estimate the room's real size in metres.
Typical bedroom: width=4.0, height=2.5, depth=4.0.
Output as: "room_dimensions": {"width": W, "height": H, "depth": D}

── POSITIONS ──
Coordinate system centred at room center (0,0,0):
- x axis: left wall = -(width/2),   right wall = +(width/2)
- z axis: far wall  = -(depth/2),   near wall  = +(depth/2)
- y = 0 always (floor)

Place each object WHERE IT ACTUALLY IS in the photo.
Objects against the far wall → z near -(depth/2).
Objects on the left side → negative x. Right side → positive x.
Objects near the camera → z near +(depth/2).

── DIMENSIONS ──
Estimate each object's real-world bounding box (width × height × depth) in metres.
Reference sizes:
  double bed: 2.0 × 0.55 × 2.0
  single bed: 1.0 × 0.45 × 2.0
  wardrobe: 1.5 × 2.0 × 0.6
  nightstand: 0.5 × 0.55 × 0.45
  sofa: 2.2 × 0.85 × 0.9
  floor lamp: 0.3 × 1.7 × 0.3
  bookshelf: 1.0 × 1.8 × 0.3
  chair: 0.65 × 0.9 × 0.65

── OUTPUT FORMAT ──
Return ONLY valid JSON (no markdown, no comments):
{
  "room_dimensions": {"width": 4.0, "height": 2.5, "depth": 4.0},
  "objects": [
    {
      "raw_type": "double bed",
      "label": "Double Bed",
      "material_hint": "wood",
      "color": "#c8b89a",
      "position": {"x": 0.5, "y": 0, "z": -1.5},
      "dimensions": {"width": 2.0, "height": 0.55, "depth": 2.0}
    }
  ]
}"""

        print(f"[Vision] Sending request → {_VISION_MODEL}")

        response = client.chat.completions.create(
            model=_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_data_uri}}
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )

        text_resp = response.choices[0].message.content
        for fence in ("```json", "```"):
            if text_resp.startswith(fence):
                text_resp = text_resp[len(fence):]
        if text_resp.endswith("```"):
            text_resp = text_resp[:-3]

        result = json.loads(text_resp.strip())

        # ── Clamp room dimensions ─────────────────────────────────────────────
        dims = result.get("room_dimensions", {})
        dims["width"]  = max(3.0, min(float(dims.get("width",  4.0)), 12.0))
        dims["height"] = max(2.2, min(float(dims.get("height", 2.5)),  4.0))
        dims["depth"]  = max(3.0, min(float(dims.get("depth",  4.0)), 12.0))
        result["room_dimensions"] = dims

        half_w = dims["width"]  / 2
        half_d = dims["depth"] / 2
        WALL_BUF = 0.45

        # ── Validate & normalise objects ─────────────────────────────────────
        clean_objects = []
        for obj in result.get("objects", []):
            raw = obj.get("raw_type", obj.get("type", "unknown furniture"))
            obj["raw_type"] = raw

            # Position clamped inside room
            pos = obj.get("position", {})
            obj["position"] = {
                "x": max(-half_w + WALL_BUF, min(float(pos.get("x", 0)), half_w - WALL_BUF)),
                "z": max(-half_d + WALL_BUF, min(float(pos.get("z", 0)), half_d - WALL_BUF)),
                "y": 0.0,
            }

            # Dimensions: prefer vision output, fall back to type-specific defaults
            fb = _get_fallback_dims(raw)
            d_in = obj.get("dimensions", {})
            obj["dimensions"] = {
                "width":  max(0.2, min(float(d_in.get("width",  fb["width"])),  5.0)),
                "height": max(0.1, min(float(d_in.get("height", fb["height"])), 4.0)),
                "depth":  max(0.2, min(float(d_in.get("depth",  fb["depth"])),  5.0)),
            }

            clean_objects.append(obj)

        # ── Anti-overlap pass ─────────────────────────────────────────────────
        _resolve_overlaps(clean_objects, half_w, half_d)

        result["objects"] = clean_objects
        raw_types = [o["raw_type"] for o in clean_objects]
        print(f"[Vision] Detected {len(clean_objects)} objects: {raw_types}")
        print(f"[Vision] Room: {dims['width']}m × {dims['depth']}m × {dims['height']}m tall")
        return result

    except Exception as e:
        import traceback
        print(f"[Vision] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OpenRouter Vision error: {str(e)}")
