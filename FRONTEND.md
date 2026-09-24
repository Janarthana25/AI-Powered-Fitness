# Payirchi Thozhan AI (பயிற்சித் தோழன் AI) — Frontend

## Overview
**Payirchi Thozhan AI** is a modern, bilingual (Tamil & English) AI-powered fitness and injury-prevention web application built with **React 18** and **Vite**. It features an interactive, real-time AI Workout Coach with computer vision pose estimation, automated rep counting, rest interval tracking, personalized ML workout recommendations, injury risk assessments, nutrition planning, and progress tracking.

---

## Technology Stack

- **Core Framework**: React 18 (`react`, `react-dom`)
- **Build Tool / Bundler**: Vite 5
- **Styling**: Tailwind CSS 3, PostCSS, Autoprefixer
- **Routing**: React Router DOM v6 (`react-router-dom`)
- **API Client**: Axios (`axios`) with automatic JWT interceptors
- **Pose Detection & Computer Vision**: Google MediaPipe Pose (`window.Pose` loaded via CDN in `index.html`)
- **Voice & Speech**: Web Speech API (`SpeechSynthesis` & `SpeechRecognition` supporting `ta-IN` and `en-IN`)
- **Charts & Visualizations**: Recharts (`recharts`)
- **Notifications & UI**: React Hot Toast (`react-hot-toast`), React Icons (`react-icons`)

---

## Directory Structure

```
frontend/
├── index.html                   # HTML entry point (includes MediaPipe CDN scripts & fonts)
├── package.json                 # Dependencies and npm scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind CSS design system theme tokens
├── vite.config.js               # Vite config with React plugin and dev proxy
├── public/
│   └── favicon.svg              # Application icon
└── src/
    ├── App.jsx                  # Main application routing and route guards
    ├── index.css                # Global stylesheet with Tailwind directives and custom animations
    ├── main.jsx                 # Application DOM root mount with Context Providers
    ├── api/
    │   └── authAPI.js           # Centralized Axios instance & API client modules (Auth, Profile, Predict, Injury, Diet, Progress)
    ├── context/
    │   ├── AuthContext.jsx      # Authentication state, login/logout actions, user session management
    │   └── LanguageContext.jsx  # Global bilingual state (Tamil 'ta' / English 'en') persisted in localStorage
    ├── data/
    │   └── WorkoutPlans.js      # Structured 5-day workout routines (Weight Loss & Muscle Gain) + rest day logic
    ├── components/
    │   ├── AuthLayout.jsx       # Layout wrapper for authentication screens
    │   ├── Button.jsx           # Reusable button with variants and loading states
    │   ├── Card.jsx             # Glassmorphism container cards
    │   ├── Input.jsx            # Form inputs with validation error states
    │   ├── Loader.jsx           # Animated loading spinner
    │   ├── Navbar.jsx           # Top navigation bar with bilingual switch, user profile info, and logout
    │   ├── PasswordInput.jsx    # Password input with visibility toggle
    │   ├── Toast.jsx            # Custom styled notification alerts
    │   └── WorkoutCoach.jsx     # Full-featured AI camera workout coach with MediaPipe & audio guidance
    ├── pages/
    │   ├── CompleteProfile.jsx  # User onboarding (Height, Weight, Fitness Goals, Experience, Health conditions)
    │   ├── Dashboard.jsx        # Main hub with tabbed sections (Workout, AI Predict, Injury Check, Diet, Progress)
    │   ├── ForgotPassword.jsx   # 3-step OTP password reset workflow
    │   ├── Landing.jsx          # Public landing / marketing page with feature showcase
    │   ├── Login.jsx            # User sign-in page
    │   └── Signup.jsx           # New user registration page
    └── utils/
        ├── dateUtils.js         # Date formatting, timer conversions, day detection
        └── translations.js      # Master Tamil ('ta') & English ('en') translation dictionary
```

---

## Key Features & User Workflows

