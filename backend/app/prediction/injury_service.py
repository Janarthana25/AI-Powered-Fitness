"""
InjuryPredictionService
=======================
Loads injury_risk_model (1).pkl and injury_label_encoders (1).pkl once at
startup and exposes a single public method: predict(payload).

Feature vector required by the model (7 features, confirmed by inspection):
  ['Exercise', 'Knee_Angle', 'Hip_Angle', 'Shoulder_Angle',
   'Back_Angle', 'Duration', 'Medical_Condition']

Label encoder keys (from injury_label_encoders (1).pkl dict):
  'Exercise'         → ['Bench Press','Bicep Curl','Deadlift','Jump Squat',
                         'Lunge','Plank','Push-up','Shoulder Press','Squat']
  'Medical_Condition'→ ['Knee Pain','Lower Back Pain','None','Shoulder Pain']
  'Risk_Level'       → ['High','Low','Medium']

Output classes: 0=High  1=Low  2=Medium  (decoded via Risk_Level encoder)

Safety recommendations are derived from the predicted risk level and the
exercise type — no hardcoded data, all driven by model output.
"""

import logging
import pathlib
import warnings
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── Path helpers ───────────────────────────────────────────────────────────────
_HERE    = pathlib.Path(__file__).resolve().parent        # app/prediction/
_MODELS  = _HERE.parent.parent / "models"                 # backend/models/

# Files have a space-parenthesis suffix from the dataset export
MODEL_PATH   = _MODELS / "injury_risk_model (1).pkl"
ENCODER_PATH = _MODELS / "injury_label_encoders (1).pkl"

# ── Valid input options exposed to the router / frontend ──────────────────────
EXERCISE_OPTIONS = [
    "Bench Press", "Bicep Curl", "Deadlift", "Jump Squat",
    "Lunge", "Plank", "Push-up", "Shoulder Press", "Squat",
]

MEDICAL_OPTIONS = ["None", "Knee Pain", "Lower Back Pain", "Shoulder Pain"]

# ── Risk-level safety content ─────────────────────────────────────────────────
# Keyed by the decoded Risk_Level string ('High' | 'Low' | 'Medium')
SAFETY_CONTENT = {
    "Low": {
        "recommendation": (
            "Your form and angles look safe for this exercise. "
            "Continue with your current technique."
        ),
        "prevention_tips": [
            "Maintain a controlled range of motion throughout each rep.",
            "Warm up for at least 5–10 minutes before starting.",
            "Stay hydrated and rest adequately between sessions.",
            "Log any unusual discomfort immediately and stop if pain occurs.",
        ],
    },
    "Medium": {
        "recommendation": (
            "Some angles suggest mild stress on joints. "
            "Consider reducing load or adjusting form before progressing."
        ),
        "prevention_tips": [
            "Reduce working weight by 10–20% and focus on perfect form.",
            "Record a video of your set and review joint alignment.",
            "Include mobility drills targeting the affected joint.",
            "Consider consulting a coach or physiotherapist for form feedback.",
            "Avoid training to failure until form is corrected.",
        ],
    },
    "High": {
        "recommendation": (
            "High injury risk detected. Stop this exercise immediately and "
            "consult a physiotherapist before resuming."
        ),
        "prevention_tips": [
            "Stop the exercise and rest the affected area for 48–72 hours.",
            "Apply ice for 15–20 minutes every 2 hours if swelling is present.",
            "Seek a professional physiotherapy assessment before returning.",
            "Switch to low-impact alternatives (swimming, cycling) during recovery.",
            "Do not attempt to 'push through' pain — this worsens injury.",
            "Re-assess your training programme with a certified coach.",
        ],
    },
}


