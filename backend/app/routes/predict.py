"""
Workout Prediction API routes

  POST /predict/workout
    - Requires valid JWT (Bearer token)
    - Fetches the authenticated user's profile from SQLite automatically
    - Runs the ML model and returns a workout recommendation
    - Never asks the frontend to resend profile data
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile
from app import schemas
from app.auth import decode_access_token
from app.prediction.service import prediction_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["AI Prediction"])

# ─── Reuse the same JWT dependency pattern as profile.py ──────────────────────
_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Validates the Bearer JWT and returns the authenticated User row.
    Raises HTTP 401 for invalid/expired tokens.
    Raises HTTP 404 if the user account no longer exists.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int | None = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user_id.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    return user


# ─── POST /predict/workout ────────────────────────────────────────────────────

@router.post(
    "/workout",
    response_model=schemas.WorkoutPredictionResponse,
    summary="Generate an AI workout recommendation",
    responses={
        400: {"model": schemas.WorkoutPredictionError, "description": "Incomplete or invalid profile"},
        401: {"model": schemas.WorkoutPredictionError, "description": "Unauthorized"},
        404: {"model": schemas.WorkoutPredictionError, "description": "Profile not found"},
        503: {"model": schemas.WorkoutPredictionError, "description": "ML model not available"},
    },
)
def predict_workout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates a personalised workout recommendation for the authenticated user.

    Flow:
      1. Validate JWT → get user_id
      2. Fetch UserProfile from SQLite using user_id (no frontend re-submission needed)
      3. Validate that the 6 core profile fields are present
      4. Preprocess profile into the model's 8-feature vector
      5. Run RandomForestClassifier.predict() + predict_proba()
      6. Decode integer class → workout label
      7. Return recommendation with confidence % and timestamp
    """

    # ── Guard: model must be loaded ────────────────────────────────────────────
    if not prediction_service.is_loaded:
        logger.error("Prediction requested but model is not loaded")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model is not available. Please try again later.",
        )

    # ── Fetch profile from DB ──────────────────────────────────────────────────
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Fitness profile not found. "
                "Please complete your profile before requesting a workout plan."
            ),
        )

    # ── Validate core fields required for prediction ───────────────────────────
    missing = []
    if profile.age is None:            missing.append("age")
    if profile.gender is None:         missing.append("gender")
    if profile.height_cm is None:      missing.append("height")
    if profile.weight_kg is None:      missing.append("weight")
    if profile.fitness_goal is None:   missing.append("fitness goal")
    if profile.experience_level is None: missing.append("experience level")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Profile is incomplete. Missing fields: {', '.join(missing)}. "
                "Please update your profile before generating a workout plan."
            ),
        )

    # ── Run prediction ─────────────────────────────────────────────────────────
    try:
        result = prediction_service.predict(profile)
    except ValueError as exc:
        # Invalid field values — bad profile data
        logger.warning("Prediction ValueError for user %d: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        # Model not loaded, encoder missing, etc.
        logger.error("Prediction RuntimeError for user %d: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI prediction service encountered an error. Please try again.",
        )
    except Exception as exc:
        # Catch-all: unexpected sklearn / numpy errors
        logger.exception("Unexpected prediction error for user %d", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during prediction.",
        )

    # ── Build and return response ──────────────────────────────────────────────
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return schemas.WorkoutPredictionResponse(
        recommended_workout=result["recommended_workout"],
        confidence=result["confidence"],
        generated_at=generated_at,
        status="success",
    )
