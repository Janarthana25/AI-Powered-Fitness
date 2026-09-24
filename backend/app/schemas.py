"""
Pydantic schemas for request/response validation and serialization.
"""

from pydantic import BaseModel, EmailStr, field_validator
import re
from typing import Optional


# ─── Signup ───────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return v

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        v = v.strip()
        # Accept 10-digit Indian mobile numbers, optionally prefixed with +91
        pattern = r"^(\+91)?[6-9]\d{9}$"
        if not re.match(pattern, v):
            raise ValueError("Enter a valid 10-digit phone number")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class SignupResponse(BaseModel):
    message: str
    user_id: int


# ─── Login ────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Password cannot be empty")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class UserPublic(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


LoginResponse.model_rebuild()


# ─── Forgot / Reset Password ──────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # In production this would NOT be returned; only for demo/testing
    otp: Optional[str] = None


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("OTP cannot be empty")
        return v


class VerifyOTPResponse(BaseModel):
    message: str
    reset_token: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class ResetPasswordResponse(BaseModel):
    message: str


# ─── Profile ──────────────────────────────────────────────────────────────────

# Allowed enum values — validated here so errors are caught at the API boundary
GENDER_OPTIONS = {"Male", "Female", "Other", "Prefer not to say"}
GOAL_OPTIONS   = {
    "Weight Loss", "Muscle Gain", "Endurance",
    "Flexibility", "General Fitness",
}
EXPERIENCE_OPTIONS = {"Beginner", "Intermediate", "Advanced"}
LANGUAGE_OPTIONS   = {
    "Tamil", "English", "Hindi", "Telugu",
    "Kannada", "Malayalam", "Bengali", "Marathi",
}


class ProfileSaveRequest(BaseModel):
    """
    Payload for both creating and updating a user profile.
    All fields are optional so the client can do partial saves,
    but age / gender / height / weight / goal / experience are
    required for a profile to be considered 'complete'.
    """
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    fitness_goal: Optional[str] = None
    experience_level: Optional[str] = None
    medical_conditions: Optional[str] = None
    preferred_language: Optional[str] = None

    @field_validator("age")
    @classmethod
    def age_valid(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (5 <= v <= 120):
            raise ValueError("Age must be between 5 and 120")
        return v

    @field_validator("gender")
    @classmethod
    def gender_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in GENDER_OPTIONS:
            raise ValueError(f"Gender must be one of: {', '.join(sorted(GENDER_OPTIONS))}")
        return v

    @field_validator("height_cm")
    @classmethod
    def height_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (50.0 <= v <= 300.0):
            raise ValueError("Height must be between 50 and 300 cm")
        return v

    @field_validator("weight_kg")
    @classmethod
    def weight_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (10.0 <= v <= 500.0):
            raise ValueError("Weight must be between 10 and 500 kg")
        return v

    @field_validator("fitness_goal")
    @classmethod
    def goal_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in GOAL_OPTIONS:
            raise ValueError(f"Fitness goal must be one of: {', '.join(sorted(GOAL_OPTIONS))}")
        return v

    @field_validator("experience_level")
    @classmethod
    def experience_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in EXPERIENCE_OPTIONS:
            raise ValueError(
                f"Experience level must be one of: {', '.join(sorted(EXPERIENCE_OPTIONS))}"
            )
        return v

    @field_validator("medical_conditions")
    @classmethod
    def conditions_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) > 500:
            raise ValueError("Medical conditions must be 500 characters or fewer")
        return v.strip() if v else v

    @field_validator("preferred_language")
    @classmethod
    def language_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in LANGUAGE_OPTIONS:
            raise ValueError(
                f"Language must be one of: {', '.join(sorted(LANGUAGE_OPTIONS))}"
            )
        return v


