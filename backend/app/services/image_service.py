import asyncio
import base64
import requests
from urllib.parse import quote
from app.core.config import settings

# ---------------------------------------------------------------------------
# Provider priority (all free, no paid API key required):
#   1. HuggingFace FLUX.1-schnell — fastest, needs free HF token
#   2. Pollinations.ai (flux)     — no key at all, always available
#
# CRITICAL DESIGN PRINCIPLE:
#   Diffusion models cannot render readable text. The prompt must focus on
#   VISUAL STRUCTURE and ABSTRACT REPRESENTATION only.
#   All text content is rendered as HTML overlay in the frontend.
# ---------------------------------------------------------------------------

HF_FLUX_SCHNELL_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "black-forest-labs/FLUX.1-schnell"
)

# ---------------------------------------------------------------------------
# Color palette → visual style mapping
# These are tuned for infographic-style outputs from FLUX/Pollinations
# ---------------------------------------------------------------------------
COLOR_STYLE_MAP = {
    "blue":   "cool blue and white color scheme, #1a73e8 primary color, corporate clean",
    "purple": "deep purple and soft lavender, #7c3aed primary, academic premium",
    "green":  "emerald green and mint white, #059669 primary, scientific clean",
    "teal":   "teal and cyan on white, #0891b2 primary, medical precision",
    "orange": "warm amber and white, #d97706 primary, energetic modern",
}

# ---------------------------------------------------------------------------
# Layout type → visual composition mapping
# Describes spatial structure without asking the model to render text
# ---------------------------------------------------------------------------
LAYOUT_VISUAL_MAP = {
    "flow":       (
        "vertical flowchart diagram, top-to-bottom connected boxes with arrows, "
        "numbered rectangular panels stacked vertically, clean connector lines"
    ),
    "comparison": (
        "two-column symmetrical layout, left panel and right panel separated by "
        "a vertical divider line, mirrored rectangular sections"
    ),
    "hierarchy":  (
        "pyramid diagram, wide base tapering to apex, horizontal tier bands, "
        "tree structure with branching lines from top node"
    ),
    "stats":      (
        "data dashboard grid, large bold number placeholders in prominent cards, "
        "metric boxes arranged in 2x2 or 3x1 grid, bar chart silhouettes"
    ),
    "process":    (
        "circular process diagram, numbered steps in a ring or linear sequence, "
        "rounded step boxes connected by curved arrows, clockwise flow"
    ),
    "concept":    (
        "central hub-and-spoke diagram, main circle in center with radiating "
        "rectangular panels, spoke lines connecting center to outer panels"
    ),
}


def build_visual_background_prompt(
    layout_type: str,
    color_theme: str,
    visual_metaphor: str,
    num_sections: int,
) -> str:
    """
    Builds a prompt optimized for generating a VISUAL BACKGROUND TEMPLATE.
    
    Key insight: we do NOT ask the model to render text. Instead we ask for
    a clean structural layout that the frontend will overlay with HTML text.
    This produces dramatically better results with free models.
    """
    color_desc = COLOR_STYLE_MAP.get(color_theme, COLOR_STYLE_MAP["blue"])
    layout_desc = LAYOUT_VISUAL_MAP.get(layout_type, LAYOUT_VISUAL_MAP["concept"])

    # Visual metaphor as a subtle background element, not the main focus
    metaphor_hint = ""
    if visual_metaphor and len(visual_metaphor) > 5:
        # Simplify the metaphor to avoid confusing the model
        metaphor_hint = f"subtle background illustration of {visual_metaphor}, low opacity watermark style"

    prompt_parts = [
        # Core style directive — must come first for highest weight
        "professional infographic template, white background, flat vector design",
        color_desc,
        # Layout structure
        layout_desc,
        # Empty placeholder boxes (model fills with color, frontend fills with text)
        f"{num_sections} clearly defined rectangular content panels with colored headers",
        "empty text placeholder areas with subtle gray lines, no actual words",
        # Visual quality tokens
        "clean geometric shapes, thin border lines, subtle drop shadows",
        "modern sans-serif font placeholders, structured grid alignment",
        "high contrast, crisp edges, print quality, 1024x1024",
        # Metaphor as subtle element
        metaphor_hint,
        # Style reinforcement
        "infographic poster layout, information design, data visualization template",
    ]

    prompt = ", ".join([p for p in prompt_parts if p])

    # Keep under 500 chars — Pollinations degrades with longer prompts
    if len(prompt) > 480:
        prompt = prompt[:480].rsplit(",", 1)[0]

    return prompt


