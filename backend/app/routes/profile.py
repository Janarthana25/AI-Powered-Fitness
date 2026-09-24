"""
Profile API routes — all endpoints require a valid JWT.

  GET  /profile/me        → fetch the current user's profile (or 404 if none)
  PUT  /profile/me        → create or update the current user's profile
  GET  /profile/me/status → lightweight check: has_profile + is_complete

JWT is extracted from the Authorization: Bearer <token> header.
The token is decoded using the same SECRET_KEY / ALGORITHM used in app/auth.py.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile
from app import schemas
from app.auth import decode_access_token

router = APIRouter(prefix="/profile", tags=["Profile"])

# ─── JWT dependency ────────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency — validates the Bearer JWT and returns the User row.
    Raises HTTP 401 on any invalid / expired token.
    Raises HTTP 404 if the user_id in the token no longer exists in the DB.
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


# ─── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=schemas.ProfileResponse,
    summary="Get current user's profile",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the profile for the authenticated user.
    Raises 404 if the user hasn't created a profile yet.
    """
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete your profile.",
        )
    return schemas.ProfileResponse.from_orm_with_completion(profile)


@router.put(
    "/me",
    response_model=schemas.ProfileResponse,
    summary="Create or update current user's profile",
)
def save_my_profile(
    payload: schemas.ProfileSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upsert — creates a new profile row if one doesn't exist, otherwise updates
    only the fields that are explicitly provided (non-None values in the payload).

    This means the client can send partial updates without wiping existing data.
    """
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )

    # Build a dict of only the fields that were explicitly sent
    update_data = payload.model_dump(exclude_unset=True)

    if profile is None:
        # First-time creation
        profile = UserProfile(user_id=current_user.id, **update_data)
        db.add(profile)
    else:
        # Partial update — only overwrite provided fields
        for field, value in update_data.items():
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return schemas.ProfileResponse.from_orm_with_completion(profile)


@router.get(
    "/me/status",
    response_model=schemas.ProfileStatusResponse,
    summary="Check whether the current user has a complete profile",
)
def get_profile_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lightweight endpoint called right after login to decide whether to
    redirect the user to /complete-profile or straight to /dashboard.

    Returns:
      has_profile  : whether any profile row exists
      is_complete  : whether all six core fields are filled
      profile      : the full profile object (or null)
    """
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        return schemas.ProfileStatusResponse(
            has_profile=False,
            is_complete=False,
            profile=None,
        )

    profile_response = schemas.ProfileResponse.from_orm_with_completion(profile)
    return schemas.ProfileStatusResponse(
        has_profile=True,
        is_complete=profile_response.is_complete,
        profile=profile_response,
    )