class ProfileResponse(BaseModel):
    """
    Profile data returned to the client.
    `is_complete` is True when all six core fields are filled.
    """
    id: int
    user_id: int
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    fitness_goal: Optional[str] = None
    experience_level: Optional[str] = None
    medical_conditions: Optional[str] = None
    preferred_language: Optional[str] = None
    is_complete: bool = False

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_completion(cls, profile) -> "ProfileResponse":
        """
        Build the response and compute is_complete in one place.
        A profile is 'complete' when all six core fields are non-null.
        """
        core_fields = (
            profile.age,
            profile.gender,
            profile.height_cm,
            profile.weight_kg,
            profile.fitness_goal,
            profile.experience_level,
        )
        obj = cls.model_validate(profile)
        obj.is_complete = all(f is not None for f in core_fields)
        return obj


class ProfileStatusResponse(BaseModel):
    """Lightweight response for checking whether a profile exists and is complete."""
    has_profile: bool
    is_complete: bool
    profile: Optional[ProfileResponse] = None


# ─── Workout Prediction ───────────────────────────────────────────────────────

class WorkoutPredictionResponse(BaseModel):
    """
    Response returned by POST /predict/workout.

    Fields:
      recommended_workout : human-readable workout name from the model
      confidence          : probability of the top class as a percentage (0–100)
      generated_at        : UTC ISO-8601 timestamp of when the prediction was made
      status              : always "success" when HTTP 200 is returned
    """
    recommended_workout: str
    confidence: float
    generated_at: str
    status: str = "success"


class WorkoutPredictionError(BaseModel):
    """Structured error body returned alongside 4xx / 5xx responses."""
    detail: str
    status: str = "error"


# ─── Injury Risk Prediction ───────────────────────────────────────────────────

class InjuryRiskRequest(BaseModel):
    """
    Input payload for POST /predict/injury-risk.

    Angles are in degrees (0–180). Duration is in minutes.
    medical_condition defaults to 'None' if not supplied.
    """
    exercise:          str
    knee_angle:        float
    hip_angle:         float
    shoulder_angle:    float
    back_angle:        float
    duration:          float
    medical_condition: Optional[str] = "None"

    @field_validator("exercise")
    @classmethod
    def exercise_valid(cls, v: str) -> str:
        valid = {
            "Bench Press", "Bicep Curl", "Deadlift", "Jump Squat",
            "Lunge", "Plank", "Push-up", "Shoulder Press", "Squat",
        }
        if v not in valid:
            raise ValueError(f"exercise must be one of: {', '.join(sorted(valid))}")
        return v

    @field_validator("knee_angle", "hip_angle", "shoulder_angle", "back_angle")
    @classmethod
    def angle_range(cls, v: float) -> float:
        if not (0.0 <= v <= 180.0):
            raise ValueError("Angle must be between 0 and 180 degrees")
        return v

    @field_validator("duration")
    @classmethod
    def duration_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Duration must be greater than 0")
        return v

    @field_validator("medical_condition")
    @classmethod
    def medical_valid(cls, v: Optional[str]) -> str:
        valid = {"None", "Knee Pain", "Lower Back Pain", "Shoulder Pain"}
        if v and v not in valid:
            return "None"   # silently default rather than reject
        return v or "None"


class InjuryRiskResponse(BaseModel):
    """
    Response returned by POST /predict/injury-risk.

    Fields:
      risk_level        : 'High' | 'Low' | 'Medium'
      confidence        : model probability for the top class (0–100)
      recommendation    : human-readable safety advice
      prevention_tips   : list of actionable tip strings
      generated_at      : UTC ISO-8601 timestamp
      status            : always "success" on HTTP 200
    """
    risk_level:       str
    confidence:       float
    recommendation:   str
    prevention_tips:  list
    generated_at:     str
    status:           str = "success"


# ─── Diet Recommendation ──────────────────────────────────────────────────────

