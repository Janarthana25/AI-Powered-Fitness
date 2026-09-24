"""
பயிற்சித் தோழன் AI — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes.auth     import router as auth_router
from app.routes.profile  import router as profile_router
from app.routes.predict  import router as predict_router
from app.routes.injury   import router as injury_router
from app.routes.diet     import router as diet_router
from app.routes.progress import router as progress_router
from app.prediction.service        import prediction_service
from app.prediction.injury_service import injury_service

logger = logging.getLogger(__name__)

# Create all database tables on startup (auth + profile + progress)
Base.metadata.create_all(bind=engine)


# ─── Lifespan — load ML models once at startup ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        prediction_service.load()
        logger.info("✓ Workout prediction model loaded successfully")
    except RuntimeError as exc:
        logger.error("✗ Failed to load workout prediction model: %s", exc)

    try:
        injury_service.load()
        logger.info("✓ Injury risk model loaded successfully")
    except RuntimeError as exc:
        logger.error("✗ Failed to load injury risk model: %s", exc)

    yield  # server is running

    logger.info("Shutting down பயிற்சித் தோழன் AI")


app = FastAPI(
    title="பயிற்சித் தோழன் AI",
    description="AI Powered Fitness & Injury Prevention Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(predict_router)
app.include_router(injury_router)
app.include_router(diet_router)
app.include_router(progress_router)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "பயிற்சித் தோழன் AI API is running"}


@app.get("/health", tags=["Health"])
def health():
    return {
        "status":        "healthy",
        "workout_model": "loaded" if prediction_service.is_loaded else "unavailable",
        "injury_model":  "loaded" if injury_service.is_loaded     else "unavailable",
    }
