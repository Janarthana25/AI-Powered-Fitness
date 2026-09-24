/**
 * Forgot Password — 3-step flow:
 *   Step 1: Enter email  → POST /auth/forgot-password  (receive OTP)
 *   Step 2: Enter OTP    → POST /auth/verify-otp       (receive reset_token)
 *   Step 3: New password → POST /auth/reset-password   → redirect to /login
 */

import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HiMail,
  HiArrowRight,
  HiArrowLeft,
  HiCheckCircle,
  HiRefresh,
} from 'react-icons/hi'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Button from '../components/Button'
import toast from '../components/Toast'
import { authAPI } from '../api/authAPI'

/* ── Validation ─────────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UPPER_RE = /[A-Z]/
const LOWER_RE = /[a-z]/
const DIGIT_RE = /\d/
const SPEC_RE  = /[!@#$%^&*(),.?":{}|<>]/

const validatePassword = (p) => {
  if (!p)              return 'Password is required'
  if (p.length < 8)   return 'Password must be at least 8 characters'
  if (!UPPER_RE.test(p)) return 'Must contain at least one uppercase letter'
  if (!LOWER_RE.test(p)) return 'Must contain at least one lowercase letter'
  if (!DIGIT_RE.test(p)) return 'Must contain at least one number'
  if (!SPEC_RE.test(p))  return 'Must contain at least one special character'
  return ''
}

/* ── OTP Input — 6 individual digit boxes ───────────────────────────────── */
const OTPInput = ({ value, onChange, error }) => {
  const inputs = useRef([])

  const handleKey = (e, idx) => {
    const key = e.key
    if (key === 'Backspace') {
      if (!value[idx] && idx > 0) inputs.current[idx - 1]?.focus()
    } else if (/^\d$/.test(key)) {
      e.preventDefault()
      const arr = value.split('')
      arr[idx] = key
      onChange(arr.join(''))
      if (idx < 5) inputs.current[idx + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
    const focusIdx = Math.min(pasted.length, 5)
    inputs.current[focusIdx]?.focus()
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        Enter OTP
      </p>
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={() => {}} // handled via onKeyDown
            onKeyDown={(e) => handleKey(e, i)}
            className={[
              'w-11 h-13 text-center text-lg font-bold rounded-xl',
              'bg-white/5 border transition-all duration-200',
              'text-white focus:outline-none',
              value[i]
                ? 'border-cyan-500/60 bg-cyan-500/10'
                : 'border-white/10',
              error
                ? 'border-red-500/60'
                : 'focus:border-cyan-500/60 focus:bg-white/8',
            ].join(' ')}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-400 text-center">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────────────────────── */
const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 | 2 | 3 | 'done'

  // Step 1
  const [email, setEmail]       = useState('')
  const [emailErr, setEmailErr] = useState('')

  // Step 2
  const [otp, setOtp]           = useState('')
  const [otpErr, setOtpErr]     = useState('')
  const [demoOtp, setDemoOtp]   = useState('')   // shown in dev mode
  const [resetToken, setResetToken] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Step 3
  const [pwFields, setPwFields] = useState({ password: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})

  const [loading, setLoading]   = useState(false)

  /* Countdown timer for OTP resend */
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  /* ── Step 1 — Request OTP ─────────────────────────────────────────── */
  const handleRequestOTP = async (e) => {
    e.preventDefault()
    if (!email.trim())              { setEmailErr('Email is required'); return }
    if (!EMAIL_RE.test(email.trim())) { setEmailErr('Enter a valid email address'); return }

    setLoading(true)
    try {
      const data = await authAPI.forgotPassword(email.trim().toLowerCase())
      if (data.otp) {
        // Demo mode — OTP returned in response; auto-fill boxes and show it
        setDemoOtp(data.otp)
        setOtp(data.otp)          // auto-fill the 6 boxes
        toast.success('OTP generated! Check the box below or your backend console.')
      } else {
        toast.success(data.message)
      }
      setResendTimer(60)
      setStep(2)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 2 — Verify OTP ──────────────────────────────────────────── */
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (otp.length < 6) { setOtpErr('Enter all 6 digits'); return }

    setLoading(true)
    try {
      const data = await authAPI.verifyOTP(email.trim().toLowerCase(), otp)
      setResetToken(data.reset_token)
      toast.success('OTP verified!')
      setStep(3)
    } catch (err) {
      setOtpErr(err.response?.data?.detail || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* Resend OTP */
  const handleResend = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    setOtp('')
    setOtpErr('')
    setDemoOtp('')
    try {
      const data = await authAPI.forgotPassword(email.trim().toLowerCase())
      if (data.otp) {
        setDemoOtp(data.otp)
        setOtp(data.otp)          // auto-fill the 6 boxes
        toast.success('New OTP generated! Check the box below or your backend console.')
      } else {
        toast.success('New OTP sent!')
      }
      setResendTimer(60)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 3 — Reset Password ──────────────────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault()
    const errs = {}
    const pErr = validatePassword(pwFields.password)
    if (pErr) errs.password = pErr
    if (!pwFields.confirm)               errs.confirm = 'Please confirm your password'
    else if (pwFields.confirm !== pwFields.password) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setPwErrors(errs); return }

    setLoading(true)
    try {
      await authAPI.resetPassword(resetToken, pwFields.password, pwFields.confirm)
      toast.success('Password reset successfully!')
      setStep('done')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed. Please start over.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Step indicators ──────────────────────────────────────────────── */
  const STEP_LABELS = ['Email', 'Verify OTP', 'New Password']
  const currentStep = typeof step === 'number' ? step : 3

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const isActive    = n === currentStep
        const isCompleted = n < currentStep
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  isCompleted
                    ? 'bg-green-500 text-gray-950'
                    : isActive
                    ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/40'
                    : 'bg-white/5 text-gray-600 border border-white/10',
                ].join(' ')}
              >
                {isCompleted ? '✓' : n}
              </div>
              <span
                className={`text-[10px] ${
                  isActive ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-gray-600'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  'flex-1 h-px mb-4 transition-colors duration-300 max-w-[40px]',
                  isCompleted ? 'bg-green-500/50' : 'bg-white/5',
                ].join(' ')}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <AuthLayout
      title={
        step === 1 ? 'Forgot Password' :
        step === 2 ? 'Verify OTP' :
        step === 3 ? 'Reset Password' :
        'Password Reset!'
      }
      subtitle={
        step === 1 ? 'We\'ll send a 6-digit OTP to your email' :
        step === 2 ? `OTP sent to ${email}` :
        step === 3 ? 'Set your new password' :
        'Redirecting to login…'
      }
    >
      {step !== 'done' && <StepIndicator />}

      {/* ── Done state ──────────────────────────────────────────────── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <HiCheckCircle size={40} className="text-green-400" />
          </div>
          <p className="text-gray-400 text-sm text-center">
            Your password has been reset. Redirecting…
          </p>
        </div>
      )}

      {/* ── Step 1: Email ───────────────────────────────────────────── */}
      {step === 1 && (
        <form onSubmit={handleRequestOTP} noValidate className="space-y-5">
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailErr('') }}
            error={emailErr}
            leftIcon={<HiMail size={16} />}
          />
          <Button type="submit" fullWidth size="lg" loading={loading}
            icon={!loading ? <HiArrowRight /> : null}>
            {loading ? 'Sending OTP…' : 'Send OTP'}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1">
              <HiArrowLeft size={14} /> Back to Login
            </Link>
          </p>
        </form>
      )}

      {/* ── Step 2: OTP ─────────────────────────────────────────────── */}
      {step === 2 && (
        <form onSubmit={handleVerifyOTP} noValidate className="space-y-6">

          {/* Demo OTP banner — prominent, impossible to miss */}
          {demoOtp && (
            <div className="rounded-2xl overflow-hidden border border-cyan-500/40
                            bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 animate-fade-in">
              {/* Header strip */}
              <div className="bg-cyan-500/20 px-4 py-2 flex items-center gap-2 border-b border-cyan-500/20">
                <span className="text-base">🔑</span>
                <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                  Development Mode — Your OTP
                </p>
              </div>
              {/* OTP display */}
              <div className="px-4 py-4 text-center">
                <p className="text-4xl font-mono font-black tracking-[0.35em] text-white
                               drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] mb-2">
                  {demoOtp}
                </p>
                <p className="text-xs text-gray-400">
                  Boxes auto-filled · Valid 10 minutes · Check backend console too
                </p>
              </div>
            </div>
          )}

          <OTPInput
            value={otp}
            onChange={(v) => { setOtp(v); setOtpErr('') }}
            error={otpErr}
          />

          <Button type="submit" fullWidth size="lg" loading={loading}
            icon={!loading ? <HiArrowRight /> : null}>
            {loading ? 'Verifying…' : 'Verify OTP'}
          </Button>

          {/* Resend */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0 || loading}
              className={[
                'flex items-center gap-1 transition-colors',
                resendTimer > 0 || loading
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-cyan-400 hover:text-cyan-300 cursor-pointer',
              ].join(' ')}
            >
              <HiRefresh size={14} /> Resend OTP
            </button>
            {resendTimer > 0 && (
              <span className="text-gray-600">Resend in {resendTimer}s</span>
            )}
          </div>

          <p className="text-center text-sm">
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); setOtpErr('') }}
              className="text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <HiArrowLeft size={14} /> Change email
            </button>
          </p>
        </form>
      )}

      {/* ── Step 3: New Password ─────────────────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} noValidate className="space-y-5">
          <PasswordInput
            label="New Password"
            name="password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={pwFields.password}
            onChange={(e) => { setPwFields((p) => ({ ...p, password: e.target.value })); setPwErrors((p) => ({ ...p, password: '' })) }}
            error={pwErrors.password}
            showStrength
          />
          <PasswordInput
            label="Confirm New Password"
            name="confirm"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={pwFields.confirm}
            onChange={(e) => { setPwFields((p) => ({ ...p, confirm: e.target.value })); setPwErrors((p) => ({ ...p, confirm: '' })) }}
            error={pwErrors.confirm}
          />
          <Button type="submit" fullWidth size="lg" loading={loading}
            icon={!loading ? <HiCheckCircle /> : null}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

export default ForgotPassword
