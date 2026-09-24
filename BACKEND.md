# Payirchi Thozhan AI (பயிற்சித் தோழன் AI) — Backend

## Overview
**Payirchi Thozhan AI Backend** is a high-performance RESTful API built with **FastAPI** and **Python 3.10–3.12**. It powers authentication, user profiles, daily fitness progress logs, and integrates machine learning models for workout split recommendations, biomechanical injury risk analysis, and automated nutrition/diet planning.

---

## Technology Stack

- **Framework**: FastAPI (`fastapi==0.111.0`)
- **ASGI Server**: Uvicorn (`uvicorn[standard]==0.29.0`)
- **ORM & Database**: SQLAlchemy 2.0 (`sqlalchemy==2.0.30`) with SQLite (`payirchi_thozhan.db`)
- **Data Validation & Settings**: Pydantic v2 (`pydantic[email]==2.7.1`, `pydantic-settings==2.2.1`)
- **Authentication & Security**: Passlib with Bcrypt (`passlib[bcrypt]==1.7.4`, `bcrypt==4.1.3`), Python-JOSE (`python-jose[cryptography]==3.3.0`)
- **Machine Learning & Data Science**: Scikit-Learn, NumPy, Joblib

---

## Directory Structure

```
backend/
├── main.py                     # FastAPI application entry point, lifespan loader, CORS, router mounts
├── payirchi_thozhan.db         # SQLite database file (created automatically on startup)
├── requirements.txt            # Python package dependencies
├── models/                     # Trained Machine Learning model artifacts
│   ├── workout_model.pkl       # Workout recommendation classifier
│   ├── label_encoders.pkl      # Encoders for workout model features
│   ├── injury_risk_model (1).pkl     # Biomechanical injury risk classifier
│   └── injury_label_encoders (1).pkl # Encoders for injury risk features
└── app/
    ├── __init__.py
    ├── database.py             # Database engine, SessionLocal, Base declarative model
    ├── models.py               # SQLAlchemy models (User, Profile, ProgressEntry, etc.)
    ├── schemas.py              # Pydantic schemas for request validation & response formatting
    ├── auth.py                 # JWT token generation, password hashing & get_current_user dependency
    ├── routes/                 # API endpoint routers
    │   ├── __init__.py
    │   ├── auth.py             # User signup, login, OTP verification, password reset
    │   ├── profile.py          # User profile retrieval, status check, and profile updates
    │   ├── predict.py          # AI workout split recommendation endpoint
    │   ├── injury.py           # Biomechanical injury risk assessment endpoints
    │   ├── diet.py             # Personalized nutrition targets & meal plan recommendations
    │   └── progress.py         # Daily workout logs, metrics, history, and statistical aggregations
    └── prediction/             # Machine Learning inference & nutrition calculation services
        ├── __init__.py
        ├── service.py          # Workout prediction inference service (loads workout_model.pkl)
        ├── injury_service.py   # Injury risk inference service (loads injury_risk_model.pkl)
        └── diet_service.py     # Nutrition calculation engine (BMR, TDEE, macronutrients & meal plans)
```

---

## Machine Learning & Prediction Services

### 1. Workout Recommendation Model (`app/prediction/service.py`)
- **Artifacts**: `models/workout_model.pkl` & `models/label_encoders.pkl`
- **Features (8 inputs)**:
  `['Age', 'Gender', 'Height_cm', 'Weight_kg', 'BMI', 'Goal', 'Experience', 'Medical_Condition']`
- **Output**: Recommended workout category (`Cardio`, `Full Body`, `HIIT`, `Strength`, `Upper/Lower Split`) and confidence percentage.
- **Workflow**: Fetches user data automatically from the database based on the authenticated JWT token.

### 2. Injury Risk Assessment Model (`app/prediction/injury_service.py`)
- **Artifacts**: `models/injury_risk_model (1).pkl` & `models/injury_label_encoders (1).pkl`
- **Features (7 inputs)**:
  `['Exercise', 'Knee_Angle', 'Hip_Angle', 'Shoulder_Angle', 'Back_Angle', 'Duration', 'Medical_Condition']`
- **Output**: Risk Level (`Low`, `Medium`, `High`), confidence score, safety recommendations, and prevention tips.

### 3. Diet & Nutrition Engine (`app/prediction/diet_service.py`)
- **Pure Python Logic Service**: Calculates personalized metrics based on user profile.
- **Formulas**:
  - **BMI**: $\text{weight (kg)} / (\text{height (m)})^2$
  - **BMR**: Mifflin-St Jeor Formula
  - **TDEE**: BMR × Physical Activity Factor (derived from `experience_level`)
  - **Goal Adjustments**: Caloric deficit for Weight Loss ($-500\text{ kcal}$), surplus for Muscle Gain ($+300\text{ kcal}$).
  - **Macronutrient Split**: Target protein ($1.6\text{–}2.0\text{ g/kg}$), fat ($25\%$), and remaining carbs.
- **Meal Plans**: Curated Indian & South Indian meal plans returned in the user's preferred language (**Tamil** or **English**).

---

## API Endpoints Reference

### Health Checks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | No | Basic API status message |
| `GET` | `/health` | No | Server and ML model load status |

### Authentication (`/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | No | Register a new user account |
| `POST` | `/auth/login` | No | Authenticate user & receive JWT access token |
| `POST` | `/auth/forgot-password` | No | Initiate password reset (sends OTP) |
| `POST` | `/auth/verify-otp` | No | Validate OTP & receive reset token |
| `POST` | `/auth/reset-password` | No | Set new password using reset token |

### Profile (`/profile`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/profile/me/status` | Bearer JWT | Check if profile exists and is complete |
| `GET` | `/profile/me` | Bearer JWT | Fetch authenticated user's profile |
| `PUT` | `/profile/me` | Bearer JWT | Create or update profile details |

### Predictions & AI (`/predict`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/predict/workout` | Bearer JWT | Predict tailored workout routine via ML model |
| `GET` | `/predict/injury-risk/options`| No | Get valid exercises & medical conditions list |
| `POST` | `/predict/injury-risk` | No / Optional | Predict injury risk from joint angles & exercise data |
| `POST` | `/predict/diet` | Bearer JWT | Generate BMR/TDEE targets & personalized meal plan |

### Progress Tracking (`/progress`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/progress` | Bearer JWT | Log daily workout, weight, water, calories, sleep |
| `GET` | `/progress/history` | Bearer JWT | Paginated list of past progress entries |
| `GET` | `/progress/stats` | Bearer JWT | Summary metrics and weekly statistics for charts |

---

## Getting Started & Development

### Prerequisites
- **Python**: 3.10, 3.11, or 3.12
- **pip**: Latest version

### Setup & Run
```powershell
# Navigate to backend directory
cd backend

# Create & activate a virtual environment (recommended)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt

# Start FastAPI development server with hot-reloading
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Interactive API Documentation
Once running, explore and test the endpoints directly:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Backend Development Rules
1. **Model Persistence**: ML models are loaded in memory once during application startup via FastAPI's `lifespan` context manager in `main.py`.
2. **Schema Consistency**: Always maintain alignment between Pydantic schemas in `schemas.py` and the frontend TypeScript/JavaScript interfaces in `frontend/src/api/authAPI.js`.
3. **Database Migrations / Schema Changes**: SQLite tables are auto-created by `Base.metadata.create_all(bind=engine)` upon application startup.
4. **Security & Hashing**: All passwords must be hashed using bcrypt before persisting. Secret keys in production should be provided via environment variables.