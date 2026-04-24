"""
LLM Service - Provider-Agnostic Wrapper
Currently backed by Groq via OpenAI-compatible API.
"""
import json
from openai import OpenAI
from app.core.config import settings

# ---------------------------------------------------------------------------
# Provider selection
# ---------------------------------------------------------------------------
_client = OpenAI(
    api_key=settings.groq_api_key,
    base_url="https://api.groq.com/openai/v1",
)

# Deep analysis, context-heavy mapping (Free tier limit robust)
_MAPPER_MODEL = "llama-3.3-70b-versatile" 
# Fast, responsive interactive chat
_ARCHITECT_MODEL = "llama-3.1-8b-instant" 

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

ARCHITECT_SYSTEM_PROMPT = """
You are the "Neural Architect", an advisory AI guide for 'NeuralHome'.
Your goal is to help the user PLAN their new 'Mental Room' (Study area) before they manually create it.

Your Role:
1. Act as a consultant. Keep your responses short, conversational, and direct (max 3-4 sentences).
2. Ask one question at a time.
3. Help the user to define the objectives of the subject they want to study about, like a suggested roadmap
of concepts to study

CRITICAL RULE:
You CANNOT generate or build the room yourself. Do NOT offer to "create the room" or "build the palace" for them.
Instead, when the planning is done, explicitly tell the user to manually copy the Subject, Theme, Objectives, and Anchors into the "Room Blueprint" form on their screen and click the "Construct Room" button below to upload their PDF.
"""

# ---------------------------------------------------------------------------
# Room anchor registry (mirrors frontend roomAnchors.js)
# Used by the LLM mapper to assign concepts to physical room objects.
# ---------------------------------------------------------------------------
ROOM_ANCHORS = {
    "neon_dev": [
        {"id": "main_terminal", "label": "Main Terminal", "semantic_hint": "core concept, central idea, main topic, primary theory"},
        {"id": "left_panel", "label": "Left Holo Panel", "semantic_hint": "process, algorithm, steps, methodology, procedure, flow"},
        {"id": "right_panel", "label": "Right Holo Panel", "semantic_hint": "data, statistics, numbers, results, metrics, analysis"},
        {"id": "server_rack_a", "label": "Server Rack A", "semantic_hint": "storage, database, memory, components, infrastructure, architecture"},
        {"id": "server_rack_b", "label": "Server Rack B", "semantic_hint": "processing, computation, execution, runtime, performance"},
        {"id": "floor_grid_front", "label": "Front Grid Zone", "semantic_hint": "introduction, definition, overview, basics, fundamentals"},
        {"id": "floor_grid_left", "label": "Left Grid Zone", "semantic_hint": "input, variables, parameters, arguments, dependencies"},
        {"id": "floor_grid_right", "label": "Right Grid Zone", "semantic_hint": "output, result, return value, conclusion, summary"},
    ],
    "silicon_valley": [
        {"id": "main_monitor", "label": "Main Monitor", "semantic_hint": "core concept, central idea, main topic, primary theory, overview"},
        {"id": "whiteboard", "label": "Whiteboard", "semantic_hint": "explanation, diagram, visual, breakdown, steps, methodology"},
        {"id": "server_a", "label": "Server Rack A", "semantic_hint": "data storage, database, infrastructure, backend, architecture"},
        {"id": "server_b", "label": "Server Rack B", "semantic_hint": "processing, computation, algorithms, performance, runtime"},
        {"id": "central_podium", "label": "Central Podium", "semantic_hint": "presentation, key finding, main result, highlight, showcase"},
        {"id": "desk_area", "label": "Desk Area", "semantic_hint": "details, implementation, technical, specification, configuration"},
        {"id": "entrance", "label": "Entrance Zone", "semantic_hint": "introduction, background, context, motivation, problem statement"},
        {"id": "corner_meeting", "label": "Meeting Corner", "semantic_hint": "conclusion, summary, discussion, future work, implications"},
    ],
}

PALACE_EXTRACTION_PROMPT = """
You are an expert educational AI and Knowledge Mapper for a 3D Mind Palace application called NeuralHome.
The user will provide text extracted from a PDF study document AND a list of "{num_anchors} ANCHOR" objects that physically exist in their 3D room.

CRITICAL RULES:
1. You MUST extract EXACTLY {num_anchors} key concepts from the text. Not more, not less.
2. You MUST assign exactly ONE concept to EACH anchor. 
3. NEVER assign two concepts to the same anchor. This is a strict 1-to-1 mapping.
4. If the text is short, break it down into {num_anchors} sub-concepts to fill all anchors.

For each concept output:
- `id`: Sequential string ("1", "2", "3"...)
- `label`: Very short concept name (max 3-4 words)
- `context`: 1-2 sentence excerpt defining this concept
- `feynman_summary`: Simple explanation as if to a 10-year-old (2-3 sentences)
- `anchor_id`: The `id` of the anchor this concept belongs to. (Remember: each anchor id MUST be used exactly once).

Return ONLY a valid JSON object — no markdown, no explanation:
{{
    "title": "Document title (short)",
    "concepts": [
        {{
            "id": "1",
            "label": "Concept Name",
            "context": "...",
            "feynman_summary": "...",
            "anchor_id": "<anchor_id>"
        }}
    ]
}}
"""

