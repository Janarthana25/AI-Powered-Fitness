/**
 * authAPI.js
 *
 * Centralised Axios instance + all authentication API calls.
 * Base URL points to the FastAPI backend.
 *
 * The Vite dev-proxy (vite.config.js) forwards /auth/* to http://127.0.0.1:8000,
 * so we use a relative base URL in development.  In production set the
 * VITE_API_BASE_URL environment variable to the deployed backend URL.
 */

import axios from 'axios'

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor — attach JWT on every request ───────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pt_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Response interceptor — global 401 handling ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and let the app redirect
      localStorage.removeItem('pt_token')
      localStorage.removeItem('pt_user')
      // Dispatch a custom event so AuthContext can react without a circular import
      window.dispatchEvent(new Event('pt:session-expired'))
    }
    return Promise.reject(error)
  }
)

// ─── Auth API calls ───────────────────────────────────────────────────────────

/**
 * POST /auth/signup
 * @param {{ full_name, email, phone, password, confirm_password }} payload
 * @returns {{ message: string, user_id: number }}
 */
const signup = async (payload) => {
  const { data } = await api.post('/auth/signup', payload)
  return data
}

/**
 * POST /auth/login
 * @param {{ email, password }} payload
 * @returns {{ access_token, token_type, user: { id, full_name, email, phone } }}
 */
const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload)
  return data
}

/**
 * POST /auth/forgot-password
 * @param {string} email
 * @returns {{ message: string, otp?: string }}  (otp only in demo mode)
 */
const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

/**
 * POST /auth/verify-otp
 * @param {string} email
 * @param {string} otp
 * @returns {{ message: string, reset_token: string }}
 */
const verifyOTP = async (email, otp) => {
  const { data } = await api.post('/auth/verify-otp', { email, otp })
  return data
}

/**
 * POST /auth/reset-password
 * @param {string} reset_token
 * @param {string} new_password
 * @param {string} confirm_password
 * @returns {{ message: string }}
 */
const resetPassword = async (reset_token, new_password, confirm_password) => {
  const { data } = await api.post('/auth/reset-password', {
    reset_token,
    new_password,
    confirm_password,
  })
  return data
}

// Named export for direct axios instance access (e.g. future protected endpoints)
export { api }

// Default export groups all auth methods
export const authAPI = {
  signup,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
}

// ─── Profile API calls ────────────────────────────────────────────────────────
// All calls require a valid JWT — the request interceptor above attaches it
// automatically from localStorage.

/**
 * GET /profile/me/status
 * Lightweight check called immediately after login.
 * @returns {{ has_profile: boolean, is_complete: boolean, profile: object|null }}
 */
const getProfileStatus = async () => {
  const { data } = await api.get('/profile/me/status')
  return data
}

/**
 * GET /profile/me
 * Fetch the full profile for the authenticated user.
 * @returns {ProfileResponse} — throws 404 if no profile yet
 */
const getProfile = async () => {
  const { data } = await api.get('/profile/me')
  return data
}

/**
 * PUT /profile/me
 * Create or update the profile (partial updates supported).
 * @param {{
 *   age?: number,
 *   gender?: string,
 *   height_cm?: number,
 *   weight_kg?: number,
 *   fitness_goal?: string,
 *   experience_level?: string,
 *   medical_conditions?: string,
 *   preferred_language?: string
 * }} payload
 * @returns {ProfileResponse}
 */
const saveProfile = async (payload) => {
  const { data } = await api.put('/profile/me', payload)
  return data
}

export const profileAPI = {
  getProfileStatus,
  getProfile,
  saveProfile,
}

// ─── Prediction API calls ─────────────────────────────────────────────────────
// Requires a valid JWT — the request interceptor attaches it automatically.

/**
 * POST /predict/workout
 * The backend fetches the user's profile from the DB automatically.
 * No payload needed — just the JWT in the Authorization header.
 *
 * @returns {{
 *   recommended_workout: string,
 *   confidence: number,
 *   generated_at: string,
 *   status: string
 * }}
 */
const getWorkoutPrediction = async () => {
  const { data } = await api.post('/predict/workout')
  return data
}

export const predictAPI = {
  getWorkoutPrediction,
}

// ─── Injury Risk API calls ────────────────────────────────────────────────────

/**
 * GET /predict/injury-risk/options
 * Fetch valid exercise and medical_condition lists for the form.
 * @returns {{ exercises: string[], medical_conditions: string[] }}
 */
const getInjuryOptions = async () => {
  const { data } = await api.get('/predict/injury-risk/options')
  return data
}

/**
 * POST /predict/injury-risk
 * @param {{
 *   exercise: string,
 *   knee_angle: number,
 *   hip_angle: number,
 *   shoulder_angle: number,
 *   back_angle: number,
 *   duration: number,
 *   medical_condition?: string
 * }} payload
 * @returns {{
 *   risk_level: string,
 *   confidence: number,
 *   recommendation: string,
 *   prevention_tips: string[],
 *   generated_at: string,
 *   status: string
 * }}
 */
const checkInjuryRisk = async (payload) => {
  const { data } = await api.post('/predict/injury-risk', payload)
  return data
}

export const injuryAPI = {
  getInjuryOptions,
  checkInjuryRisk,
}

// ─── Diet Recommendation API ──────────────────────────────────────────────────

/**
 * POST /predict/diet
 * Backend fetches the user's profile automatically — no payload needed.
 * JWT is attached by the request interceptor.
 *
 * @returns {{
 *   bmi: number, bmi_category: string,
 *   bmr: number, daily_calories: number,
 *   protein_g: number, carbs_g: number, fat_g: number,
 *   water_L: number, sleep_hours: number,
 *   breakfast: string, mid_morning: string, lunch: string,
 *   evening_snack: string, dinner: string,
 *   goal: string, language: string,
 *   generated_at: string, status: string
 * }}
 */
const getDietRecommendation = async () => {
  const { data } = await api.post('/predict/diet')
  return data
}

export const dietAPI = {
  getDietRecommendation,
}

// ─── Progress Tracking API ────────────────────────────────────────────────────

/**
 * POST /progress
 * Log a new daily progress entry. All fields optional.
 * @param {{
 *   weight_kg?: number,
 *   water_intake_L?: number,
 *   calories_consumed?: number,
 *   sleep_hours?: number,
 *   workout_completed?: boolean,
 *   notes?: string
 * }} payload
 * @returns {ProgressEntryResponse}
 */
const logProgress = async (payload) => {
  const { data } = await api.post('/progress', payload)
  return data
}

/**
 * GET /progress/history?skip=0&limit=30
 * @returns {{ entries: ProgressEntryResponse[], total: number }}
 */
const getProgressHistory = async (skip = 0, limit = 30) => {
  const { data } = await api.get('/progress/history', { params: { skip, limit } })
  return data
}

/**
 * GET /progress/stats
 * @returns {ProgressStatsResponse}
 */
const getProgressStats = async () => {
  const { data } = await api.get('/progress/stats')
  return data
}

export const progressAPI = {
  logProgress,
  getProgressHistory,
  getProgressStats,
}
