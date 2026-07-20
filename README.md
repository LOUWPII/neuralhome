# neuralhome

Transform PDF study materials into interactive 3D memory palaces. Users upload documents, the system extracts concepts via a RAG pipeline (chunking + embeddings + LLM), maps them to physical anchor objects in a themed 3D room, and provides a full study toolkit (Socratic tutor, flashcards, quizzes, Feynman voice mentor, infographics). Built as a single-page React application with a FastAPI backend and Supabase for persistence and auth. Full bilingual support (English/Spanish) throughout the UI, LLM interactions, and voice synthesis.

## Architecture

```
Frontend (React 19 + Vite 7)          Backend (FastAPI Python)
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  LandingPage                │       │  POST /api/ingest/pdf        │
│  Dashboard (CRUD palaces)   │◄─────►│  POST /api/ingest/photo-pdf  │
│  PalaceView (3D room)       │  HTTP │  POST /api/chat/socratic     │
│  StudyToolkitView           │       │  POST /api/chat/feynman-voice│
│    ├ SocraticChatOverlay    │       │  POST /api/quiz/generate     │
│    ├ FlashCardsDeck         │       │  POST /api/flashcards/generate│
│    ├ FeynmanVoiceMentor     │       │  POST /api/infographic/generate│
│    ├ Quiz UI                │       │                              │
│    └ InfographicView        │       │  Services:                   │
│  AuthForms (i18n en/es)     │       │    llm_service.py            │
│                              │       │    embedding_service.py      │
│  3D Layer (Three.js/R3F):   │       │    rag_pipeline.py           │
│    RoomEnvironment          │       │    vision_service.py         │
│    KnowledgeObject          │       │    glb_matcher.py            │
│    FirstPersonControls      │       │    quiz_service.py           │
│    ConceptMiniature         │       │    infographic_service.py    │
│    roomAnchors.js           │       │    flashcards_service.py     │
└─────────────┬───────────────┘       └──────────────┬───────────────┘
              │                                     │
              └──────────┬──────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Supabase           │
              │  ├ PostgreSQL+pgvec │
              │  ├ Auth (email/pwd) │
              │  └ RLS              │
              └─────────────────────┘
```

**Data flow (ingest):** PDF upload -> PyMuPDF text extraction -> overlapping chunking (~300 tokens each) -> HuggingFace `BAAI/bge-small-en-v1.5` embeddings (384d) -> Groq Llama 3.3 70B extracts concepts with 1-to-1 anchor mapping -> concepts stored in Supabase with embeddings -> frontend renders KnowledgeObjects at anchor positions.

**Photo-based flow (optional):** Upload room photo -> Google Gemini (vision) detects furniture layout -> GLB matcher (LLM) maps detected objects to available `.glb` models -> RAG pipeline uses detected objects as dynamic anchors.

## Stack

**Backend:**
- Python 3.10+ with FastAPI 0.111+ and Uvicorn 0.30+
- PyMuPDF (fitz) 1.24+ for PDF parsing
- OpenAI Python client 1.30+ (used as Groq-compatible wrapper)
- google-genai 0.8+ (Gemini vision API)
- HuggingFace Inference API (BAAI/bge-small-en-v1.5, 384-dim embeddings)
- supabase-py 2.5+
- Pillow 10.3+
- Pydantic 2.7+ / pydantic-settings 2.3+

**Frontend:**
- React 19 + Vite 7
- Three.js 0.183 + @react-three/fiber 9.5 + @react-three/drei 10.7
- @react-three/cannon 6.6 (physics)
- react-router-dom 7.13
- @supabase/supabase-js 2.98
- zustand 5.0
- lucide-react 0.577
- react-pdf 10.4

**Database:**
- Supabase (PostgreSQL 15+)
- pgvector extension (384-dim HNSW index, cosine similarity)
- Row-Level Security (RLS) on palaces and concepts tables

**AI Providers:**
- Groq API: Llama 3.3 70B (concept mapping, quiz/flashcard/infographic generation) and Llama 3.1 8B (Socratic chat, Feynman voice, Neural Architect)
- Google Gemini: gemini-2.5-flash / pro (vision analysis of room photos)
- HuggingFace Inference API: BAAI/bge-small-en-v1.5 (embeddings)
- OpenAI DALL-E 3 (infographic background images)

## Features

