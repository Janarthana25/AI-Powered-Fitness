"""
Diet Recommendation API route

  POST /predict/diet
    - Requires valid JWT (Bearer token)
    - Fetches the authenticated user's profile from SQLite automatically
    - Computes BMI, BMR, macros, water, sleep
    - Returns a personalised Indian meal plan
    - Meal names in Tamil when preferred_language == 'Tamil', else English
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
from app.prediction.diet_service import diet_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predict", tags=["AI Prediction"])

# ─── JWT dependency — identical pattern to predict.py and injury.py ───────────
_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validates the Bearer JWT and returns the authenticated User row."""
    token   = credentials.credentials
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


# ─── POST /predict/diet ───────────────────────────────────────────────────────

@router.post(
    "/diet",
    response_model=schemas.DietResponse,
    summary="Generate a personalised AI diet recommendation",
    responses={
        400: {"model": schemas.WorkoutPredictionError, "description": "Incomplete profile"},
        401: {"model": schemas.WorkoutPredictionError, "description": "Unauthorized"},
        404: {"model": schemas.WorkoutPredictionError, "description": "Profile not found"},
    },
)
def predict_diet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a complete personalised diet plan for the authenticated user.

    Flow:
      1. Validate JWT → get user_id
      2. Fetch UserProfile from SQLite (no re-submission needed from frontend)
      3. Validate that core fields (age, gender, height, weight) are present
      4. Compute BMI, BMR (Mifflin-St Jeor), TDEE, goal-adjusted calories
      5. Derive protein / carbs / fat / water / sleep targets
      6. Select Indian meal plan based on goal + preferred_language
      7. Return all metrics and the full meal plan
    """

    # ── Fetch profile ──────────────────────────────────────────────────────────
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
                "Please complete your profile before requesting a diet plan."
            ),
        )

    # ── Validate core fields ───────────────────────────────────────────────────
    missing = []
    if profile.age       is None: missing.append("age")
    if profile.gender    is None: missing.append("gender")
    if profile.height_cm is None: missing.append("height")
    if profile.weight_kg is None: missing.append("weight")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Profile is incomplete. Missing fields: {', '.join(missing)}. "
                "Please update your profile before generating a diet plan."
            ),
        )

    # ── Compute diet ───────────────────────────────────────────────────────────
    try:
        result = diet_service.calculate(profile)
    except ValueError as exc:
        logger.warning("Diet ValueError for user %d: %s", current_user.id, exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception:
        logger.exception("Unexpected diet error for user %d", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the diet plan.",
        )

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return schemas.DietResponse(
        bmi=result["bmi"],
        bmi_category=result["bmi_category"],
        bmr=result["bmr"],
        daily_calories=result["daily_calories"],
        protein_g=result["protein_g"],
        carbs_g=result["carbs_g"],
        fat_g=result["fat_g"],
        water_L=result["water_L"],
        sleep_hours=result["sleep_hours"],
        breakfast=result["breakfast"],
        mid_morning=result["mid_morning"],
        lunch=result["lunch"],
        evening_snack=result["evening_snack"],
        dinner=result["dinner"],
        goal=result["goal"],
        language=result["language"],
        generated_at=generated_at,
        status="success",
    )
