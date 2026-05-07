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
You are a Knowledge Mapper for a 3D Mind Palace app called NeuralHome.
Extract key concepts from the study text and map them to physical room anchors.

ANCHOR COUNT: {num_anchors}
IMPORTANT RULES:
- Extract EXACTLY {num_anchors} concepts. Each anchor gets ONE concept, no repeats.
- If few anchors exist, make concepts BROAD (group related subtopics together).
- Keep label short (2-4 words). Keep feynman_summary simple (1-2 sentences max).
- Each anchor_id must appear exactly once.

Output ONLY this JSON (no markdown):
{{"title":"...","concepts":[{{"id":"1","label":"...","context":"...","feynman_summary":"...","anchor_id":"..."}}, ...]}}
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


async def extract_palace_from_chunks(combined_text: str, theme: str = "neon_dev", custom_anchors: list = None) -> dict:
    """
    Extract concepts and map them to anchor objects of the given room theme.
    Uses the heavy 70B model for accurate semantic mapping.
    Post-processes to ensure strict 1-to-1 anchor assignment.
    Retries up to 3 times on loop-detection or transient errors.
    """
    import time
    anchors = custom_anchors if custom_anchors else ROOM_ANCHORS.get(theme, ROOM_ANCHORS["neon_dev"])
    
    # Truncate text to avoid excessively long prompts that trigger loop detection
    MAX_TEXT_CHARS = 8000
    if len(combined_text) > MAX_TEXT_CHARS:
        combined_text = combined_text[:MAX_TEXT_CHARS] + "\n[... truncated for brevity ...]"

    anchor_list = [{"id": a["id"], "label": a["label"], "hint": a.get("semantic_hint", "")} for a in anchors]
    prompt_input = f"ANCHORS:\n{json.dumps(anchor_list, ensure_ascii=False)}\n\nSTUDY TEXT:\n{combined_text}"

    print(f"[LLMService] Mapping to theme '{theme}' with {len(anchors)} anchors")

    system_prompt = PALACE_EXTRACTION_PROMPT.format(num_anchors=len(anchors))

    MAX_RETRIES = 3
    for attempt in range(MAX_RETRIES):
        try:
            response = _client.chat.completions.create(
                model=_MAPPER_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": prompt_input},
                ],
                temperature=0.35,          # Slightly higher to reduce repetition
                response_format={"type": "json_object"},
                max_tokens=min(300 * len(anchors), 3000),  # ~300 tokens per concept
            )
            raw_text = response.choices[0].message.content
            print(f"[LLMService] Extract response: {len(raw_text)} chars (attempt {attempt + 1})")
            result = json.loads(raw_text)
            break  # success

        except json.JSONDecodeError as e:
            print(f"[LLMService] JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == MAX_RETRIES - 1:
                raise ValueError("LLM returned invalid JSON after retries") from e
            time.sleep(1)

        except Exception as e:
            err_str = str(e).lower()
            print(f"[LLMService] Error (attempt {attempt + 1}): {type(e).__name__}: {e}")

            # On loop detection, add the bypass tag and retry with simpler prompt
            if "loop" in err_str or "looping" in err_str:
                print("[LLMService] Loop detection triggered — simplifying prompt and retrying")
                # Inject the bypass tag the API requires
                prompt_input_retry = "[ignoring loop detection]\n" + prompt_input
                try:
                    response = _client.chat.completions.create(
                        model=_MAPPER_MODEL,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user",   "content": prompt_input_retry},
                        ],
                        temperature=0.5,
                        response_format={"type": "json_object"},
                        max_tokens=min(250 * len(anchors), 2500),
                    )
                    raw_text = response.choices[0].message.content
                    result = json.loads(raw_text)
                    break  # success after loop bypass
                except Exception as e2:
                    print(f"[LLMService] Retry after loop bypass also failed: {e2}")
            
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(2 ** attempt)  # exponential backoff

    # ── POST-PROCESS: enforce strict 1-to-1 anchor mapping ───────────────────
    valid_anchor_ids = [a["id"] for a in anchors]
    used_anchors = set()
    clean_concepts = []
    for concept in result.get("concepts", []):
        aid = concept.get("anchor_id")
        if aid in used_anchors or aid not in valid_anchor_ids:
            unused = [a for a in valid_anchor_ids if a not in used_anchors]
            if unused:
                concept["anchor_id"] = unused[0]
                aid = unused[0]
            else:
                continue  # drop extras beyond anchor count
        used_anchors.add(aid)
        clean_concepts.append(concept)

    result["concepts"] = clean_concepts[:len(anchors)]
    print(f"[LLMService] Final: {len(result['concepts'])} concepts for {len(anchors)} anchors")
    return result


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


# ---------------------------------------------------------------------------
# Feynman Voice Mentor  (Streaming)
# ---------------------------------------------------------------------------

FEYNMAN_VOICE_SYSTEM_PROMPT = """\
You are the "Feynman Voice Mentor", a warm and encouraging voice tutor inside NeuralHome.
You help the user DEEPLY understand a concept by applying the Feynman Technique through spoken dialogue.

OBJECT & CONCEPT CONTEXT:
  3D Object: {anchor_label}
  Concept: {concept_label}
  Room Theme: {theme}

KNOWLEDGE SOURCE (from the user's PDF):
---
{context}
---

LANGUAGE:
{language_directive}

YOUR PERSONALITY & VOICE STYLE:
- You sound like a supportive study partner, NOT a robot or professor.
- Use natural speech markers: "Hmm", "Ah, I see", "Right", "Well...", "So basically...", "Okay so..."
- Be brief: MAX 40 words per response to keep voice synthesis fast.
- Sound warm and human. Vary your sentence structure.
- Celebrate small wins: "Nice!", "Exactly!", "You're getting it!"

FEYNMAN METHOD FLOW:
1. Start by asking what the user knows about a subtopic of {concept_label}.
2. Listen to their explanation. If correct, go deeper or move to next subtopic.
3. If wrong, gently redirect: "Interesting take, but the material suggests something different. What if...?"
4. Always end with a question to keep them thinking.

CRITICAL RULES:
- NEVER use markdown formatting (no asterisks, no bold, no lists). Use ONLY plain text.
- NEVER give long lectures. This is a CONVERSATION.
- If the user is silent or confused, offer a gentle hint tied to {anchor_label}.
- If the user changes topic, redirect: "Great point, but let's finish {concept_label} first."
- Keep answers SHORT for voice synthesis. Max 2-3 sentences.
- Ground all claims in the KNOWLEDGE SOURCE above. Don't invent facts.
"""


def feynman_voice_stream(
    concept_label: str,
    anchor_label: str,
    theme: str,
    retrieved_chunks: list[str],
    user_message: str,
    history: list[dict] | None = None,
    language: str = "en",
):
    """
    Streaming generator for the Feynman Voice Mentor.
    Yields text chunks as they arrive from Groq for real-time TTS.
    """
    context = "\n\n".join(retrieved_chunks)

    language_directive = (
        "You MUST respond exclusively in Spanish (Español). Every word must be in Spanish."
        if language == "es"
        else "You MUST respond exclusively in English. Every word must be in English."
    )

    system = FEYNMAN_VOICE_SYSTEM_PROMPT.format(
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

    stream = _client.chat.completions.create(
        model=_ARCHITECT_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=200,  # Keep short for voice
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content

