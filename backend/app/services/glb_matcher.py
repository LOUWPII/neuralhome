"""
GLB Matcher Service
===================
Maps free-text object descriptions (from the vision AI) to the best-matching
.glb model available in /public/models/.

Design goals:
  1. The vision model describes what it ACTUALLY SEES (no type restrictions).
  2. This module finds the closest .glb for each described object.
  3. Scoring is keyword-based (fast, no API needed) — fully offline.
  4. Adding new .glb files in the future only requires adding a new entry here.

Available models (auto-discovered from this catalog):
  bed.glb | desk.glb | chair.glb | bookshelf.glb | lamp.glb | plant.glb
"""

# ─────────────────────────────────────────────────────────────────────────────
# GLB Catalog
# Each entry represents one available .glb asset.
# "keywords" are matched (case-insensitive) against the vision model's
# raw_type + label + material_hint string.
# "score_boost" adds extra weight for strong matches.
# ─────────────────────────────────────────────────────────────────────────────

_GLB_CATALOG: list[dict] = [
    {
        "glb_type": "bed",
        "glb_file": "bed.glb",
        "display": "Bed",
        "keywords": [
            "bed", "mattress", "bunk", "cot", "futon", "sleeping",
            "single bed", "double bed", "queen", "king",
        ],
        "score_boost": {"bed": 5, "mattress": 4},
    },
    {
        "glb_type": "desk",
        "glb_file": "desk.glb",
        "display": "Desk / Table",
        "keywords": [
            "desk", "table", "nightstand", "side table", "end table",
            "coffee table", "dining table", "vanity", "console",
            "tv stand", "media unit", "workbench", "dresser",
            "bedside", "side cabinet",
        ],
        "score_boost": {"desk": 5, "nightstand": 4, "table": 3},
    },
    {
        "glb_type": "chair",
        "glb_file": "chair.glb",
        "display": "Chair / Seating",
        "keywords": [
            "chair", "sofa", "couch", "armchair", "bench", "seat",
            "stool", "ottoman", "settee", "loveseat", "recliner",
            "lounge", "rocking chair", "office chair",
        ],
        "score_boost": {"chair": 5, "sofa": 4, "couch": 4},
    },
    {
        "glb_type": "bookshelf",
        "glb_file": "bookshelf.glb",
        "display": "Bookshelf / Wardrobe / Cabinet",
        "keywords": [
            "bookshelf", "bookcase", "shelf", "shelving", "wardrobe",
            "closet", "armoire", "cabinet", "hutch", "cupboard",
            "chest of drawers", "chest", "drawers", "storage unit",
            "dresser cabinet",
        ],
        "score_boost": {"wardrobe": 5, "bookshelf": 5, "cabinet": 4, "shelf": 3},
    },
    {
        "glb_type": "lamp",
        "glb_file": "lamp.glb",
        "display": "Lamp / Light",
        "keywords": [
            "lamp", "light", "floor lamp", "table lamp", "pendant",
            "chandelier", "sconce", "spotlight", "reading lamp",
            "lighting", "luminaire",
        ],
        "score_boost": {"lamp": 5, "floor lamp": 5, "light": 3},
    },
    {
        "glb_type": "plant",
        "glb_file": "plant.glb",
        "display": "Plant / Greenery",
        "keywords": [
            "plant", "tree", "flower", "pot", "succulent", "fern",
            "indoor plant", "potted", "vase", "greenery", "bush",
            "cactus", "palm",
        ],
        "score_boost": {"plant": 5, "potted": 4, "tree": 3},
    },
]

# Build a quick-lookup set of all valid glb_types
VALID_GLB_TYPES: set[str] = {entry["glb_type"] for entry in _GLB_CATALOG}


def match_to_glb(raw_type: str, label: str = "", material_hint: str = "") -> dict:
    """
    Given a free-text description of an object, return the best-matching
    GLB entry from the catalog.

    Parameters
    ----------
    raw_type      : str – What the vision AI says the object is
                          (e.g. "wooden wardrobe", "leather sofa")
    label         : str – Short display label from the vision AI
    material_hint : str – Material from the vision AI (e.g. "wood", "fabric")

    Returns
    -------
    dict with keys: glb_type, glb_file, display, confidence (0.0-1.0)
    """
    # Concatenate everything into one searchable string
    search_text = f"{raw_type} {label} {material_hint}".lower()

    best_entry = _GLB_CATALOG[0]  # fallback to first entry
    best_score = -1

    for entry in _GLB_CATALOG:
        score = 0

        # Base keyword matching
        for kw in entry["keywords"]:
            if kw in search_text:
                score += 1

        # Score boosts for primary keywords
        for kw, boost in entry.get("score_boost", {}).items():
            if kw in search_text:
                score += boost

        if score > best_score:
            best_score = score
            best_entry = entry

    # Confidence: normalize by max possible score (sum of all boosts)
    max_score = sum(entry.get("score_boost", {}).values() or [1]) or 1
    confidence = min(1.0, best_score / max_score) if best_score > 0 else 0.1

    result = {
        "glb_type":   best_entry["glb_type"],
        "glb_file":   best_entry["glb_file"],
        "display":    best_entry["display"],
        "confidence": round(confidence, 2),
    }

    print(
        f"[GLBMatcher] '{raw_type}' + '{label}' "
        f"→ {result['glb_type']} (score={best_score}, conf={result['confidence']})"
    )
    return result


def match_objects(objects: list[dict]) -> list[dict]:
    """
    Runs match_to_glb on every detected object and injects the result
    under the key 'glb_match'. Does NOT modify other fields.
    """
    for obj in objects:
        raw_type = obj.get("raw_type", obj.get("type", "unknown"))
        label    = obj.get("label", "")
        material = obj.get("material_hint", "")
        obj["glb_match"] = match_to_glb(raw_type, label, material)
        # Also set the canonical "type" field to the matched glb_type so the
        # rest of the pipeline (anchors, concepts) can use it uniformly.
        obj["type"] = obj["glb_match"]["glb_type"]
    return objects
