"""
PredictionService
=================
Responsible for:
  1. Loading workout_model.pkl and label_encoders.pkl exactly once at
     application startup (via the module-level singleton `prediction_service`).
  2. Preprocessing a user's profile into the 8 features the model expects.
  3. Running the prediction and returning the workout name + confidence %.

Feature vector required by the model (confirmed by inspection):
  ['Age', 'Gender', 'Height_cm', 'Weight_kg', 'BMI', 'Goal', 'Experience', 'Medical_Condition']

Label encoder keys (from label_encoders.pkl dict):
  'Gender'     → ['Female', 'Male']
  'Goal'       → ['Muscle Gain', 'Weight Gain', 'Weight Loss']
  'Experience' → ['Advanced', 'Beginner', 'Intermediate']
  'Medical'    → ['Diabetes', 'Hypertension', 'Knee Pain']
  'Workout'    → ['Cardio', 'Full Body', 'HIIT', 'Strength', 'Upper/Lower Split']

Preprocessing mirrors the training pipeline exactly:
  - Categorical columns encoded with their respective LabelEncoders
  - BMI calculated as weight_kg / (height_m ** 2)
  - Medical condition: if the user's free-text matches a known condition
    (case-insensitive substring) that value is encoded; otherwise defaults
    to the most common class seen during training ('Hypertension', index 1)
"""

import warnings
import logging
import pathlib
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Path helpers ───────────────────────────────────────────────────────────────
# Resolve paths relative to *this file* so the service works regardless of the
# working directory from which uvicorn is started.
_HERE   = pathlib.Path(__file__).resolve().parent          # app/prediction/
_MODELS = _HERE.parent.parent / "models"                   # backend/models/

MODEL_PATH = _MODELS / "workout_model.pkl"
ENCODER_PATH = _MODELS / "label_encoders.pkl"

# ── Profile → model field mappings ────────────────────────────────────────────
# The DB stores fitness_goal values from the profile form.
# Map them to the training labels used by the 'Goal' encoder.
GOAL_MAP = {
    "Weight Loss":     "Weight Loss",
    "Muscle Gain":     "Muscle Gain",
    "Endurance":       "Weight Loss",   # closest training class
    "Flexibility":     "Weight Loss",   # closest training class
    "General Fitness": "Weight Loss",   # closest training class
    # fallback for any unmapped value
    "default":         "Weight Loss",
}

# Map profile experience_level to training 'Experience' encoder classes
EXPERIENCE_MAP = {
    "Beginner":     "Beginner",
    "Intermediate": "Intermediate",
    "Advanced":     "Advanced",
    "default":      "Beginner",
}

# Map profile gender to training 'Gender' encoder classes
GENDER_MAP = {
    "Male":              "Male",
    "Female":            "Female",
    "Other":             "Male",            # encoder has only Male/Female
    "Prefer not to say": "Male",
    "default":           "Male",
}

# Known medical conditions the encoder was trained on (lowercase for matching)
KNOWN_MEDICAL = {
    "diabetes":       "Diabetes",
    "hypertension":   "Hypertension",
    "knee pain":      "Knee Pain",
    "knee":           "Knee Pain",
}

# Default medical class when user has no matching condition
DEFAULT_MEDICAL = "Hypertension"


