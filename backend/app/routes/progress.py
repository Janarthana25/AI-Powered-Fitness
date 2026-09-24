"""
Progress Tracking API routes — all endpoints require a valid JWT.

  POST /progress            → log a new daily progress entry
  GET  /progress/history    → paginated list of the user's entries (newest first)
  GET  /progress/stats      → aggregated stats + weekly weight trend for charts
"""

import logging
from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile, Progress
from app import schemas
from app.auth import decode_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["Progress Tracking"])

# ─── JWT dependency (identical pattern to profile.py) ─────────────────────────
_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
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


# ─── Helper — serialise a Progress ORM row ────────────────────────────────────

def _serialise_entry(entry: Progress) -> dict:
    """Convert a Progress ORM row to the ProgressEntryResponse dict."""
    dt = entry.created_at
    if dt is None:
        iso = ""
    else:
        # created_at is stored as naive UTC (server_default=func.now())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        iso = dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    return {
        "id":                entry.id,
        "weight_kg":         entry.weight_kg,
        "water_intake_L":    entry.water_intake_L,
        "calories_consumed": entry.calories_consumed,
        "sleep_hours":       entry.sleep_hours,
        "workout_completed": bool(entry.workout_completed),
        "notes":             entry.notes,
        "created_at":        iso,
    }


# ─── POST /progress ───────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=schemas.ProgressEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new daily progress entry",
)
def log_progress(
    payload: schemas.ProgressLogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates a new progress log entry for the authenticated user.
    All fields are optional — log only what you measured today.
    """
    entry = Progress(
        user_id=current_user.id,
        weight_kg=payload.weight_kg,
        water_intake_L=payload.water_intake_L,
        calories_consumed=payload.calories_consumed,
        sleep_hours=payload.sleep_hours,
        workout_completed=1 if payload.workout_completed else 0,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    logger.info("Progress entry created — user_id=%d entry_id=%d", current_user.id, entry.id)
    return _serialise_entry(entry)


# ─── GET /progress/history ────────────────────────────────────────────────────

@router.get(
    "/history",
    response_model=schemas.ProgressHistoryResponse,
    summary="Get paginated progress history for the current user",
)
def get_history(
    skip:  int = Query(0,  ge=0,   description="Number of entries to skip"),
    limit: int = Query(30, ge=1, le=100, description="Max entries to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the user's progress entries, newest first.
    Supports pagination via skip / limit query params.
    """
    base_q = (
        db.query(Progress)
        .filter(Progress.user_id == current_user.id)
        .order_by(Progress.created_at.desc())
    )
    total   = base_q.count()
    entries = base_q.offset(skip).limit(limit).all()

    return schemas.ProgressHistoryResponse(
        entries=[_serialise_entry(e) for e in entries],
        total=total,
    )


# ─── GET /progress/stats ──────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=schemas.ProgressStatsResponse,
    summary="Get aggregated progress statistics for the current user",
)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Computes aggregated stats from all progress entries:
      - Current / starting weight and change
      - Goal-progress percentage (toward profile target weight)
      - Workout streak (consecutive days ending today)
      - Averages for sleep, water, calories
      - Last 7 weight entries for the chart
    """
    # All entries ordered oldest → newest for streak + trend calculations
    all_entries = (
        db.query(Progress)
        .filter(Progress.user_id == current_user.id)
        .order_by(Progress.created_at.asc())
        .all()
    )

    total_entries = len(all_entries)

    if total_entries == 0:
        return schemas.ProgressStatsResponse()

    # ── Weight tracking ────────────────────────────────────────────────────────
    weight_entries = [e for e in all_entries if e.weight_kg is not None]
    current_weight = weight_entries[-1].weight_kg if weight_entries else None
    starting_weight = weight_entries[0].weight_kg if weight_entries else None
    weight_change_kg = (
        round(current_weight - starting_weight, 2)
        if (current_weight is not None and starting_weight is not None)
        else None
    )

    # ── Goal progress % ────────────────────────────────────────────────────────
    # Derive a simple "% of weight-change goal achieved" using profile
    goal_progress_pct = 0.0
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if (
        profile
        and profile.fitness_goal in ("Weight Loss", "Weight Gain", "Muscle Gain")
        and starting_weight is not None
        and current_weight is not None
        and weight_change_kg is not None
    ):
        if profile.fitness_goal == "Weight Loss":
            # Assume goal is to lose 10 % of starting weight
            target_change = -(starting_weight * 0.10)
        else:
            # Muscle Gain / Weight Gain — assume goal is to gain 5 % of starting
            target_change = starting_weight * 0.05

        if target_change != 0:
            raw_pct = (weight_change_kg / target_change) * 100.0
            goal_progress_pct = round(min(max(raw_pct, 0.0), 100.0), 1)

    # ── Workout streak ─────────────────────────────────────────────────────────
    # Count consecutive days ending today where workout_completed = 1
    today = date.today()
    # Build a set of dates that have a completed workout
    workout_dates = set()
    for e in all_entries:
        if e.workout_completed and e.created_at:
            d = e.created_at.date() if hasattr(e.created_at, "date") else None
            if d:
                workout_dates.add(d)

    streak = 0
    check_day = today
    while check_day in workout_dates:
        streak += 1
        check_day -= timedelta(days=1)

    total_workouts = sum(1 for e in all_entries if e.workout_completed)

    # ── Averages ───────────────────────────────────────────────────────────────
    sleep_vals    = [e.sleep_hours    for e in all_entries if e.sleep_hours    is not None]
    water_vals    = [e.water_intake_L for e in all_entries if e.water_intake_L is not None]
    calorie_vals  = [e.calories_consumed for e in all_entries if e.calories_consumed is not None]

    avg_sleep    = round(sum(sleep_vals)   / len(sleep_vals),   1) if sleep_vals   else None
    avg_water    = round(sum(water_vals)   / len(water_vals),   2) if water_vals   else None
    avg_calories = round(sum(calorie_vals) / len(calorie_vals), 0) if calorie_vals else None

    # ── Weekly weight trend (last 7 weight entries for the chart) ─────────────
    last7 = weight_entries[-7:] if len(weight_entries) >= 7 else weight_entries
    weekly_weights = []
    for e in last7:
        d = e.created_at
        if d is None:
            continue
        label = d.strftime("%d %b") if hasattr(d, "strftime") else str(d)
        weekly_weights.append({"date": label, "weight": e.weight_kg})

    return schemas.ProgressStatsResponse(
        current_weight=current_weight,
        starting_weight=starting_weight,
        weight_change_kg=weight_change_kg,
        goal_progress_pct=goal_progress_pct,
        workout_streak=streak,
        total_workouts=total_workouts,
        avg_sleep_hours=avg_sleep,
        avg_water_L=avg_water,
        avg_calories=avg_calories,
        weekly_weights=weekly_weights,
        total_entries=total_entries,
    )
