/**
 * CompleteProfile.jsx
 *
 * Shown when an authenticated user has not yet completed their fitness profile.
 * Also reachable from Dashboard as "Edit Profile".
 *
 * Fields (all validated before submit):
 *   Age · Gender · Height (cm) · Weight (kg) · Fitness Goal ·
 *   Experience Level · Medical Conditions (optional) · Preferred Language
 *
 * On save  → PUT /profile/me  → updates AuthContext via setProfile()
 *            → redirects to /dashboard
 *
 * Design follows the existing glass-morphism dark theme.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HiUser,
  HiArrowRight,
  HiCheckCircle,
  HiInformationCircle,
} from 'react-icons/hi'
import { useAuth }      from '../context/AuthContext'
import { profileAPI }   from '../api/authAPI'
import Button           from '../components/Button'
import Input            from '../components/Input'
import toast            from '../components/Toast'
import { getTranslations } from '../utils/translations'

// ─── Option lists (must match backend ALLOWED values exactly) ─────────────────
const GENDER_OPTIONS = [
  'Male', 'Female', 'Other', 'Prefer not to say',
]
const GOAL_OPTIONS = [
  'Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility', 'General Fitness',
]
const EXPERIENCE_OPTIONS = ['Beginner', 'Intermediate', 'Advanced']
const LANGUAGE_OPTIONS   = [
  'Tamil', 'English', 'Hindi', 'Telugu',
  'Kannada', 'Malayalam', 'Bengali', 'Marathi',
]

// ─── Goal icons (purely decorative) ──────────────────────────────────────────
const GOAL_META = {
  'Weight Loss':     { emoji: '🔥', color: 'border-orange-500/40 bg-orange-500/10 text-orange-300' },
  'Muscle Gain':     { emoji: '💪', color: 'border-cyan-500/40   bg-cyan-500/10   text-cyan-300'   },
  'Endurance':       { emoji: '🏃', color: 'border-green-500/40  bg-green-500/10  text-green-300'  },
  'Flexibility':     { emoji: '🧘', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  'General Fitness': { emoji: '⚡', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' },
}

// ─── Shared select style (mirrors input-base from index.css) ──────────────────
const SELECT_CLS =
  'w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 ' +
  'text-white text-sm focus:outline-none focus:border-cyan-500/60 ' +
  'focus:bg-gray-800 transition-all duration-200 appearance-none cursor-pointer'

const SELECT_ERROR_CLS = 'border-red-500/60 focus:border-red-500'

// ─── Small reusable sub-components ───────────────────────────────────────────

/** Section divider with label */
const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest col-span-full mt-2">
    {children}
  </p>
)

