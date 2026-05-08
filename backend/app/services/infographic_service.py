"""
infographic_service.py — Hybrid Infographic Pipeline

Architecture:
  Stage 1 — LLM extracts rich structured semantic content from PDF context.
  Stage 2 — Image service generates a VISUAL BACKGROUND TEMPLATE (no text).
  Stage 3 — Frontend renders all text as HTML overlay on top of the image.

This hybrid approach solves the core problem: diffusion models cannot render
readable text reliably. By separating visual structure (image) from semantic
content (HTML), we get both a beautiful visual AND accurate, legible content.
"""
import json
import asyncio
from typing import Dict, List, Optional
from app.services.llm_service import _client, _MAPPER_MODEL
from app.services.image_service import generate_concept_image

# ---------------------------------------------------------------------------
# STAGE 1 — Semantic Content Extraction
# ---------------------------------------------------------------------------

CONTENT_EXTRACTOR_SYSTEM = """
You are an expert educational content designer specializing in visual information architecture.
Your task: extract and structure the key information from a PDF excerpt into a precise
semantic hierarchy optimized for infographic rendering.

CRITICAL RULES:
- Extract ONLY facts present in the provided context. Never hallucinate.
- sections: exactly 3 to 5 items, ordered by importance (most important first).
- data_points: include ONLY if real numbers/statistics exist in the context. Otherwise [].
- visual_metaphor: must be a CONCRETE, SPECIFIC visual object (not generic).
  BAD: "a network diagram"
  GOOD: "a DNA helix unraveling into labeled segments"
  BAD: "a chart"
  GOOD: "a funnel splitting into three colored streams"
- layout_type: choose the one that best matches the conceptual structure:
  - flow: sequential steps, processes, timelines
  - comparison: two sides, pros/cons, before/after
  - hierarchy: levels, categories, taxonomies, pyramids
  - stats: data-heavy, metrics, numbers are central
  - process: cyclical or repeating workflows
  - concept: single central idea with supporting details
- color_theme: match to domain:
  science/physics=blue, technology/CS=purple, biology/ecology=green,
  medicine/health=teal, economics/business=orange
- All text content must be in the specified LANGUAGE.

OUTPUT: Return ONLY a valid JSON object. No markdown, no explanation.
"""

CONTENT_EXTRACTOR_USER = """
CONCEPT: {concept_label}
LANGUAGE: {language}

CONTEXT FROM PDF:
---
{context}
---

Extract structured infographic content. Return only the JSON object.

REQUIRED SCHEMA:
{{
  "main_idea": "The single most important claim (1 sentence, max 20 words)",
  "layout_type": "flow|comparison|hierarchy|stats|process|concept",
  "color_theme": "blue|purple|green|teal|orange",
  "sections": [
    {{
      "heading": "Short label (max 4 words)",
      "body": "Key fact or explanation (max 25 words, grounded in context)",
      "highlight": "The single most important word or number to emphasize",
      "icon_hint": "circle|arrow|star|check|bolt|brain|chart|lock|leaf|gear"
    }}
  ],
  "key_terms": ["term1", "term2", "term3", "term4"],
  "data_points": [
    {{"label": "metric name", "value": "number or percentage", "unit": "unit string"}}
  ],
  "visual_metaphor": "Specific concrete visual object representing this concept",
  "takeaway": "One memorable sentence summarizing the concept (max 15 words)"
}}
"""

# ---------------------------------------------------------------------------
# STAGE 2 — Color palette and layout metadata
# (Used by both image generation and frontend rendering)
# ---------------------------------------------------------------------------

COLOR_PALETTES = {
    "blue": {
        "primary": "#1a73e8",
        "secondary": "#4285f4",
        "accent": "#0d47a1",
        "bg_light": "#e8f0fe",
        "text_on_primary": "#ffffff",
        "label": "Corporate Blue",
    },
    "purple": {
        "primary": "#7c3aed",
        "secondary": "#a78bfa",
        "accent": "#4c1d95",
        "bg_light": "#ede9fe",
        "text_on_primary": "#ffffff",
        "label": "Academic Purple",
    },
    "green": {
        "primary": "#059669",
        "secondary": "#34d399",
        "accent": "#064e3b",
        "bg_light": "#d1fae5",
        "text_on_primary": "#ffffff",
        "label": "Scientific Green",
    },
    "teal": {
        "primary": "#0891b2",
        "secondary": "#22d3ee",
        "accent": "#164e63",
        "bg_light": "#cffafe",
        "text_on_primary": "#ffffff",
        "label": "Medical Teal",
    },
    "orange": {
        "primary": "#d97706",
        "secondary": "#fbbf24",
        "accent": "#92400e",
        "bg_light": "#fef3c7",
        "text_on_primary": "#ffffff",
        "label": "Energetic Orange",
    },
}

