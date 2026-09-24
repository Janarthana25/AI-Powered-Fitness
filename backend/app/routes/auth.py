"""
Authentication API routes:
  POST /auth/signup
  POST /auth/login
  POST /auth/forgot-password
  POST /auth/verify-otp
  POST /auth/reset-password
"""

import logging
import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app import schemas
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_reset_token,
    decode_reset_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Module-level logger — output appears in the uvicorn terminal
logger = logging.getLogger(__name__)


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    return "".join(random.choices(string.digits, k=length))


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower()).first()


# ─── Signup ────────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=schemas.SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    """
    Creates a new user account after validating input.
    - Normalises email to lowercase
    - Hashes password with bcrypt before storing
    - Returns 409 if email is already registered
    """
    email = payload.email.lower()

    # Check duplicate email
    existing = _get_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    new_user = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=payload.phone.strip(),
        password_hash=hash_password(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return schemas.SignupResponse(
        message="Account created successfully! Please log in.",
        user_id=new_user.id,
    )


# ─── Login ─────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=schemas.LoginResponse,
    summary="Authenticate user and return JWT",
)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user with email + password.
    Returns a JWT access token on success.
    Returns 401 on invalid credentials (deliberately vague to prevent enumeration).
    """
    user = _get_user_by_email(db, payload.email)

    # Use constant-time comparison; never reveal whether email or password was wrong
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email, "user_id": user.id})

    return schemas.LoginResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserPublic.model_validate(user),
    )


# ─── Forgot Password ───────────────────────────────────────────────────────────

@router.post(
    "/forgot-password",
    response_model=schemas.ForgotPasswordResponse,
    summary="Request a password reset OTP",
)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a 6-digit OTP valid for 10 minutes.

    Development mode: OTP is printed to the backend console AND returned in the
    API response so the frontend demo box can display it.

    Production: remove the `otp` field from the response and send via email/SMS.
    """
    user = _get_user_by_email(db, payload.email)

    # Always return 200 — never reveal whether an email is registered
    if not user:
        logger.info("OTP requested for unregistered email: %s", payload.email)
        return schemas.ForgotPasswordResponse(
            message="If this email is registered, an OTP has been sent.",
            otp=None,
        )

    otp = _generate_otp()

    # Store a timezone-NAIVE expiry so the read-back from SQLite is consistent.
    # (SQLite stores datetimes as strings without tz offset; reading them back
    #  produces naive datetime objects. Storing naive avoids the tz mismatch
    #  that would cause a TypeError in verify_otp.)
    user.otp = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # ── Development: always log OTP to the backend console ──────────────────
    logger.warning(
        "\n"
        "╔══════════════════════════════════════╗\n"
        "║        🔑  OTP GENERATED (DEV)       ║\n"
        "║  Email  : %-28s  ║\n"
        "║  OTP    : %-28s  ║\n"
        "║  Expiry : 10 minutes                  ║\n"
        "╚══════════════════════════════════════╝",
        payload.email,
        otp,
    )

    # NOTE: Replace the block below with an email/SMS call in production.
    # Never return the OTP in an API response in production.
    return schemas.ForgotPasswordResponse(
        message="OTP sent successfully. Valid for 10 minutes.",
        otp=otp,  # Demo only — remove in production
    )


# ─── Verify OTP ────────────────────────────────────────────────────────────────

@router.post(
    "/verify-otp",
    response_model=schemas.VerifyOTPResponse,
    summary="Verify OTP and receive a password-reset token",
)
def verify_otp(payload: schemas.VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Validates the OTP. On success returns a short-lived reset_token
    that must be used with /auth/reset-password.
    """
    user = _get_user_by_email(db, payload.email)

    if not user or not user.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Check expiry — compare naive datetimes (both stored and checked as UTC naive)
    if user.otp_expiry and datetime.utcnow() > user.otp_expiry:
        user.otp = None
        user.otp_expiry = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )

    if user.otp != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP.",
        )

    # Clear OTP after successful verification
    user.otp = None
    user.otp_expiry = None
    db.commit()

    reset_token = create_reset_token(user.email)
    return schemas.VerifyOTPResponse(
        message="OTP verified successfully.",
        reset_token=reset_token,
    )


# ─── Reset Password ────────────────────────────────────────────────────────────

@router.post(
    "/reset-password",
    response_model=schemas.ResetPasswordResponse,
    summary="Set a new password using the reset token",
)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Accepts a reset_token (from /verify-otp) and sets the new password.
    The reset_token is a short-lived JWT to prevent replay attacks.
    """
    email = decode_reset_token(payload.reset_token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )

    user = _get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return schemas.ResetPasswordResponse(message="Password reset successfully. Please log in.")