/** Labelled <select> wrapper that matches the Input component style */
const SelectField = ({ label, id, error, helperText, children, ...rest }) => {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-medium text-gray-400 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={fieldId}
          className={[SELECT_CLS, error ? SELECT_ERROR_CLS : ''].filter(Boolean).join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...rest}
        >
          {children}
        </select>
        {/* Custom chevron */}
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-gray-600 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (f, t) => {
  const e = {}
  const age = parseInt(f.age, 10)
  if (!f.age)                              e.age    = t.profile.errors.ageRequired
  else if (isNaN(age) || age < 5 || age > 120) e.age = t.profile.errors.ageInvalid

  if (!f.gender)          e.gender   = t.profile.errors.genderRequired
  if (!f.height_cm)       e.height_cm = t.profile.errors.heightRequired
  else {
    const h = parseFloat(f.height_cm)
    if (isNaN(h) || h < 50 || h > 300) e.height_cm = t.profile.errors.heightInvalid
  }
  if (!f.weight_kg)       e.weight_kg = t.profile.errors.weightRequired
  else {
    const w = parseFloat(f.weight_kg)
    if (isNaN(w) || w < 10 || w > 500) e.weight_kg = t.profile.errors.weightInvalid
  }
  if (!f.fitness_goal)    e.fitness_goal     = t.profile.errors.goalRequired
  if (!f.experience_level) e.experience_level = t.profile.errors.experienceRequired
  if (!f.preferred_language) e.preferred_language = t.profile.errors.languageRequired
  if (f.medical_conditions && f.medical_conditions.length > 500)
    e.medical_conditions = t.profile.errors.medicalMax
  return e
}

// ─── BMI helper ───────────────────────────────────────────────────────────────
const calcBMI = (h, w) => {
  const hm = parseFloat(h) / 100
  const wk = parseFloat(w)
  if (!hm || !wk || hm <= 0) return null
  const bmi = wk / (hm * hm)
  let label = ''
  if (bmi < 18.5)      label = 'Underweight'
  else if (bmi < 25)   label = 'Normal weight'
  else if (bmi < 30)   label = 'Overweight'
  else                 label = 'Obese'
  return { value: bmi.toFixed(1), label }
}

// ─── Step progress bar ────────────────────────────────────────────────────────
const STEPS = ['Body Metrics', 'Fitness Goals', 'Preferences']
const StepBar = ({ current }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((label, i) => {
      const n = i + 1
      const done   = n < current
      const active = n === current
      return (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={[
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
              done   ? 'bg-green-500 text-gray-950' :
              active ? 'bg-cyan-500 text-gray-950 shadow-lg shadow-cyan-500/40' :
                       'bg-white/5 text-gray-600 border border-white/10',
            ].join(' ')}>
              {done ? '✓' : n}
            </div>
            <span className={`text-[10px] ${active ? 'text-cyan-400' : done ? 'text-green-400' : 'text-gray-600'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={[
              'flex-1 h-px mb-4 transition-colors duration-300 max-w-[40px]',
              done ? 'bg-green-500/50' : 'bg-white/5',
            ].join(' ')} />
          )}
        </React.Fragment>
      )
    })}
  </div>
)

// ─── Main Component ───────────────────────────────────────────────────────────
const CompleteProfile = () => {
  const navigate              = useNavigate()
  const { user, profile, setProfile } = useAuth()

  // Initialise form — pre-fill if editing an existing profile
  const [fields, setFields] = useState({
    age:                profile?.age?.toString()        ?? '',
    gender:             profile?.gender               ?? '',
    height_cm:          profile?.height_cm?.toString() ?? '',
    weight_kg:          profile?.weight_kg?.toString() ?? '',
    fitness_goal:       profile?.fitness_goal         ?? '',
    experience_level:   profile?.experience_level     ?? '',
    medical_conditions: profile?.medical_conditions   ?? '',
    preferred_language: profile?.preferred_language   ?? '',
  })

  // Get translations based on current profile/form language (dynamically updates when language changes)
  const t = getTranslations(fields.preferred_language || profile?.preferred_language || 'English')

  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [step,    setStep]    = useState(1)   // 1 | 2 | 3

  // Determine whether we're editing an existing complete profile
  const isEditing = Boolean(profile?.is_complete)

  // Live BMI
  const bmi = calcBMI(fields.height_cm, fields.weight_kg)

  // ── Field change handler ────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target
    setFields((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  // ── Goal card click ─────────────────────────────────────────────
  const selectGoal = (goal) => {
    setFields((p) => ({ ...p, fitness_goal: goal }))
    if (errors.fitness_goal) setErrors((p) => ({ ...p, fitness_goal: '' }))
  }

  // ── Step navigation ─────────────────────────────────────────────
  const STEP_FIELDS = {
    1: ['age', 'gender', 'height_cm', 'weight_kg'],
    2: ['fitness_goal', 'experience_level'],
    3: ['preferred_language'],   // medical_conditions is optional
  }

  const validateStep = (s) => {
    const all = validate(fields, t)
    const relevant = {}
    STEP_FIELDS[s].forEach((k) => { if (all[k]) relevant[k] = all[k] })
    return relevant
  }

  const goNext = () => {
    const errs = validateStep(step)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setStep((s) => s + 1)
  }

  const goBack = () => setStep((s) => s - 1)

  // ── Submit (called from step 3) ─────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateStep(3)
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const saved = await profileAPI.saveProfile({
        age:                parseInt(fields.age, 10),
        gender:             fields.gender,
        height_cm:          parseFloat(fields.height_cm),
        weight_kg:          parseFloat(fields.weight_kg),
        fitness_goal:       fields.fitness_goal,
        experience_level:   fields.experience_level,
        medical_conditions: fields.medical_conditions.trim() || null,
        preferred_language: fields.preferred_language,
      })
      // Push saved data into context so route guards immediately see is_complete=true
      setProfile(saved)
      toast.success(isEditing ? t.profile.success.updated : t.profile.success.saved)
      navigate('/dashboard', { replace: true})
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors — map to field errors
        const fieldErrs = {}
        detail.forEach((d) => {
          const key = d.loc?.[d.loc.length - 1]
          if (key) fieldErrs[key] = d.msg.replace('Value error, ', '')
        })
        setErrors(fieldErrs)
        toast.error('Please fix the highlighted fields.')
      } else {
        toast.error(detail || 'Failed to save profile. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Layout wrapper matching AuthLayout structure but wider
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">

      {/* Ambient orbs */}
      <div className="orb w-96 h-96 bg-cyan-500  top-[-10%] left-[-10%]"  aria-hidden="true" />
      <div className="orb w-80 h-80 bg-green-500 bottom-[-5%] right-[-5%]" aria-hidden="true" style={{ animationDelay: '3s' }} />
      <div className="orb w-64 h-64 bg-cyan-400  top-[60%]  left-[60%]"   aria-hidden="true" style={{ animationDelay: '1.5s' }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg animate-slide-up">
        <div className="glass-strong p-8 sm:p-10 shadow-2xl shadow-black/40">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-green-500
                            flex items-center justify-center font-bold text-gray-950
                            shadow-lg shadow-cyan-500/30">
              PT
            </div>
            <span className="text-lg font-bold gradient-text">பயிற்சித் தோழன் AI</span>
          </div>

          {/* Divider */}
          <div className="my-6">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">
              {isEditing ? t.profile.editTitle : t.profile.title}
            </h1>
            <p className="text-sm text-gray-400">
              {isEditing
                ? t.profile.subtitle
                : `${t.common.welcome}, ${user?.full_name?.split(' ')[0] ?? 'Athlete'}! ${t.profile.subtitle}`}
            </p>
          </div>

          {/* Step bar */}
          <StepBar current={step} />

          <form onSubmit={handleSubmit} noValidate>

            {/* ════════════════════════════════════════════
                STEP 1 — Body Metrics
            ════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in">
                <SectionLabel>{t.profile.steps.bodyMetrics}</SectionLabel>

                {/* Age + Gender row */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t.profile.fields.age}
                    name="age"
                    type="number"
                    inputMode="numeric"
                    placeholder={t.profile.fields.agePlaceholder}
                    min="5"
                    max="120"
                    value={fields.age}
                    onChange={handleChange}
                    error={errors.age}
                    helperText={t.profile.fields.ageHint}
                  />
                  <SelectField
                    label={t.profile.fields.gender}
                    id="gender"
                    name="gender"
                    value={fields.gender}
                    onChange={handleChange}
                    error={errors.gender}
                  >
                    <option value="" disabled className="bg-gray-900 text-gray-400">{t.profile.fields.genderSelect}</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g} className="bg-gray-900 text-white">
                        {g === 'Male' ? t.profile.fields.male :
                         g === 'Female' ? t.profile.fields.female :
                         g === 'Other' ? t.profile.fields.other :
                         t.profile.fields.preferNotToSay}
                      </option>
                    ))}
                  </SelectField>
                </div>

                {/* Height + Weight row */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t.profile.fields.height}
                    name="height_cm"
                    type="number"
                    inputMode="decimal"
                    placeholder={t.profile.fields.heightPlaceholder}
                    min="50"
                    max="300"
                    step="0.1"
                    value={fields.height_cm}
                    onChange={handleChange}
                    error={errors.height_cm}
                    helperText={t.profile.fields.heightHint}
                  />
                  <Input
                    label={t.profile.fields.weight}
                    name="weight_kg"
                    type="number"
                    inputMode="decimal"
                    placeholder={t.profile.fields.weightPlaceholder}
                    min="10"
                    max="500"
                    step="0.1"
                    value={fields.weight_kg}
                    onChange={handleChange}
                    error={errors.weight_kg}
                    helperText={t.profile.fields.weightHint}
                  />
                </div>

                {/* Live BMI preview */}
                {bmi && (
                  <div className="glass border border-white/5 rounded-xl px-4 py-3
                                  flex items-center gap-3 animate-fade-in">
                    <HiInformationCircle size={18} className="text-cyan-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">
                        {t.profile.bmi.calculated.replace('{{value}}', bmi.value)}
                        {' — '}
                        {t.profile.bmi.category.replace('{{category}}', bmi.label)}
                      </p>
                    </div>
                  </div>
                )}

                <Button type="button" fullWidth size="lg"
                  icon={<HiArrowRight />} onClick={goNext}>
                  {t.profile.buttons.next}
                </Button>
              </div>
            )}

            {/* ════════════════════════════════════════════
                STEP 2 — Fitness Goals
            ════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-5 animate-fade-in">
                <SectionLabel>{t.profile.steps.fitnessGoals}</SectionLabel>

                {/* Goal cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {GOAL_OPTIONS.map((goal) => {
                    const meta    = GOAL_META[goal]
                    const chosen  = fields.fitness_goal === goal
                    // Translate goal names
                    const goalName = goal === 'Weight Loss' ? t.profile.fields.weightLoss :
                                    goal === 'Muscle Gain' ? t.profile.fields.muscleGain :
                                    goal === 'Endurance' ? t.profile.fields.endurance :
                                    goal === 'Flexibility' ? t.profile.fields.flexibility :
                                    t.profile.fields.generalFitness
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => selectGoal(goal)}
                        className={[
                          'relative flex flex-col items-center gap-2 p-3 rounded-xl border',
                          'text-center transition-all duration-200 cursor-pointer',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60',
                          chosen
                            ? `${meta.color} scale-[1.03] shadow-lg`
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/8',
                        ].join(' ')}
                        aria-pressed={chosen}
                      >
                        {chosen && (
                          <HiCheckCircle size={14}
                            className="absolute top-2 right-2 text-current opacity-80" />
                        )}
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-xs font-medium leading-tight">{goalName}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.fitness_goal && (
                  <p role="alert" className="text-xs text-red-400 flex items-center gap-1 -mt-1">
                    <span aria-hidden="true">⚠</span> {errors.fitness_goal}
                  </p>
                )}

                <SectionLabel>{t.profile.fields.experience}</SectionLabel>

                {/* Experience tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {EXPERIENCE_OPTIONS.map((lvl) => {
                    const chosen = fields.experience_level === lvl
                    const meta = {
                      Beginner:     { emoji: '🌱', color: 'border-green-500/40 bg-green-500/10 text-green-300' },
                      Intermediate: { emoji: '🔥', color: 'border-cyan-500/40   bg-cyan-500/10  text-cyan-300'  },
                      Advanced:     { emoji: '⚡', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
                    }[lvl]
                    const lvlName = lvl === 'Beginner' ? t.profile.fields.beginner :
                                   lvl === 'Intermediate' ? t.profile.fields.intermediate :
                                   t.profile.fields.advanced
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          setFields((p) => ({ ...p, experience_level: lvl }))
                          if (errors.experience_level)
                            setErrors((p) => ({ ...p, experience_level: '' }))
                        }}
                        className={[
                          'flex flex-col items-center gap-2 p-4 rounded-xl border',
                          'text-center transition-all duration-200 cursor-pointer',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60',
                          chosen
                            ? `${meta.color} scale-[1.03] shadow-lg`
                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/8',
                        ].join(' ')}
                        aria-pressed={chosen}
                      >
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className="text-xs font-medium">{lvlName}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.experience_level && (
                  <p role="alert" className="text-xs text-red-400 flex items-center gap-1 -mt-1">
                    <span aria-hidden="true">⚠</span> {errors.experience_level}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" size="lg"
                    className="flex-1" onClick={goBack}>
                    {t.profile.buttons.back}
                  </Button>
                  <Button type="button" size="lg" className="flex-1"
                    icon={<HiArrowRight />} onClick={goNext}>
                    {t.profile.buttons.next}
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                STEP 3 — Preferences
            ════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-5 animate-fade-in">
                <SectionLabel>{t.profile.steps.preferences}</SectionLabel>

                <SelectField
                  label={t.profile.fields.preferredLanguage}
                  id="preferred_language"
                  name="preferred_language"
                  value={fields.preferred_language}
                  onChange={handleChange}
                  error={errors.preferred_language}
                  helperText={t.common.welcome.startsWith('W') ? 'Language for workout instructions and tips' : 'workout அறிவுரைகளுக்கான மொழி'}
                >
                  <option value="" disabled className="bg-gray-900 text-gray-400">{t.profile.fields.languageSelect}</option>
                  {LANGUAGE_OPTIONS.map((l) => {
                    const langName = l === 'Tamil' ? t.profile.fields.tamil :
                                    l === 'English' ? t.profile.fields.english :
                                    l === 'Hindi' ? t.profile.fields.hindi :
                                    l === 'Telugu' ? t.profile.fields.telugu :
                                    l === 'Kannada' ? t.profile.fields.kannada :
                                    l === 'Malayalam' ? t.profile.fields.malayalam :
                                    l === 'Bengali' ? t.profile.fields.bengali :
                                    t.profile.fields.marathi
                    return (
                      <option key={l} value={l} className="bg-gray-900 text-white">{langName}</option>
                    )
                  })}
                </SelectField>

                <SectionLabel>{t.common.welcome.startsWith('W') ? 'Health Information (Optional)' : 'சுகாதார தகவல் (விருப்பமானது)'}</SectionLabel>

                {/* Medical conditions — free text, optional */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="medical_conditions"
                    className="text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    {t.profile.fields.medicalConditions}
                  </label>
                  <textarea
                    id="medical_conditions"
                    name="medical_conditions"
                    rows={3}
                    maxLength={500}
                    placeholder={t.profile.fields.medicalPlaceholder}
                    value={fields.medical_conditions}
                    onChange={handleChange}
                    className={[
                      'input-base resize-none',
                      errors.medical_conditions ? 'input-error' : '',
                    ].join(' ')}
                    aria-describedby="medical-helper"
                  />
                  <div className="flex items-center justify-between">
                    <p id="medical-helper" className="text-xs text-gray-600">
                      {t.profile.fields.medicalHint}
                    </p>
                    <p className={`text-xs ${fields.medical_conditions.length > 450 ? 'text-yellow-400' : 'text-gray-700'}`}>
                      {t.profile.fields.medicalMax.replace('{{count}}', fields.medical_conditions.length.toString())}
                    </p>
                  </div>
                  {errors.medical_conditions && (
                    <p role="alert" className="text-xs text-red-400 flex items-center gap-1">
                      <span aria-hidden="true">⚠</span> {errors.medical_conditions}
                    </p>
                  )}
                </div>

                {/* Profile summary preview */}
                <div className="glass border border-cyan-500/10 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
                    {t.common.welcome.startsWith('W') ? 'Profile Summary' : 'சுயவிவர சுருக்கம்'}
                  </p>
                  {[
                    { label: t.profile.fields.age,        value: fields.age ? `${fields.age} ${t.dashboard.profile.years}` : '—' },
                    { label: t.profile.fields.gender,     value: fields.gender || '—' },
                    { label: t.profile.fields.height,     value: fields.height_cm ? `${fields.height_cm} ${t.dashboard.profile.cm}` : '—' },
                    { label: t.profile.fields.weight,     value: fields.weight_kg ? `${fields.weight_kg} ${t.dashboard.profile.kg}` : '—' },
                    { label: t.dashboard.profile.goal,       value: fields.fitness_goal || '—' },
                    { label: t.profile.fields.experience, value: fields.experience_level || '—' },
                    { label: t.dashboard.profile.language,   value: fields.preferred_language || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" size="lg"
                    className="flex-1" onClick={goBack}>
                    {t.profile.buttons.back}
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    loading={loading}
                    icon={<HiCheckCircle />}
                  >
                    {loading ? t.profile.buttons.updating : isEditing ? t.profile.buttons.saveProfile : t.profile.buttons.completeProfile}
                  </Button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}

export default CompleteProfile
