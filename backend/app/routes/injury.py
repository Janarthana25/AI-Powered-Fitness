"""
Injury Risk Prediction API route

  POST /predict/injury-risk
    - Requires valid JWT (Bearer token)
    - Accepts exercise form angles + duration + medical condition
    - Returns risk level (High / Low / Medium), confidence %, safety advice
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app import schemas
from app.auth import decode_access_token
from app.prediction.injury_service import injury_service, EXERCISE_OPTIONS, MEDICAL_OPTIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["AI Prediction"])

# ─── JWT dependency (same pattern as profile.py and predict.py) ───────────────
_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validates the Bearer JWT and returns the authenticated User row."""
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


# ─── GET /predict/injury-risk/options ─────────────────────────────────────────
@router.get(
    "/injury-risk/options",
    summary="Get valid input options for the injury risk form",
    tags=["AI Prediction"],
)
def injury_risk_options():
    """
    Returns the allowed values for the exercise and medical_condition fields.
    Called by the frontend when building the form dropdowns.
    No authentication required.
    """
    return {
        "exercises":          EXERCISE_OPTIONS,
        "medical_conditions": MEDICAL_OPTIONS,
    }


# ─── POST /predict/injury-risk ────────────────────────────────────────────────
@router.post(
    "/injury-risk",
    response_model=schemas.InjuryRiskResponse,
    summary="Predict injury risk for a given exercise and form angles",
    responses={
        400: {"model": schemas.WorkoutPredictionError, "description": "Invalid input"},
        401: {"model": schemas.WorkoutPredictionError, "description": "Unauthorized"},
        503: {"model": schemas.WorkoutPredictionError, "description": "Model unavailable"},
    },
)
def predict_injury_risk(
    payload: schemas.InjuryRiskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Predicts injury risk from exercise form angles.

    Flow:
      1. Validate JWT → authenticate user
      2. Validate request body (exercise, angles, duration, medical condition)
      3. Encode categoricals and assemble 7-feature vector
      4. Run RandomForestClassifier.predict() + predict_proba()
      5. Decode integer class → risk level label
      6. Return risk level, confidence %, recommendation, prevention tips
    """

    # Guard: model must be loaded
    if not injury_service.is_loaded:
        logger.error("Injury risk prediction requested but model not loaded")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Injury risk model is not available. Please try again later.",
        )

    # Run prediction
    try:
        result = injury_service.predict(payload.model_dump())
    except ValueError as exc:
        logger.warning("Injury ValueError for user %d: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        logger.error("Injury RuntimeError for user %d: %s", current_user.id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Injury prediction service encountered an error.",
        )
    except Exception:
        logger.exception("Unexpected injury prediction error for user %d", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during prediction.",
        )

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return schemas.InjuryRiskResponse(
        risk_level=result["risk_level"],
        confidence=result["confidence"],
        recommendation=result["recommendation"],
        prevention_tips=result["prevention_tips"],
        generated_at=generated_at,
        status="success",
    )