- **PDF ingest and RAG pipeline** (`backend/app/services/rag_pipeline.py:91-146`): extracts text via PyMuPDF, creates overlapping chunks, generates embeddings, calls LLM for concept extraction and 1-to-1 anchor mapping
- **Socratic tutor** (`backend/app/services/llm_service.py:281-325`): 3-phase Socratic method (open questions -> hints -> explanations), grounded in RAG chunks, spatial memory anchoring to 3D objects, bilingual
- **Feynman voice mentor** (`backend/app/services/llm_service.py:331-417`): streaming SSE endpoint, Web Speech API STT/TTS, 3-second silence buffer, Spanish-optimized
- **Quiz generation and evaluation** (`backend/app/services/quiz_service.py`): 7-question mixed-type quizzes (multiple choice, open, true/false) with LLM-based evaluation
- **Flashcard generation** (`backend/app/services/flashcards_service.py`): 10 cards per generation, question + cloze types
- **Hybrid infographic pipeline** (`backend/app/services/infographic_service.py`): LLM extracts semantic structure -> DALL-E 3 generates visual background -> frontend renders text as HTML overlay
- **3D spatial memory palace** (`frontend/src/3d/RoomEnvironment.jsx`): themed rooms (neon_dev cyberpunk, silicon_valley modern), Rapier physics, fixed anchor positions per theme (`frontend/src/3d/roomAnchors.js`), KnowledgeObjects with floating orbs
- **First-person exploration** (`frontend/src/3d/FirstPersonControls.jsx`): PointerLock, WASD + arrow keys, sprint, hover glow on objects
- **Photo-based room generation** (`backend/app/services/vision_service.py`): Gemini vision analyzes uploaded room photo, extracts furniture layout, GLB matcher (`backend/app/services/glb_matcher.py`) maps to available 3D models
- **Internationalization** (`frontend/src/lib/translations.js`): full English/Spanish dictionary covering all UI text, auth forms, study tools

## How to run

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase project (URL + anon key)
- Groq API key
- HuggingFace API key (for embeddings)
- Google Gemini API key (optional, for photo-based rooms)
- OpenAI API key (optional, for infographic images)