def build_negative_prompt() -> str:
    """
    Comprehensive negative prompt targeting the most common failure modes
    of free diffusion models when generating infographic-style images.
    """
    return (
        # Text rendering failures (most common issue)
        "text, words, letters, typography, labels, captions, titles, headings, "
        "numbers, digits, lorem ipsum, gibberish text, unreadable text, "
        "blurry text, distorted letters, misspelled words, "
        # Style failures
        "photorealistic, photography, 3D render, CGI, stock photo, "
        "watercolor, oil painting, sketch, hand-drawn, doodle, cartoon, anime, "
        "clipart, illustration, abstract art, surrealism, "
        # Composition failures
        "dark background, black background, gradient background, textured background, "
        "chaotic layout, overlapping elements, cluttered, messy composition, "
        "random shapes, decorative only, no structure, "
        # Quality failures
        "low resolution, pixelated, blurry, jpeg artifacts, noise, grainy, "
        "watermark, signature, logo, border frame, "
        # Content failures
        "people, faces, hands, body parts, nsfw, "
        "complex shadows, lens flare, vignette, bokeh, depth of field"
    )


async def generate_concept_image(
    prompt: str,
    concept_label: str = "Concept",
    negative_prompt: str = "",
    layout_type: str = "concept",
    color_theme: str = "blue",
    visual_metaphor: str = "",
    num_sections: int = 4,
) -> str:
    """
    Generates a visual background template for the infographic.
    
    The prompt passed in is IGNORED in favor of a purpose-built visual prompt.
    This is intentional: the infographic_service builds semantic content for
    the HTML overlay; this function builds a visual structure for the background.
    
    Returns a data-URI (base64) so the browser never makes external requests.
    """
    # Build a visual-only prompt optimized for diffusion models
    visual_prompt = build_visual_background_prompt(
        layout_type=layout_type,
        color_theme=color_theme,
        visual_metaphor=visual_metaphor,
        num_sections=num_sections,
    )

    neg_prompt = negative_prompt or build_negative_prompt()
    hf_key = getattr(settings, "huggingface_api_key", None)

    print(f"[ImageService] Visual prompt ({len(visual_prompt)} chars): {visual_prompt[:120]}...")

    # 1. Try HuggingFace FLUX.1-schnell (best quality for free tier)
    if hf_key:
        result = await _try_hf(
            HF_FLUX_SCHNELL_URL, hf_key, visual_prompt, neg_prompt, steps=4
        )
        if result:
            return result

    # 2. Fall back to Pollinations (no key required)
    return await _pollinations_base64(visual_prompt, neg_prompt)


# ---------------------------------------------------------------------------
# HuggingFace Inference API
# ---------------------------------------------------------------------------

async def _try_hf(
    url: str,
    api_key: str,
    prompt: str,
    negative_prompt: str,
    steps: int = 4,
) -> str | None:
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "negative_prompt": negative_prompt,
            "num_inference_steps": steps,
            "width": 1024,
            "height": 1024,
            "guidance_scale": 3.5,
        },
    }

    def _call():
        return requests.post(url, headers=headers, json=payload, timeout=90)

    try:
        response = await asyncio.to_thread(_call)
        ct = response.headers.get("Content-Type", "")
        if response.status_code == 200 and "image" in ct:
            b64 = base64.b64encode(response.content).decode("utf-8")
            print(f"[ImageService] HF FLUX.1-schnell OK")
            return f"data:image/png;base64,{b64}"
        print(f"[ImageService] HF failed ({response.status_code}): {response.text[:200]}")
    except Exception as e:
        print(f"[ImageService] HF exception: {e}")

    return None


# ---------------------------------------------------------------------------
# Pollinations.ai — completely free, no key required
# Fetched server-side to avoid CORS/ad-blocker issues in the browser.
# ---------------------------------------------------------------------------

async def _pollinations_base64(prompt: str, negative_prompt: str = "") -> str:
    """
    Downloads the image from Pollinations on the server and returns base64.
    Uses the flux model with a seed for reproducibility.
    """
    # Pollinations works best with prompts under 300 chars
    clean = prompt[:300].rsplit(",", 1)[0] if len(prompt) > 300 else prompt
    encoded = quote(clean.strip())

    # Build URL with quality parameters
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        "?model=flux&width=1024&height=1024&nologo=true&seed=42&enhance=true"
    )
    print(f"[ImageService] Pollinations request ({len(clean)} chars)")

    def _fetch():
        return requests.get(url, timeout=90, headers={"User-Agent": "NeuralHome/1.0"})

    try:
        response = await asyncio.to_thread(_fetch)
        ct = response.headers.get("Content-Type", "")
        if response.status_code == 200 and "image" in ct:
            b64 = base64.b64encode(response.content).decode("utf-8")
            mime = "jpeg" if "jpeg" in ct else "png"
            print(f"[ImageService] Pollinations OK ({len(response.content)//1024}KB)")
            return f"data:image/{mime};base64,{b64}"
        print(f"[ImageService] Pollinations failed ({response.status_code})")
    except Exception as e:
        print(f"[ImageService] Pollinations exception: {e}")

    # Last resort: return direct URL (may fail in browser due to CORS)
    return url