class PredictionService:
    """
    Singleton-style service that loads the ML model once and exposes
    a single public method: `predict(profile)`.

    Usage
    -----
    # At startup:
    prediction_service = PredictionService()
    prediction_service.load()

    # Per request:
    result = prediction_service.predict(profile_orm_object)
    """

    def __init__(self) -> None:
        self._model    = None
        self._encoders: dict = {}
        self._loaded   = False

    # ── Loading ────────────────────────────────────────────────────────────────

    def load(self) -> None:
        """
        Load model and encoders from disk.
        Called once during FastAPI startup.
        Raises RuntimeError with a clear message if files are missing.
        """
        # Suppress sklearn version-mismatch warnings (model trained on 1.6.1,
        # running on 1.9.0 — the RandomForestClassifier API is compatible).
        warnings.filterwarnings(
            "ignore",
            category=UserWarning,
            message=".*InconsistentVersionWarning.*",
        )
        # Also suppress the broader sklearn unpickling warnings
        warnings.filterwarnings(
            "ignore",
            message=".*Trying to unpickle estimator.*",
        )

        try:
            import joblib
        except ImportError as exc:
            raise RuntimeError(
                "joblib is not installed. Run: pip install joblib"
            ) from exc

        # Validate model file
        if not MODEL_PATH.exists():
            raise RuntimeError(
                f"workout_model.pkl not found at: {MODEL_PATH}\n"
                "Place the trained model file in backend/models/"
            )

        # Validate encoder file
        if not ENCODER_PATH.exists():
            raise RuntimeError(
                f"label_encoders.pkl not found at: {ENCODER_PATH}\n"
                "Place the encoder file in backend/models/"
            )

        logger.info("Loading workout model from: %s", MODEL_PATH)
        self._model = joblib.load(str(MODEL_PATH))

        logger.info("Loading label encoders from: %s", ENCODER_PATH)
        self._encoders = joblib.load(str(ENCODER_PATH))

        self._loaded = True
        logger.info(
            "PredictionService ready — model type: %s | classes: %s",
            type(self._model).__name__,
            list(self._model.classes_),
        )

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Preprocessing ──────────────────────────────────────────────────────────

    def _encode(self, key: str, value: str) -> int:
        """
        Encode a single categorical value using the named LabelEncoder.
        Falls back to 0 (first class) if the value is unseen.
        """
        le = self._encoders.get(key)
        if le is None:
            raise ValueError(f"No encoder found for key='{key}'")
        try:
            return int(le.transform([value])[0])
        except ValueError:
            # Value was not seen during training — use class index 0
            logger.warning(
                "Unseen value '%s' for encoder '%s', defaulting to class '%s'",
                value, key, le.classes_[0],
            )
            return 0

    def _resolve_medical(self, conditions: Optional[str]) -> str:
        """
        Map the free-text medical_conditions field to one of the three
        trained classes.  Checks for case-insensitive substrings.
        Falls back to DEFAULT_MEDICAL when no match is found.
        """
        if not conditions or not conditions.strip():
            return DEFAULT_MEDICAL
        lowered = conditions.lower()
        for keyword, label in KNOWN_MEDICAL.items():
            if keyword in lowered:
                return label
        return DEFAULT_MEDICAL

    def _build_feature_vector(self, profile) -> np.ndarray:
        """
        Convert a UserProfile ORM object into the 8-element numpy array
        the model expects:
          [Age, Gender_enc, Height_cm, Weight_kg, BMI, Goal_enc,
           Experience_enc, Medical_enc]
        """
        # ── Validate required numeric fields ──────────────────────────────────
        required = {
            "age":         profile.age,
            "height_cm":   profile.height_cm,
            "weight_kg":   profile.weight_kg,
        }
        missing = [k for k, v in required.items() if v is None]
        if missing:
            raise ValueError(
                f"Profile is missing required fields: {', '.join(missing)}"
            )

        # ── BMI ───────────────────────────────────────────────────────────────
        height_m = float(profile.height_cm) / 100.0
        if height_m <= 0:
            raise ValueError("height_cm must be greater than 0")
        bmi = float(profile.weight_kg) / (height_m ** 2)

        # ── Categorical fields — map profile values → training classes ────────
        gender_label     = GENDER_MAP.get(profile.gender or "", GENDER_MAP["default"])
        goal_label       = GOAL_MAP.get(profile.fitness_goal or "", GOAL_MAP["default"])
        experience_label = EXPERIENCE_MAP.get(
            profile.experience_level or "", EXPERIENCE_MAP["default"]
        )
        medical_label    = self._resolve_medical(profile.medical_conditions)

        # ── Encode categoricals ───────────────────────────────────────────────
        gender_enc     = self._encode("Gender",     gender_label)
        goal_enc       = self._encode("Goal",       goal_label)
        experience_enc = self._encode("Experience", experience_label)
        medical_enc    = self._encode("Medical",    medical_label)

        # ── Assemble in the exact order the model was trained with ─────────────
        # ['Age', 'Gender', 'Height_cm', 'Weight_kg', 'BMI',
        #  'Goal', 'Experience', 'Medical_Condition']
        features = np.array([[
            float(profile.age),
            float(gender_enc),
            float(profile.height_cm),
            float(profile.weight_kg),
            round(bmi, 4),
            float(goal_enc),
            float(experience_enc),
            float(medical_enc),
        ]])

        logger.debug(
            "Feature vector — age=%.0f gender=%s(%d) h=%.1f w=%.1f "
            "bmi=%.2f goal=%s(%d) exp=%s(%d) medical=%s(%d)",
            profile.age,
            gender_label, gender_enc,
            profile.height_cm, profile.weight_kg, bmi,
            goal_label, goal_enc,
            experience_label, experience_enc,
            medical_label, medical_enc,
        )

        return features

    # ── Prediction ─────────────────────────────────────────────────────────────

    def predict(self, profile) -> dict:
        """
        Run a workout recommendation for the given UserProfile ORM object.

        Returns a dict with:
          recommended_workout : str
          confidence          : float (0–100, rounded to 1 dp)

        Raises
        ------
        RuntimeError  — model not loaded
        ValueError    — profile has missing or invalid fields
        Exception     — any sklearn prediction failure
        """
        if not self._loaded:
            raise RuntimeError(
                "PredictionService has not been loaded. "
                "Call prediction_service.load() during application startup."
            )

        # Build feature array from profile
        X = self._build_feature_vector(profile)

        # ── Predict class ──────────────────────────────────────────────────────
        predicted_class_int = int(self._model.predict(X)[0])

        # ── Confidence via predict_proba ───────────────────────────────────────
        confidence = 0.0
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(X)[0]
            confidence = round(float(proba[predicted_class_int]) * 100, 1)

        # ── Decode integer class → workout label ───────────────────────────────
        workout_encoder = self._encoders.get("Workout")
        if workout_encoder is None:
            raise RuntimeError("'Workout' key missing from label_encoders.pkl")

        workout_name = str(workout_encoder.inverse_transform([predicted_class_int])[0])

        logger.info(
            "Prediction → workout='%s' class=%d confidence=%.1f%%",
            workout_name, predicted_class_int, confidence,
        )

        return {
            "recommended_workout": workout_name,
            "confidence":          confidence,
        }


# ── Module-level singleton ────────────────────────────────────────────────────
# Imported by main.py startup event and by the predict router.
# The model is loaded exactly once — not on every request.
prediction_service = PredictionService()