### Backend
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
GROQ_API_KEY=<your-groq-key>
GEMINI_API_KEY=<your-gemini-key>
HUGGINGFACE_API_KEY=<your-hf-key>
OPENAI_API_KEY=<your-openai-key>
```

```bash
uvicorn app.main:app --reload --port 8001
```

### Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

```bash
npm run dev
```

### Database setup
Run the SQL files in `scripts/` against your Supabase project:
1. `supabase_schema.sql` — tables + RLS policies
2. `pgvector_migration.sql` — pgvector extension, embedding column, HNSW index, `match_concepts()` function
3. `add_room_metadata.sql` — additional room metadata columns
4. `quizzes_migration.sql` — quiz results table

## File structure

```
neuralhome/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI app, CORS, router mounting
│   │   ├── api/
│   │   │   ├── deps.py                    # Supabase dependency injection
│   │   │   └── endpoints/
│   │   │       ├── ingest.py              # PDF upload, photo+PDF, palace deletion
│   │   │       ├── chat.py                # Socratic chat, Feynman voice SSE, summary
│   │   │       ├── quiz.py                # Quiz generation, evaluation, retrieval
│   │   │       ├── flashcards.py          # Flashcard generation
│   │   │       └── infographic.py         # Infographic generation
│   │   ├── core/
│   │   │   ├── config.py                 # Pydantic settings (env vars)
│   │   │   └── assets.py                 # GLB synonym mapping
│   │   └── services/
│   │       ├── llm_service.py            # Groq client, prompts, architect/chat/feynman
│   │       ├── rag_pipeline.py           # PDF extract -> chunk -> embed -> LLM
│   │       ├── embedding_service.py      # HuggingFace Inference API
│   │       ├── vision_service.py         # Gemini photo analysis
│   │       ├── glb_matcher.py            # LLM-based object-to-GLB mapping
│   │       ├── quiz_service.py           # Quiz gen + evaluation
│   │       ├── flashcards_service.py     # Flashcard generation
│   │       ├── infographic_service.py    # Hybrid infographic pipeline
│   │       ├── image_service.py          # DALL-E image generation
│   │       └── gemini_service.py         # Legacy Groq concept extraction
│   ├── tests/
│   │   └── test_ingest.py                # Health check pytest
│   ├── test_hf.py                        # HuggingFace connectivity test
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx                       # Router (/, /dashboard, /palace/:id, /study/:p/:c)
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   ├── supabase.js               # Supabase client
│   │   │   └── translations.js           # Full i18n dictionary (en/es)
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx            # Auth state, CRUD, language preference
│   │   │   └── useTranslation.js         # Translation hook
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx           # Hero + particle canvas + auth modal
│   │   │   ├── Dashboard.jsx             # Palace grid, create/delete modals
│   │   │   ├── PalaceView.jsx            # 3D first-person room exploration
│   │   │   └── StudyToolkitView.jsx      # Split-screen study tools
│   │   ├── components/
│   │   │   ├── ui/AuthForms.jsx          # Sign-in/sign-up with i18n, validation
│   │   │   ├── HeroParticleCanvas.jsx    # Three.js particle animation
│   │   │   ├── IngestModal.jsx           # PDF upload modal
│   │   │   ├── RoomCreationModal.jsx     # Room blueprint + architect chat
│   │   │   ├── SocraticChatOverlay.jsx   # Q&A chat overlay
│   │   │   ├── FlashCardsDeck.jsx        # Flip-card review
│   │   │   ├── FeynmanVoiceMentor.jsx    # STT/TTS voice interface
│   │   │   ├── InfographicView.jsx       # Image + HTML overlay
│   │   │   ├── StudyToolCard.jsx         # Tab navigation
│   │   │   └── ProtectedRoute.jsx        # Auth guard
│   │   └── 3d/
│   │       ├── RoomEnvironment.jsx       # Physics room, anchors, GLB models
│   │       ├── roomAnchors.js            # Fixed anchor positions for themes
│   │       ├── FirstPersonControls.jsx   # PointerLock + WASD controls
│   │       ├── KnowledgeObject.jsx       # Data orb with orbiting text
│   │       ├── ConceptMiniature.jsx      # Miniature concept viewer
│   │       └── Environment.jsx           # Ambient lighting/sky
│   ├── public/models/                    # GLB assets
│   │   ├── bed.glb, chair.glb, desk.glb, bookshelf.glb
│   │   ├── lamp.glb, plant.glb, sofa.glb, window.glb
│   │   └── (additional: bed_linen.glb, led_tv.glb, nightstand.glb, etc.)
│   ├── test.cjs                          # Puppeteer E2E test
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   ├── supabase_schema.sql               # Tables + RLS
│   ├── pgvector_migration.sql            # Embedding column + HNSW index + match fn
│   ├── add_room_metadata.sql             # Additional columns
│   ├── fix_rls_policies.sql              # RLS fixes
│   └── fix_delete_policy.sql             # Deletion policy fix
├── kickstart/
│   └── documento_requerimientos.md       # Strategic requirements doc
├── rules/
│   └── buenas-practicas.md              # Coding conventions (Spanish)
├── skills/                               # AI-assisted development skill definitions
│   ├── n-core/ (spatial-logic, socratic-tutor, entropy)
│   └── vendor/ (FastAPI, RAG, Supabase knowledge bases)
├── TECHNICAL_DOC.md                     # Deep architecture documentation
└── README.md
```

## Testing

### Automated suite (pytest, runs in CI)

36 tests across 4 files under `backend/tests/`:

| File | Tests | What it covers |
|------|-------|----------------|
| `test_quiz_service.py` | 16 | Happy path for quiz generation (7-question mixed-type), language directives (en/es), error handling (invalid JSON, API failure, empty response), open-answer LLM evaluation, deterministic closed-answer scoring (exact match, case/whitespace insensitive) |
| `test_flashcards_service.py` | 8 | Happy path returns 10 flashcards, both types (question/cloze) present, required field validation, graceful handling of <10 cards, error/edge cases (invalid JSON, API exception, empty array, missing key) |
| `test_infographic_service.py` | 11 | Happy path full 3-stage pipeline, stage ordering, LLM failure triggers image-only fallback, non-dict LLM response fallback, default values for missing fields, context truncation (4000 chars stage1, 100 chars fallback), image_service failure, all expected keys in return |
| `test_ingest.py` | 1 | `/health` endpoint returns 200 |

All services are fully mocked — no real API keys required. Run locally with:

```bash
cd backend
pytest tests/ -v
```

### CI/CD — GitHub Actions

`.github/workflows/backend-tests.yml` runs on every push/PR to `main` with a matrix of Python 3.10, 3.11, and 3.12 on `ubuntu-latest`. Tests install both `requirements.txt` and `requirements-dev.txt`, then execute `pytest tests/ -v --tb=short`. The health check (`test_ingest.py`) is now part of this automated run.

### Manual scripts (outside automated suite)

- `frontend/test.cjs` — Puppeteer E2E script that navigates `/dashboard`, clicks the first palace link, and moves the mouse. Requires the dev server running on `localhost:5173`. Run with `node test.cjs` from `frontend/`.
- `backend/test_hf.py` — Standalone HuggingFace Inference API connectivity test (not part of the pytest suite).

**Current state:** backend has a CI pipeline with 36 automated tests covering quiz, flashcards, infographic, and health-check services. Frontend E2E (`test.cjs`) remains manual with no CI integration.

## Known issues and technical debt

1. **Embedding service falls back silently**: `backend/app/services/embedding_service.py:20-23` returns zero-vector placeholders when `HUGGINGFACE_API_KEY` is missing, masking configuration errors rather than failing explicitly.

2. **Duplicate LLM extraction logic**: `backend/app/services/gemini_service.py` contains an older version of concept extraction (with free-form `model_type` + `position` fields) that duplicates the same logic in `llm_service.py:extract_palace_from_chunks` (which uses fixed anchors). Both exist in the codebase; only `llm_service.py` is active via the ingest pipeline.

3. **Feynman voice streams via thread+queue**: `backend/app/api/endpoints/chat.py:269-282` bridges a synchronous generator to an async SSE endpoint using `threading.Thread` + `queue.Queue`. This works but bypasses FastAPI's native async streaming.

4. **Supabase RLS deletion workaround**: `backend/app/api/endpoints/ingest.py:348-359` manually deletes child concepts before the parent palace to work around a Supabase RLS policy issue with `ON DELETE CASCADE`. The accompanying SQL in `scripts/fix_delete_policy.sql` and `scripts/fix_rls_policies.sql` documents multiple attempts to fix this at the DB level.

5. **Theme stored in `description` field**: `backend/app/api/endpoints/chat.py:119` uses the `description` column of the `palaces` table to store the room theme string. This overloads a semantically different field.

6. **LLM retry with loop-detection bypass**: `backend/app/services/llm_service.py:234-258` injects `"[ignoring loop detection]"` into prompts when Groq's content safety loop detection triggers. This is an undocumented workaround for the hosted API.

7. **No type checking**: No mypy or pyright configuration. Backend uses `print()` for logging instead of a structured logger.

8. **Dependency versions unpinned**: `backend/requirements.txt` uses `>=` version specifiers. `frontend/package.json` versions are specific.

## Contributors

Atribución de los 6 servicios backend (`backend/app/services/`) verificada mediante `git blame` línea por línea. El análisis distingue autoría real (quién escribió cada línea) de autoría de commit.

- **David Beltrán Gómez** `estedavid0104@gmail.com`
  - Diseño e implementación completa de `quiz_service.py` (182 líneas, 100%) — generación de cuestionarios de 7 preguntas con 3 tipos (opción múltiple, abierta, verdadero/falso), evaluación de respuestas abiertas vía LLM y evaluación determinista de respuestas cerradas.
  - Diseño e implementación completa de `flashcards_service.py` (69 líneas, 100%) — generación de 10 flashcards por tanda, tipos pregunta y completar, con respuesta estructurada en JSON.
  - Diseño e implementación completa de `infographic_service.py` (258 líneas, 100%) — pipeline híbrido de 3 etapas: extracción semántica por LLM → generación de imagen de fondo (DALL-E 3) → metadatos de layout y paleta para overlay HTML en frontend.
  - Rediseño completo del prompting Socrático en `llm_service.py` (~6% del archivo): metodología de 3 fases (escalado por fallos), anclaje espacial a objetos 3D, detección de fatiga, directiva de idioma (`language: "es" / "en"`). Conversión de llamadas LLM síncronas a `asyncio.to_thread()` para no bloquear el event loop de FastAPI.
  - NO reclamar contribución sustancial en `rag_pipeline.py` (1 línea) ni `embedding_service.py` (0 líneas).
  - Frontend: landing page, auth forms, i18n, HeroParticleCanvas, KnowledgeObject inicial, API endpoints (chat, quiz, flashcards, infographic), documentación técnica, skill definitions, SQL migrations (quizzes).

- **Felipe Gómez López** `pipegomezl2006@gmail.com`
  - Pipeline RAG completo: extracción de texto de PDFs (`rag_pipeline.py`, 145 de 146 líneas), chunking con overlapping, emparejamiento semántico concepto-chunk.
  - Servicio de embeddings vía Hugging Face Inference API (`embedding_service.py`, 43 líneas, 100%).
  - Arquitectura base del LLM service: ROOM_ANCHORS, Neural Architect prompt, Feynman Voice Mentor, pipeline de extracción de palacios (`llm_service.py`, ~94% del archivo).
  - 3D room environment (RoomEnvironment con todos los sub-componentes de anclas), first-person controls, photo-based room generation (vision service, GLB matcher), Feynman voice mentor frontend, GLB 3D models, room anchors, StudyToolCard, ProtectedRoute, frontend config (Vite, ESLint), SQL migrations (RLS fixes, metadata), Puppeteer E2E test.

- **LOUWPII** `148557091+LOUWPII@users.noreply.github.com` — Repository owner. Initial commit, README creation and management, PR merges.

**Nota sobre coautoría en `llm_service.py`:** Las contribuciones de David Beltrán (~6% del archivo) modifican código original de Felipe Gómez. El prompt del tutor Socrático fue un reemplazo completo (metodología de 3 fases, anclaje espacial, detección de fatiga) sobre el prompt simple de Felipe, y los wrappers `asyncio.to_thread()` se añadieron sobre llamadas síncronas escritas por Felipe.