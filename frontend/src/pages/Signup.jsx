/**
 * Signup Page — full registration form with client-side validation.
 * Validates: name, email, phone (Indian), strong password, confirm match.
 * On success → redirects to /login.
 */

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HiUser, HiMail, HiPhone, HiArrowRight, HiCheckCircle } from 'react-icons/hi'
import AuthLayout from '../components/AuthLayout'
import Input from '../components/Input'
import PasswordInput from '../components/PasswordInput'
import Button from '../components/Button'
import toast from '../components/Toast'
import { authAPI } from '../api/authAPI'

/* ── Validation helpers ─────────────────────────────────────────────────── */
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE  = /^(\+91)?[6-9]\d{9}$/
const UPPER_RE  = /[A-Z]/
const LOWER_RE  = /[a-z]/
const DIGIT_RE  = /\d/
const SPEC_RE   = /[!@#$%^&*(),.?":{}|<>]/

const validate = (fields) => {
  const errs = {}

  if (!fields.full_name.trim())
    errs.full_name = 'Full name is required'
  else if (fields.full_name.trim().length < 2)
    errs.full_name = 'Name must be at least 2 characters'

  if (!fields.email.trim())
    errs.email = 'Email is required'
  else if (!EMAIL_RE.test(fields.email))
    errs.email = 'Enter a valid email address'

  if (!fields.phone.trim())
    errs.phone = 'Phone number is required'
  else if (!PHONE_RE.test(fields.phone.trim()))
    errs.phone = 'Enter a valid 10-digit Indian mobile number'

  if (!fields.password)
    errs.password = 'Password is required'
  else if (fields.password.length < 8)
    errs.password = 'Password must be at least 8 characters'
  else if (!UPPER_RE.test(fields.password))
    errs.password = 'Must contain at least one uppercase letter'
  else if (!LOWER_RE.test(fields.password))
    errs.password = 'Must contain at least one lowercase letter'
  else if (!DIGIT_RE.test(fields.password))
    errs.password = 'Must contain at least one number'
  else if (!SPEC_RE.test(fields.password))
    errs.password = 'Must contain at least one special character (!@#$...)'

  if (!fields.confirm_password)
    errs.confirm_password = 'Please confirm your password'
  else if (fields.confirm_password !== fields.password)
    errs.confirm_password = 'Passwords do not match'

  return errs
}

/* ── Component ──────────────────────────────────────────────────────────── */
const Signup = () => {
  const navigate = useNavigate()

  const [fields, setFields] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  /* ── Field change ─────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Clear individual error on typing
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      await authAPI.signup({
        full_name:        fields.full_name.trim(),
        email:            fields.email.trim().toLowerCase(),
        phone:            fields.phone.trim(),
        password:         fields.password,
        confirm_password: fields.confirm_password,
      })
      setSuccess(true)
      toast.success('Account created! Redirecting to login…')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Signup failed. Please try again.'
      toast.error(msg)
      // Highlight email field on duplicate-email error
      if (err.response?.status === 409) {
        setErrors((prev) => ({ ...prev, email: 'This email is already registered' }))
      }
    } finally {
      setLoading(false)
    }
  }

  /* ── Success state ────────────────────────────────────────────────── */
  if (success) {
    return (
      <AuthLayout title="Account Created!" subtitle="Redirecting you to login…">
        <div className="flex flex-col items-center gap-4 py-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <HiCheckCircle size={40} className="text-green-400" />
          </div>
          <p className="text-gray-400 text-sm text-center">
            Your account has been created successfully.
          </p>
        </div>
      </AuthLayout>
    )
  }

  /* ── Form ─────────────────────────────────────────────────────────── */
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start your AI-powered fitness journey today"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Full Name */}
        <Input
          label="Full Name"
          name="full_name"
          type="text"
          placeholder="John Doe"
          autoComplete="name"
          value={fields.full_name}
          onChange={handleChange}
          error={errors.full_name}
          leftIcon={<HiUser size={16} />}
        />

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

        {/* Phone */}
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          placeholder="+91 98765 43210"
          autoComplete="tel"
          value={fields.phone}
          onChange={handleChange}
          error={errors.phone}
          leftIcon={<HiPhone size={16} />}
          helperText="Indian mobile number (10 digits)"
        />

        {/* Password */}
        <PasswordInput
          label="Password"
          name="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={fields.password}
          onChange={handleChange}
          error={errors.password}
          showStrength
        />

        {/* Confirm Password */}
        <PasswordInput
          label="Confirm Password"
          name="confirm_password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={fields.confirm_password}
          onChange={handleChange}
          error={errors.confirm_password}
        />

        {/* Submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          icon={!loading ? <HiArrowRight /> : null}
          className="mt-2"
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-gray-600">Already have an account?</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        <p className="text-center text-sm">
          <Link
            to="/login"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Sign in instead
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default Signup