class InjuryPredictionService:
    """
    Singleton-style service that loads the injury risk ML model once and
    exposes predict(payload) per request.

    Usage
    -----
    # At startup:
    injury_service = InjuryPredictionService()
    injury_service.load()

    # Per request:
    result = injury_service.predict({
        "exercise": "Squat",
        "knee_angle": 90.0,
        "hip_angle": 85.0,
        "shoulder_angle": 60.0,
        "back_angle": 10.0,
        "duration": 30,
        "medical_condition": "None",
    })
    """

    def __init__(self) -> None:
        self._model    = None
        self._encoders: dict = {}
        self._loaded   = False

    # ── Loading ────────────────────────────────────────────────────────────────

    def load(self) -> None:
        """
        Load model and encoders from disk.
        Called once during FastAPI startup via the lifespan context manager.
        Raises RuntimeError with a clear message if files are missing.
        """
        warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")
        warnings.filterwarnings("ignore", message=".*Trying to unpickle estimator.*")

        try:
            import joblib
        except ImportError as exc:
            raise RuntimeError("joblib is not installed. Run: pip install joblib") from exc

        if not MODEL_PATH.exists():
            raise RuntimeError(
                f"injury_risk_model not found at: {MODEL_PATH}\n"
                "Place the trained model file in backend/models/"
            )
        if not ENCODER_PATH.exists():
            raise RuntimeError(
                f"injury_label_encoders not found at: {ENCODER_PATH}\n"
                "Place the encoder file in backend/models/"
            )

        logger.info("Loading injury risk model from: %s", MODEL_PATH)
        self._model = joblib.load(str(MODEL_PATH))

        logger.info("Loading injury label encoders from: %s", ENCODER_PATH)
        self._encoders = joblib.load(str(ENCODER_PATH))

        self._loaded = True
        logger.info(
            "InjuryPredictionService ready — model: %s | classes: %s",
            type(self._model).__name__,
            list(self._model.classes_),
        )

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Encoding helpers ───────────────────────────────────────────────────────

    def _encode(self, key: str, value: str) -> int:
        """Encode a single categorical value. Falls back to class 0 if unseen."""
        le = self._encoders.get(key)
        if le is None:
            raise ValueError(f"No encoder found for key='{key}'")
        try:
            return int(le.transform([value])[0])
        except ValueError:
            logger.warning(
                "Unseen value '%s' for encoder '%s', defaulting to class '%s'",
                value, key, le.classes_[0],
            )
            return 0

    # ── Preprocessing ──────────────────────────────────────────────────────────

    def _build_feature_vector(self, payload: dict) -> np.ndarray:
        """
        Convert the request payload into the 7-element numpy array:
          [Exercise_enc, Knee_Angle, Hip_Angle, Shoulder_Angle,
           Back_Angle, Duration, Medical_Condition_enc]

        Angles are stored as floats; Duration as float (minutes).
        """
        # Validate required fields
        required = ["exercise", "knee_angle", "hip_angle",
                    "shoulder_angle", "back_angle", "duration"]
        missing = [f for f in required if payload.get(f) is None]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        # Validate angle ranges (0–180 degrees)
        for angle_key in ("knee_angle", "hip_angle", "shoulder_angle", "back_angle"):
            val = float(payload[angle_key])
            if not (0.0 <= val <= 180.0):
                raise ValueError(
                    f"{angle_key} must be between 0 and 180 degrees, got {val}"
                )

        # Validate duration
        duration = float(payload["duration"])
        if duration <= 0:
            raise ValueError("Duration must be greater than 0")

        # Validate exercise
        exercise = str(payload["exercise"])
        if exercise not in EXERCISE_OPTIONS:
            raise ValueError(
                f"Exercise must be one of: {', '.join(EXERCISE_OPTIONS)}"
            )

        # Validate medical condition (default to 'None' if not provided)
        medical = str(payload.get("medical_condition") or "None")
        if medical not in MEDICAL_OPTIONS:
            medical = "None"

        # Encode categoricals
        exercise_enc = self._encode("Exercise",          exercise)
        medical_enc  = self._encode("Medical_Condition", medical)

        # Assemble in the exact training order:
        # ['Exercise', 'Knee_Angle', 'Hip_Angle', 'Shoulder_Angle',
        #  'Back_Angle', 'Duration', 'Medical_Condition']
        features = np.array([[
            float(exercise_enc),
            float(payload["knee_angle"]),
            float(payload["hip_angle"]),
            float(payload["shoulder_angle"]),
            float(payload["back_angle"]),
            duration,
            float(medical_enc),
        ]])

        logger.debug(
            "Injury feature vector — exercise=%s(%d) knee=%.1f hip=%.1f "
            "shoulder=%.1f back=%.1f duration=%.1f medical=%s(%d)",
            exercise, exercise_enc,
            float(payload["knee_angle"]), float(payload["hip_angle"]),
            float(payload["shoulder_angle"]), float(payload["back_angle"]),
            duration, medical, medical_enc,
        )

        return features

    # ── Prediction ─────────────────────────────────────────────────────────────

    def predict(self, payload: dict) -> dict:
        """
        Run injury risk prediction for the given input payload.

        Returns
        -------
        dict with:
          risk_level         : 'High' | 'Low' | 'Medium'
          confidence         : float (0–100, 1 dp)
          recommendation     : safety advice string
          prevention_tips    : list of strings
          risk_class_int     : raw integer class from model (0=High, 1=Low, 2=Medium)

        Raises
        ------
        RuntimeError — model not loaded
        ValueError   — invalid or missing input fields
        """
        if not self._loaded:
            raise RuntimeError(
                "InjuryPredictionService has not been loaded. "
                "Call injury_service.load() during application startup."
            )

        X = self._build_feature_vector(payload)

        # Predict class integer
        predicted_class_int = int(self._model.predict(X)[0])

        # Confidence via predict_proba
        confidence = 0.0
        if hasattr(self._model, "predict_proba"):
            proba = self._model.predict_proba(X)[0]
            confidence = round(float(proba[predicted_class_int]) * 100, 1)

        # Decode integer → risk label using Risk_Level encoder
        risk_encoder = self._encoders.get("Risk_Level")
        if risk_encoder is None:
            raise RuntimeError("'Risk_Level' key missing from injury_label_encoders")

        risk_level = str(risk_encoder.inverse_transform([predicted_class_int])[0])

        # Retrieve safety content
        content = SAFETY_CONTENT.get(risk_level, SAFETY_CONTENT["Medium"])

        logger.info(
            "Injury prediction → risk='%s' class=%d confidence=%.1f%%",
            risk_level, predicted_class_int, confidence,
        )

        return {
            "risk_level":       risk_level,
            "confidence":       confidence,
            "recommendation":   content["recommendation"],
            "prevention_tips":  content["prevention_tips"],
            "risk_class_int":   predicted_class_int,
        }


# ── Module-level singleton ────────────────────────────────────────────────────
# Loaded once at startup via main.py lifespan; imported by the injury router.
injury_service = InjuryPredictionService()