### 1. Bilingual System (Tamil & English)
- Fully localized UI switching between **Tamil (`ta`)** and **English (`en`)**.
- Synchronized voice feedback and voice recognition:
  - **Tamil**: `ta-IN` voice synthesis & recognition
  - **English**: `en-IN` voice synthesis & recognition
- Language preference is stored in `localStorage` and managed globally via `LanguageContext.jsx`.
- Single source of truth translation table in `src/utils/translations.js`.

### 2. AI Workout Coach (`WorkoutCoach.jsx`)
- **Computer Vision Pose Tracking**: Real-time joint angle estimation (elbows, knees, hips, shoulders) with live skeleton overlay via Google MediaPipe Pose.
- **Form Evaluation**: Instant visual feedback ("Good Form" / "Fix Form") and angle indicators.
- **Automated Rep & Time Tracking**:
  - Rep-based exercises: Squats, Push-ups, Lunges, Bicep Curls (3 sets × 15 reps).
  - Time-based exercises: Plank, Wall Handstand Hold (3 sets × 30 seconds).
- **Mandatory Rest Interval**: 90-second countdown timer after every completed set (camera feed automatically paused to avoid ghost reps).
- **Voice Guidance**: Real-time spoken rep counts, form corrections, set transitions, and workout milestones.
- **Auto Progress Log**: Completed workouts and calories burned are automatically saved to the backend progress database.

### 3. Goal-Driven Daily Workout Plans (`WorkoutPlans.js`)
- **Automatic Day Detection**: Automatically detects the current day of the week (Monday through Friday routines, Saturday/Sunday rest days).
- **Goal Customization**: Structured routines tailored to user goals (Weight Loss, Muscle Gain).
- **Exercise Progression**: Smooth 4-exercise flow with progress trackers.

### 4. Comprehensive Dashboard (`Dashboard.jsx`)
- **Live AI Workout Session**: Direct access to camera coach.
- **AI Workout Plan Prediction**: Displays recommended workout splits predicted by backend ML models.
- **Injury Risk Check**: Interactive assessment tool checking exercise posture angles against the injury prediction ML model.
- **Personalized Nutrition & Diet Plan**: BMR/TDEE calorie calculation and customized South Indian / Indian meal plans in Tamil/English.
- **Progress Tracking & Analytics**: Log daily weight, water intake, sleep, and view interactive visual charts via Recharts.

---

## API Integration (`src/api/authAPI.js`)

All backend API requests are managed through a centralized Axios client with:
- Automatic JWT token injection via request interceptors: `Authorization: Bearer <token>`
- Automatic `401 Unauthorized` handling that clears invalid sessions and redirects to `/login`.
- Environment-aware base URL: uses `VITE_API_BASE_URL` or defaults to relative path `/api` (proxied by Vite in development).

### Modules in `authAPI.js`:
- `authAPI`: `signup`, `login`, `forgotPassword`, `verifyOTP`, `resetPassword`
- `profileAPI`: `getProfileStatus`, `getProfile`, `saveProfile`
- `predictAPI`: `getWorkoutPrediction`
- `injuryAPI`: `getInjuryOptions`, `checkInjuryRisk`
- `dietAPI`: `getDietRecommendation`
- `progressAPI`: `logProgress`, `getProgressHistory`, `getProgressStats`

---

## Getting Started & Development

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server (runs at http://localhost:5173)
npm run dev
```

### Production Build
```bash
# Build optimized production bundle to dist/
npm run build

# Preview production build locally
npm run preview
```

---

## Design & Implementation Guidelines
1. **Translation Integrity**: Never hardcode UI strings. All user-facing text must use `translations.js` via the `LanguageContext`.
2. **Audio-UI Sync**: Voice language must always match the active UI language selection (`ta` -> `ta-IN`, `en` -> `en-IN`).
3. **Camera & Pose Processing**: Do not alter canvas / video dimensions or landmark mapping in `WorkoutCoach.jsx` without validating MediaPipe pose detection reliability.
4. **Authentication Flow**: Route access must always be guarded using `AuthContext` status checks (`isAuthenticated`, `isProfileComplete`).