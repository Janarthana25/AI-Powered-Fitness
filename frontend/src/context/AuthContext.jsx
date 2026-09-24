/**
 * AuthContext.jsx
 *
 * Global authentication + profile state for the entire app.
 *
 * Auth state:
 *  token           — raw JWT string (localStorage: 'pt_token')
 *  user            — { id, full_name, email, phone } (localStorage: 'pt_user')
 *  isAuthenticated — Boolean derived from token presence
 *  loading         — true only during first-render hydration from storage
 *  login()         — store token + user after successful login
 *  logout()        — wipe all state + storage
 *
 * Profile state (fetched from GET /profile/me/status right after login):
 *  profile         — full ProfileResponse object or null
 *  profileLoading  — true while the status check is in-flight
 *  isProfileComplete — Boolean: all 6 core fields filled
 *  setProfile()    — called by CompleteProfile page after a successful save
 *
 * The context listens for 'pt:session-expired' dispatched by the Axios
 * interceptor so any 401 automatically logs the user out.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { profileAPI } from '../api/authAPI'

// ─── Storage keys ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'pt_token'
const USER_KEY  = 'pt_user'

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // ── Auth state ──────────────────────────────────────────────────
  const [token,   setToken]   = useState(null)
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)   // hydration guard

  // ── Profile state ────────────────────────────────────────────────
  const [profile,        setProfileState]  = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  /* ── Hydrate auth from localStorage on first render ──────────── */
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser  = localStorage.getItem(USER_KEY)

      if (storedToken && storedUser) {
        if (!isTokenExpired(storedToken)) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } else {
          clearStorage()
        }
      }
    } catch {
      clearStorage()
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Fetch profile status whenever we have a valid token ──────── */
  // Runs on mount (after hydration) and whenever token changes.
  // This covers both: page refresh (token from storage) and fresh login
  // (token set by login() below, which triggers this effect).
  useEffect(() => {
    if (!token) {
      // Logged out — clear profile too
      setProfileState(null)
      return
    }

    let cancelled = false
    setProfileLoading(true)

    profileAPI
      .getProfileStatus()
      .then(({ profile: p }) => {
        if (!cancelled) setProfileState(p ?? null)
      })
      .catch(() => {
        // Non-fatal — profile just stays null; route guard will redirect
        if (!cancelled) setProfileState(null)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })

    return () => { cancelled = true }
  }, [token])

  /* ── Listen for 401 events from Axios interceptor ────────────── */
  useEffect(() => {
    const handleExpired = () => {
      setToken(null)
      setUser(null)
      setProfileState(null)
    }
    window.addEventListener('pt:session-expired', handleExpired)
    return () => window.removeEventListener('pt:session-expired', handleExpired)
  }, [])

  /* ── login ─────────────────────────────────────────────────────── */
  /**
   * Call this after a successful POST /auth/login.
   * Storing the token will trigger the profile-fetch effect above.
   *
   * @param {string} accessToken
   * @param {{ id, full_name, email, phone }} userObj
   */
  const login = useCallback((accessToken, userObj) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userObj))
    setToken(accessToken)
    setUser(userObj)
    // profile state is reset here; the useEffect above will re-fetch it
    setProfileState(null)
  }, [])

  /* ── logout ────────────────────────────────────────────────────── */
  const logout = useCallback(() => {
    clearStorage()
    setToken(null)
    setUser(null)
    setProfileState(null)
  }, [])

  /* ── setProfile ─────────────────────────────────────────────────── */
  /**
   * Called by CompleteProfile page after a successful PUT /profile/me.
   * Avoids a redundant network round-trip — just push the fresh data in.
   *
   * @param {object} profileData — ProfileResponse from the API
   */
  const setProfile = useCallback((profileData) => {
    setProfileState(profileData)
  }, [])

  /* ── Derived ─────────────────────────────────────────────────────── */
  const isAuthenticated   = Boolean(token)
  const isProfileComplete = Boolean(profile?.is_complete)

  const value = {
    // auth
    token,
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    // profile
    profile,
    profileLoading,
    isProfileComplete,
    setProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAuth() — consume auth + profile state anywhere in the tree.
 *
 * @example
 *   const { user, isAuthenticated, profile, isProfileComplete, login, logout } = useAuth()
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function isTokenExpired(token) {
  try {
    const [, payloadB64] = token.split('.')
    const padded  = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(padded))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export default AuthContext