LAYOUT_METADATA = {
    "flow":       {"columns": 1, "style": "vertical-stack",   "icon": "arrow-down"},
    "comparison": {"columns": 2, "style": "side-by-side",     "icon": "columns"},
    "hierarchy":  {"columns": 1, "style": "pyramid",          "icon": "triangle"},
    "stats":      {"columns": 2, "style": "metric-grid",      "icon": "bar-chart"},
    "process":    {"columns": 1, "style": "numbered-steps",   "icon": "refresh"},
    "concept":    {"columns": 2, "style": "hub-and-spoke",    "icon": "circle"},
}

ICON_SVG_MAP = {
    "circle": "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z",
    "arrow":  "M12 5l7 7-7 7M5 12h14",
    "star":   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    "check":  "M20 6L9 17l-5-5",
    "bolt":   "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    "brain":  "M9.5 2a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1-5 0V2z",
    "chart":  "M18 20V10M12 20V4M6 20v-6",
    "lock":   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
    "leaf":   "M17 8C8 10 5.9 16.17 3.82 19.34L5.71 21l1-1.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2V8z",
    "gear":   "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
}


# ---------------------------------------------------------------------------
# STAGE 3 — Orchestrator
# ---------------------------------------------------------------------------

async def generate_infographic_data(
    concept_label: str,
    context: str,
    language: str = "es",
) -> Dict:
    """
    Three-stage hybrid pipeline:
      1. LLM extracts rich structured semantic content from PDF context.
      2. Image service generates a visual background template (no text in image).
      3. Returns both image + structured data for HTML overlay rendering.

    The frontend renders text as HTML on top of the background image,
    giving full control over typography, layout, and content accuracy.
    """
    lang_directive = "Spanish (Español)" if language == "es" else "English"

    # ── Stage 1: Semantic extraction ─────────────────────────────────────────
    user_msg = CONTENT_EXTRACTOR_USER.format(
        concept_label=concept_label,
        language=lang_directive,
        context=context[:4000],  # Use more context for better extraction
    )

    def _call_llm():
        return _client.chat.completions.create(
            model=_MAPPER_MODEL,
            messages=[
                {"role": "system", "content": CONTENT_EXTRACTOR_SYSTEM},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.15,   # Very low — we want factual, grounded extraction
            response_format={"type": "json_object"},
            max_tokens=1200,
        )

    layout_data = {}
    try:
        response = await asyncio.to_thread(_call_llm)
        raw = response.choices[0].message.content
        layout_data = json.loads(raw)

        if not isinstance(layout_data, dict):
            raise ValueError("LLM returned non-dict JSON")

        print(f"[InfographicService] Extracted: layout={layout_data.get('layout_type')}, "
              f"sections={len(layout_data.get('sections', []))}, "
              f"data_points={len(layout_data.get('data_points', []))}")

    except Exception as e:
        print(f"[InfographicService] LLM extraction failed: {e}. Using fallback.")
        layout_data = {
            "main_idea": concept_label,
            "layout_type": "concept",
            "color_theme": "blue",
            "sections": [
                {"heading": concept_label, "body": context[:100], "highlight": concept_label, "icon_hint": "circle"}
            ],
            "key_terms": [],
            "data_points": [],
            "visual_metaphor": f"a detailed educational diagram",
            "takeaway": concept_label,
        }

    # Resolve metadata
    layout_type  = layout_data.get("layout_type", "concept")
    color_theme  = layout_data.get("color_theme", "blue")
    sections     = layout_data.get("sections", [])
    palette      = COLOR_PALETTES.get(color_theme, COLOR_PALETTES["blue"])
    layout_meta  = LAYOUT_METADATA.get(layout_type, LAYOUT_METADATA["concept"])

    # ── Stage 2: Visual background generation ────────────────────────────────
    image_url = await generate_concept_image(
        prompt="",  # Ignored — image_service builds its own visual prompt
        concept_label=concept_label,
        layout_type=layout_type,
        color_theme=color_theme,
        visual_metaphor=layout_data.get("visual_metaphor", ""),
        num_sections=len(sections),
    )

    # ── Stage 3: Return complete data package ─────────────────────────────────
    return {
        # Identity
        "title":        concept_label,
        "subtitle":     layout_data.get("main_idea", ""),
        "takeaway":     layout_data.get("takeaway", ""),
        # Layout
        "layout_type":  layout_type,
        "layout_meta":  layout_meta,
        # Content
        "sections":     sections,
        "key_terms":    layout_data.get("key_terms", []),
        "data_points":  layout_data.get("data_points", []),
        # Visual
        "color_theme":  color_theme,
        "palette":      palette,
        # Image (background template)
        "image_url":    image_url,
    }
