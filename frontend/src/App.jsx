/**
 * App.jsx — Root component.
 *
 * Route map:
 *  /                  → Landing          (public)
 *  /login             → Login            (public-only)
 *  /signup            → Signup           (public-only)
 *  /forgot-password   → ForgotPassword   (public-only)
 *  /complete-profile  → CompleteProfile  (auth required; redirects to /dashboard
 *                                         if profile already complete)
 *  /dashboard         → Dashboard        (auth + complete profile required;
 *                                         redirects to /complete-profile if not)
 *  *                  → NotFound
 *
 * Guards:
 *  PublicRoute      — unauthenticated only; logged-in users → /dashboard
 *  PrivateRoute     — authenticated only; guests → /login
 *  ProfileRoute     — authenticated + complete profile; incomplete → /complete-profile
 *  ProfileEditRoute — authenticated only; already-complete profile users can
 *                     still reach /complete-profile to edit
 */

import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { useAuth }      from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Loader           from './components/Loader'

// Pages
import Landing          from './pages/Landing'
import Login            from './pages/Login'
import Signup           from './pages/Signup'
import ForgotPassword   from './pages/ForgotPassword'
import CompleteProfile  from './pages/CompleteProfile'
import Dashboard        from './pages/Dashboard'

// ─── Shared loading check ─────────────────────────────────────────────────────
/**
 * Returns a spinner while auth OR profile is still hydrating.
 * Keeps every guard DRY.
 */
const useGuardReady = () => {
  const { loading, profileLoading } = useAuth()
  return loading || profileLoading
}

// ─── PublicRoute ──────────────────────────────────────────────────────────────
/**
 * Only unauthenticated users may pass.
 * Authenticated users are sent to /dashboard.
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const notReady = useGuardReady()

  if (notReady) return <Loader overlay size="full" />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

// ─── PrivateRoute ─────────────────────────────────────────────────────────────
/**
 * Must be authenticated.
 * Unauthenticated users are sent to /login (with return path in state).
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const location  = useLocation()
  const notReady  = useGuardReady()

  if (notReady) return <Loader overlay size="full" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ─── ProfileRoute ─────────────────────────────────────────────────────────────
/**
 * Must be authenticated AND have a complete profile.
 * - Not authenticated          → /login
 * - Authenticated, no profile  → /complete-profile
 * - Authenticated, profile OK  → renders children (Dashboard)
 */
const ProfileRoute = ({ children }) => {
  const { isAuthenticated, isProfileComplete } = useAuth()
  const location = useLocation()
  const notReady = useGuardReady()

  if (notReady) return <Loader overlay size="full" />
  if (!isAuthenticated)    return <Navigate to="/login" state={{ from: location }} replace />
  if (!isProfileComplete)  return <Navigate to="/complete-profile" replace />
  return children
}

// ─── ProfileEditRoute ─────────────────────────────────────────────────────────
/**
 * /complete-profile is reachable by:
 *  - New users who haven't filled their profile yet
 *  - Existing users who want to edit it (via Dashboard link)
 *
 * Only requires authentication — does NOT redirect away if profile is complete,
 * so the edit flow works correctly.
 */
const ProfileEditRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const notReady = useGuardReady()

  if (notReady) return <Loader overlay size="full" />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
    <div className="orb w-96 h-96 bg-cyan-500  top-[-10%] left-[-10%]"  aria-hidden="true" />
    <div className="orb w-80 h-80 bg-green-500 bottom-0   right-[-10%]" aria-hidden="true" />

    <div className="relative z-10 flex flex-col items-center gap-4 animate-slide-up">
      <p className="text-[120px] font-black leading-none gradient-text opacity-20 select-none">
        404
      </p>
      <div className="-mt-12">
        <h1 className="text-3xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-500 text-sm max-w-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400
                     text-gray-950 font-semibold px-6 py-3 rounded-xl text-sm
                     hover:from-cyan-400 hover:to-cyan-300 transition-all duration-200
                     shadow-lg shadow-cyan-500/25 hover:scale-[1.02]"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  </div>
)

// ─── Router ───────────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    {/* Public — everyone */}
    <Route path="/" element={<Landing />} />

    {/* Public-only — redirect to /dashboard if already logged in */}
    <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/signup"          element={<PublicRoute><Signup /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

    {/* Auth required; profile can be complete or incomplete (edit + first-time) */}
    <Route
      path="/complete-profile"
      element={
        <ProfileEditRoute>
          <CompleteProfile />
        </ProfileEditRoute>
      }
    />

    {/* Auth + complete profile required */}
    <Route
      path="/dashboard"
      element={
        <ProfileRoute>
          <Dashboard />
        </ProfileRoute>
      }
    />

    {/* 404 fallback */}
    <Route path="*" element={<NotFound />} />
  </Routes>
)

// ─── LanguageWrapper ────────────────────────────────────────────────────────
// Reads profile from AuthContext to seed the language on first visit.
const LanguageWrapper = ({ children }) => {
  const { profile } = useAuth()
  return (
    <LanguageProvider profileLanguage={profile?.preferred_language}>
      {children}
    </LanguageProvider>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const App = () => (
  <AuthProvider>
    <LanguageWrapper>
      <AppRoutes />
    </LanguageWrapper>
  </AuthProvider>
)

export default App
