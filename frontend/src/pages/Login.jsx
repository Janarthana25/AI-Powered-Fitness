/**
 * Login Page — email + password auth with Remember Me and show/hide password.
 * On success → stores token + user in AuthContext → redirects to /dashboard.
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { HiMail, HiArrowRight, HiLockClosed } from 'react-icons/hi'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Button from '../components/Button'
import toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/authAPI'

/* ── Validation ─────────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validate = ({ email, password }) => {
  const errs = {}
  if (!email.trim())            errs.email    = 'Email is required'
  else if (!EMAIL_RE.test(email)) errs.email  = 'Enter a valid email address'
  if (!password)                errs.password = 'Password is required'
  return errs
}

/* ── Component ──────────────────────────────────────────────────────────── */
const Login = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  // Redirect destination after login (default: /dashboard)
  const from = location.state?.from?.pathname || '/dashboard'

  const [fields, setFields] = useState({ email: '', password: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)

  // Pre-fill email if "Remember Me" was used before
  useEffect(() => {
    const saved = localStorage.getItem('pt_remembered_email')
    if (saved) setFields((p) => ({ ...p, email: saved }))
    setRemember(!!saved)
  }, [])

  /* ── Handlers ─────────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFields((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const data = await authAPI.login({
        email:    fields.email.trim().toLowerCase(),
        password: fields.password,
      })

      // Persist / clear remembered email
      if (remember) {
        localStorage.setItem('pt_remembered_email', fields.email.trim().toLowerCase())
      } else {
        localStorage.removeItem('pt_remembered_email')
      }

      // Store JWT + user in context
      login(data.access_token, data.user)
      toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err.response?.data?.detail || 'Login failed. Please try again.'
      toast.error(msg)
      // Shake the form fields on auth error
      setErrors({ password: ' ' }) // space triggers red border without showing text
      setTimeout(() => setErrors({}), 1500)
    } finally {
      setLoading(false)
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your fitness journey"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Email */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={fields.email}
          onChange={handleChange}
          error={errors.email}
          leftIcon={<HiMail size={16} />}
        />

        {/* Password */}
        <div className="space-y-1">
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={fields.password}
            onChange={handleChange}
            error={errors.password === ' ' ? undefined : errors.password}
          />

          {/* Forgot password link — aligned right */}
          <div className="flex justify-end pt-0.5">
            <Link
              to="/forgot-password"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Remember Me */}
        <label className="flex items-center gap-3 cursor-pointer group select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only peer"
              aria-label="Remember me"
            />
            {/* Custom checkbox */}
            <div
              className="w-5 h-5 rounded border border-white/20 bg-white/5
                         peer-checked:bg-cyan-500 peer-checked:border-cyan-500
                         peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40
                         transition-all duration-200 flex items-center justify-center"
            >
              {remember && (
                <svg className="w-3 h-3 text-gray-950" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
            Remember me
          </span>
        </label>

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          icon={!loading ? <HiArrowRight /> : null}
          className="mt-1"
        >
          {loading ? 'Signing In…' : 'Sign In'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-gray-600">Don't have an account?</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <p className="text-center text-sm">
          <Link
            to="/signup"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Create a free account
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Login