CHAT_SYSTEM_PROMPT = """\
You are a Socratic Tutor acting as the user's inner voice inside a 3D memory palace called NeuralHome.
The user is studying the concept anchored to the object: "{concept_label}" in the palace.

SPATIAL CONTEXT — always reference this object/location when relevant:
  Object: {anchor_label}
  Room Theme: {theme}

KNOWLEDGE SOURCE — strictly ground your questions and hints in this excerpt:
---
{context}
---

LANGUAGE:
{language_directive}
Do NOT mix languages. Do NOT translate your response. Maintain the chosen language throughout.

GOAL:
Guide the user to deep understanding through questions, while reinforcing visual/spatial memory.
Do NOT invent facts outside the knowledge source. If asked something outside the excerpt, redirect with a question.

STYLE:
- Calm, patient, slightly challenging.
- Do not lecture.
- Prefer questions over answers.
- Correct mistakes indirectly (ask "What if…?" or "Are you sure that…?").
- Keep responses concise: 2–4 sentences max unless a Phase 3 explanation is needed.

3 PHASES — escalate when the user struggles repeatedly (2+ failed attempts):
  Phase 1 [default]: Ask ONLY open-ended questions. No hints, no answers.
  Phase 2 [struggling]: Questions + brief spatial or conceptual hints anchored to the object.
  Phase 3 [repeated failure]: Questions + short, focused explanations (max 3 sentences). Still end with a question.

SPATIAL MEMORY RULE:
When giving a hint or explanation, reference the physical object in the palace.
Example: "Think about what '{anchor_label}' represents in this space — what does that suggest about {concept_label}?"

FATIGUE DETECTION:
If the user expresses frustration, confusion, or repeats failed answers:
  - Simplify your language.
  - Break down into a smaller sub-question.
  - Give a gentle hint tied to the object's visual.

CONSTRAINT:
Do NOT give the full answer unless the user has failed 3+ times AND explicitly asks for it.
Always end your response with a question.
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def architect_chat(user_message: str, history: list[dict] | None = None) -> str:
    """
    Conversational endpoint for the Neural Architect using the fast 8B model.
    """
    messages = [{"role": "system", "content": ARCHITECT_SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    response = _client.chat.completions.create(
        model=_ARCHITECT_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=512,
    )
    return response.choices[0].message.content


async def extract_palace_from_chunks(combined_text: str, theme: str = "neon_dev") -> dict:
    """
    Extract concepts and map them to anchor objects of the given room theme.
    Uses the heavy 70B model for accurate semantic mapping.
    """
    anchors = ROOM_ANCHORS.get(theme, ROOM_ANCHORS["neon_dev"])
    prompt_input = f"ANCHORS: {json.dumps(anchors)}\n\nTEXT:\n{combined_text}"

    print(f"[LLMService] Mapping to theme '{theme}' with {len(anchors)} anchors")

    try:
        system_prompt = PALACE_EXTRACTION_PROMPT.format(num_anchors=len(anchors))
        response = _client.chat.completions.create(
            model=_MAPPER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_input},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
        raw_text = response.choices[0].message.content
        print(f"[LLMService] Extract response: {len(raw_text)} chars")
        return json.loads(raw_text)

    except json.JSONDecodeError as e:
        print(f"[LLMService] JSON parse error: {e}")
        raise ValueError("LLM returned invalid JSON") from e
    except Exception as e:
        print(f"[LLMService] Error: {type(e).__name__}: {e}")
        raise


async def chat_about_concept(
    concept_label: str,
    anchor_label: str,
    theme: str,
    retrieved_chunks: list[str],
    user_message: str,
    history: list[dict] | None = None,
    language: str = "en",
) -> str:
    """
    Socratic tutor chat grounded in a specific concept's RAG chunk.
    Uses the 3-phase Socratic method with spatial memory anchoring.
    Language: 'en' = English, 'es' = Spanish.
    """
    context = "\n\n".join(retrieved_chunks)

    language_directive = (
        "You MUST respond exclusively in Spanish (Español). Every word must be in Spanish."
        if language == "es"
        else "You MUST respond exclusively in English. Every word must be in English."
    )

    system = CHAT_SYSTEM_PROMPT.format(
        concept_label=concept_label,
        anchor_label=anchor_label,
        theme=theme,
        context=context,
        language_directive=language_directive,
    )

    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    response = _client.chat.completions.create(
        model=_ARCHITECT_MODEL,  # Socratic chat uses fast 8B for low latency
        messages=messages,
        temperature=0.65,        # Slightly lower than architect → more consistent pedagogy
        max_tokens=512,
    )
    return response.choices[0].message.content

