from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.endpoints import ingest
from app.api.endpoints import chat
from app.api.endpoints import quiz
from app.api.endpoints import flashcards
from app.api.endpoints import infographic

app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Backend API for NeuralHome RAG Pipeline",
)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "project": settings.project_name}

# Router inclusion
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(chat.router,   prefix="/api/chat",   tags=["chat"])
app.include_router(quiz.router,   prefix="/api/quiz",   tags=["quiz"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["flashcards"])
app.include_router(infographic.router, prefix="/api/infographic", tags=["infographic"])