class DietResponse(BaseModel):
    """
    Response returned by POST /predict/diet.

    Nutrition metrics are computed server-side from the stored profile
    (Mifflin-St Jeor BMR → TDEE → goal-adjusted calories → macros).
    The meal plan is an Indian diet tailored to the user's goal and language.
    """
    # ── Metrics ───────────────────────────────────────────────────────────────
    bmi:            float
    bmi_category:   str
    bmr:            float
    daily_calories: int
    protein_g:      float
    carbs_g:        float
    fat_g:          float
    water_L:        float
    sleep_hours:    float

    # ── Indian meal plan ──────────────────────────────────────────────────────
    breakfast:      str
    mid_morning:    str
    lunch:          str
    evening_snack:  str
    dinner:         str

    # ── Meta ──────────────────────────────────────────────────────────────────
    goal:           str
    language:       str
    generated_at:   str
    status:         str = "success"


# ─── Progress Tracking ────────────────────────────────────────────────────────

class ProgressLogRequest(BaseModel):
    """
    Payload for POST /progress — log one day's progress entry.
    All fields are optional so partial logs are accepted.
    """
    weight_kg:         Optional[float]   = None
    water_intake_L:    Optional[float]   = None
    calories_consumed: Optional[int]     = None
    sleep_hours:       Optional[float]   = None
    workout_completed: Optional[bool]    = False
    notes:             Optional[str]     = None

    @field_validator("weight_kg")
    @classmethod
    def weight_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (10.0 <= v <= 500.0):
            raise ValueError("weight_kg must be between 10 and 500")
        return v

    @field_validator("water_intake_L")
    @classmethod
    def water_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.0 <= v <= 20.0):
            raise ValueError("water_intake_L must be between 0 and 20")
        return v

    @field_validator("calories_consumed")
    @classmethod
    def calories_valid(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (0 <= v <= 15000):
            raise ValueError("calories_consumed must be between 0 and 15000")
        return v

    @field_validator("sleep_hours")
    @classmethod
    def sleep_valid(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0.0 <= v <= 24.0):
            raise ValueError("sleep_hours must be between 0 and 24")
        return v

    @field_validator("notes")
    @classmethod
    def notes_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) > 500:
            raise ValueError("notes must be 500 characters or fewer")
        return v.strip() if v else v


class ProgressEntryResponse(BaseModel):
    """Single progress log entry as returned by the API."""
    id:                int
    weight_kg:         Optional[float]   = None
    water_intake_L:    Optional[float]   = None
    calories_consumed: Optional[int]     = None
    sleep_hours:       Optional[float]   = None
    workout_completed: bool
    notes:             Optional[str]     = None
    created_at:        str               # ISO-8601 UTC string

    class Config:
        from_attributes = True


class ProgressHistoryResponse(BaseModel):
    """Paginated list of progress entries."""
    entries: list
    total:   int


class ProgressStatsResponse(BaseModel):
    """
    Aggregated statistics computed from all entries for the current user.

    Fields:
      current_weight      : most recent weight_kg entry (or None)
      starting_weight     : first weight_kg entry (or None)
      weight_change_kg    : current − starting (negative = lost weight)
      goal_progress_pct   : percentage toward goal weight
                            (profile.weight_kg is baseline; 0 if no goal derivable)
      workout_streak      : consecutive days with workout_completed = 1 up to today
      total_workouts      : total entries where workout_completed = 1
      avg_sleep_hours     : average sleep across all logged entries
      avg_water_L         : average daily water intake
      avg_calories        : average daily calories consumed
      weekly_weights      : last 7 weight entries [{date, weight}] for the chart
      total_entries       : total number of log entries
    """
    current_weight:    Optional[float]  = None
    starting_weight:   Optional[float]  = None
    weight_change_kg:  Optional[float]  = None
    goal_progress_pct: float            = 0.0
    workout_streak:    int              = 0
    total_workouts:    int              = 0
    avg_sleep_hours:   Optional[float]  = None
    avg_water_L:       Optional[float]  = None
    avg_calories:      Optional[float]  = None
    weekly_weights:    list             = []   # [{date: str, weight: float}]
    total_entries:     int              = 0
