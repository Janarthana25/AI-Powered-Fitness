/**
 * Dashboard.jsx — Protected landing page after login.
 *
 * This is a temporary placeholder dashboard that will be expanded with
 * full fitness-tracking features in a later phase.
 *
 * It demonstrates:
 *  - Reading the authenticated user from AuthContext
 *  - Displaying personalised welcome content
 *  - Logout flow back to landing page
 *  - Stat cards and quick-action tiles (UI skeleton for future features)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  HiLightningBolt,
  HiShieldCheck,
  HiChartBar,
  HiSparkles,
  HiLogout,
  HiUser,
  HiClock,
  HiFire,
  HiTrendingUp,
  HiBell,
  HiMenuAlt3,
  HiX,
  HiPencil,
  HiRefresh,
  HiCheckCircle,
} from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { predictAPI, injuryAPI, dietAPI, progressAPI } from '../api/authAPI'
import Button from '../components/Button'
import Card from '../components/Card'
import Loader from '../components/Loader'
import toast from '../components/Toast'
import WorkoutCoach from '../components/WorkoutCoach'
import { getCurrentWorkoutDay, getNextWorkoutDay } from '../utils/dateUtils'
import { getWorkoutForDay, GOAL_META, DAY_META } from '../data/WorkoutPlans'
import { getTranslations, formatMedicalCondition, calculateBMI } from '../utils/translations'

// ─── Data ─────────────────────────────────────────────────────────────────────

// STATS and QUICK_ACTIONS are now functions that accept translation object
const getSTATS = (t) => [
  {
    label:   t.dashboard.stats.workoutsDone,
    value:   '0',
    unit:    t.dashboard.stats.sessions,
    icon:    <HiLightningBolt size={20} />,
    color:   'text-cyan-400',
    bg:      'bg-cyan-500/10',
    border:  'border-cyan-500/20',
  },
  {
    label:   t.dashboard.stats.caloriesBurned,
    value:   '0',
    unit:    t.dashboard.stats.kcal,
    icon:    <HiFire size={20} />,
    color:   'text-orange-400',
    bg:      'bg-orange-500/10',
    border:  'border-orange-500/20',
  },
  {
    label:   t.dashboard.stats.activeStreak,
    value:   '0',
    unit:    t.dashboard.stats.days,
    icon:    <HiTrendingUp size={20} />,
    color:   'text-green-400',
    bg:      'bg-green-500/10',
    border:  'border-green-500/20',
  },
  {
    label:   t.dashboard.stats.injuryAlerts,
    value:   '0',
    unit:    t.dashboard.stats.thisWeek,
    icon:    <HiShieldCheck size={20} />,
    color:   'text-purple-400',
    bg:      'bg-purple-500/10',
    border:  'border-purple-500/20',
  },
]

const getQUICK_ACTIONS = (t) => [
  {
    title:   t.dashboard.quickActions.startWorkout,
    desc:    t.dashboard.quickActions.startWorkoutDesc,
    icon:    <HiLightningBolt size={24} />,
    color:   'from-cyan-500/20 to-cyan-500/5',
    iconCol: 'text-cyan-400',
    badge:   t.dashboard.quickActions.comingSoon,
  },
  {
    title:   t.dashboard.quickActions.injuryCheck,
    desc:    t.dashboard.quickActions.injuryCheckDesc,
    icon:    <HiShieldCheck size={24} />,
    color:   'from-green-500/20 to-green-500/5',
    iconCol: 'text-green-400',
    id:      'injuryCheck',
    badge:   null,
  },
  {
    title:   t.dashboard.quickActions.progressReport,
    desc:    t.dashboard.quickActions.progressReportDesc,
    icon:    <HiChartBar size={24} />,
    color:   'from-purple-500/20 to-purple-500/5',
    iconCol: 'text-purple-400',
    id:      'progressReport',
    badge:   null,
  },
  {
    title:   t.dashboard.quickActions.nutritionPlan,
    desc:    t.dashboard.quickActions.nutritionPlanDesc,
    icon:    <HiSparkles size={24} />,
    color:   'from-orange-500/20 to-orange-500/5',
    iconCol: 'text-orange-400',
    id:      'nutritionPlan',
    badge:   null,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return a time-of-day greeting. */
const getGreeting = (t) => {
  const h = new Date().getHours()
  if (h < 12) return t.dashboard.greeting.morning
  if (h < 17) return t.dashboard.greeting.afternoon
  return t.dashboard.greeting.evening
}

/** Format a Date as "Day, DD Mon YYYY". */
const formatDate = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Top navigation bar for the dashboard. */
const DashboardNav = ({ user, profile, onLogout, menuOpen, setMenuOpen, uiLanguage, setUiLanguage }) => {
  const t = getTranslations(uiLanguage || 'English')
  const isTamil = uiLanguage === 'Tamil'
  return (
  <nav className="fixed top-0 inset-x-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-white/5">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-green-500
                        flex items-center justify-center text-xs font-black text-gray-950">
          PT
        </div>
        <span className="font-bold gradient-text hidden sm:block">
          பயிற்சித் தோழன் AI
        </span>
      </div>

      {/* Desktop right-side controls */}
      <div className="hidden md:flex items-center gap-3">
        {/* Notification bell (placeholder) */}
        <button
          className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10
                     flex items-center justify-center text-gray-400 hover:text-white
                     hover:bg-white/10 transition-all duration-200"
          aria-label="Notifications"
          onClick={() => toast.info(isTamil ? 'அறிவிப்புகள் விரைவில்!' : 'Notifications coming soon!')}
        >
          <HiBell size={18} />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500" />
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-green-500
                          flex items-center justify-center text-[10px] font-bold text-gray-950">
            {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm text-gray-300 max-w-[140px] truncate">
            {user?.full_name}
          </span>
        </div>

        <Link to="/complete-profile">
          <Button variant="ghost" size="sm" icon={<HiPencil size={14} />}>
            {t.dashboard.profile.editProfile}
          </Button>
        </Link>

        {/* ── Global Language Selector ─────────────────────────────── */}
        <div
          className="flex items-center glass border border-white/10 rounded-xl overflow-hidden"
          role="group"
          aria-label="Language selector"
        >
          <button
            id="lang-tamil-btn"
            onClick={() => setUiLanguage('Tamil')}
            className={[
              'px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              isTamil
                ? 'bg-cyan-500/20 text-cyan-300 border-r border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300 border-r border-white/10',
            ].join(' ')}
            aria-pressed={isTamil}
            title="தமிழ் மொழியில் காட்டு"
          >
            தமிழ்
          </button>
          <button
            id="lang-english-btn"
            onClick={() => setUiLanguage('English')}
            className={[
              'px-3 py-1.5 text-xs font-semibold transition-all duration-200',
              !isTamil
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-gray-500 hover:text-gray-300',
            ].join(' ')}
            aria-pressed={!isTamil}
            title="Show in English"
          >
            English
          </button>
        </div>

        <Button variant="outline" size="sm" icon={<HiLogout size={14} />} onClick={onLogout}>
          {t.common.logout}
        </Button>
      </div>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white
                   hover:bg-white/5 transition-colors"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
      >
        {menuOpen ? <HiX size={22} /> : <HiMenuAlt3 size={22} />}
      </button>
    </div>

    {/* Mobile dropdown */}
    {menuOpen && (
      <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-t border-white/5
                      px-4 py-4 flex flex-col gap-3 animate-fade-in">
        <p className="text-sm text-gray-400 px-1">
          {isTamil ? 'நுழைந்துள்ளவர்' : 'Signed in as'}{' '}
          <span className="text-cyan-400 font-medium">{user?.full_name}</span>
        </p>

        {/* Mobile language selector */}
        <div
          className="flex items-center glass border border-white/10 rounded-xl overflow-hidden w-fit"
          role="group"
          aria-label="Language selector"
        >
          <button
            id="lang-tamil-btn-mobile"
            onClick={() => setUiLanguage('Tamil')}
            className={[
              'px-4 py-2 text-sm font-semibold transition-all duration-200',
              isTamil
                ? 'bg-cyan-500/20 text-cyan-300 border-r border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300 border-r border-white/10',
            ].join(' ')}
            aria-pressed={isTamil}
          >
            தமிழ்
          </button>
          <button
            id="lang-english-btn-mobile"
            onClick={() => setUiLanguage('English')}
            className={[
              'px-4 py-2 text-sm font-semibold transition-all duration-200',
              !isTamil
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-gray-500 hover:text-gray-300',
            ].join(' ')}
            aria-pressed={!isTamil}
          >
            English
          </button>
        </div>

        <Link to="/complete-profile">
          <Button variant="ghost" fullWidth icon={<HiPencil size={14} />}>
            {t.dashboard.profile.editProfile}
          </Button>
        </Link>
        <Button variant="outline" fullWidth icon={<HiLogout size={14} />} onClick={onLogout}>
          {t.common.logout}
        </Button>
      </div>
    )}
  </nav>
)}

/** Single stat card. */
const StatCard = ({ label, value, unit, icon, color, bg, border }) => (
  <div className={`glass border ${border} p-5 rounded-2xl flex items-center gap-4
                   hover:scale-[1.02] transition-transform duration-200`}>
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-[10px] text-gray-700">{unit}</p>
    </div>
  </div>
)

/** Quick-action tile. */
const ActionTile = ({ title, desc, icon, color, iconCol, badge }) => (
  <div
    className={`glass bg-gradient-to-b ${color} p-6 rounded-2xl cursor-default
                hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden`}
  >
    {badge && (
      <span className="absolute top-3 right-3 text-[10px] font-medium
                       bg-white/10 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
        {badge}
      </span>
    )}
    <div className={`${iconCol} mb-4`}>{icon}</div>
    <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
  </div>
)

// ─── Workout Recommendation Card ──────────────────────────────────────────────

/**
 * Maps a workout name returned by the model to display metadata.
 * Cardio | Full Body | HIIT | Strength | Upper/Lower Split
 */
const WORKOUT_META = {
  'Cardio':             { emoji: '🏃', color: 'from-orange-500/20 to-orange-500/5', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  'Full Body':          { emoji: '💪', color: 'from-cyan-500/20   to-cyan-500/5',   badge: 'bg-cyan-500/20   text-cyan-300   border-cyan-500/30'   },
  'HIIT':               { emoji: '⚡', color: 'from-yellow-500/20 to-yellow-500/5', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  'Strength':           { emoji: '🏋️', color: 'from-purple-500/20 to-purple-500/5', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  'Upper/Lower Split':  { emoji: '🔄', color: 'from-green-500/20  to-green-500/5',  badge: 'bg-green-500/20  text-green-300  border-green-500/30'  },
}

const DEFAULT_META = { emoji: '🤖', color: 'from-cyan-500/20 to-cyan-500/5', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }

/**
 * WorkoutCard — displays the AI-generated recommendation result.
 *
 * Props:
 *  result   : { recommended_workout, confidence, generated_at, status }
 *  onRefresh: () => void — triggers a new prediction
 *  loading  : boolean — shows loading state on the refresh button
 */
const WorkoutCard = ({ result, onRefresh, loading }) => {
  const meta = WORKOUT_META[result.recommended_workout] ?? DEFAULT_META

  // Format the UTC timestamp to a readable local string
  const formattedTime = (() => {
    try {
      return new Date(result.generated_at).toLocaleString('en-IN', {
        day:    '2-digit',
        month:  'short',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return result.generated_at
    }
  })()

  // Confidence colour band
  const confColor =
    result.confidence >= 80 ? 'text-green-400' :
    result.confidence >= 60 ? 'text-yellow-400' : 'text-orange-400'

  // Confidence bar width (capped at 100%)
  const barWidth = Math.min(result.confidence, 100)
  const barColor =
    result.confidence >= 80 ? 'bg-green-400' :
    result.confidence >= 60 ? 'bg-yellow-400' : 'bg-orange-400'

  return (
    <div className={`glass bg-gradient-to-br ${meta.color} border border-cyan-500/15
                     rounded-2xl p-6 animate-slide-up shadow-xl shadow-cyan-500/10`}>

      {/* ── Header row ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Emoji icon */}
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center
                          text-3xl flex-shrink-0 shadow-lg">
            {meta.emoji}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              AI Recommended Workout
            </p>
            <h3 className="text-xl font-black text-white leading-tight">
              {result.recommended_workout}
            </h3>
          </div>
        </div>

        {/* AI badge + refresh */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                            uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badge}`}>
            <HiCheckCircle size={11} /> AI Generated
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-500 hover:text-cyan-400 transition-colors p-1 rounded-lg
                       hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Regenerate recommendation"
            title="Generate a new recommendation"
          >
            <HiRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Confidence bar ───────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Model Confidence</p>
          <p className={`text-sm font-bold ${confColor}`}>
            {result.confidence.toFixed(1)}%
          </p>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* ── Detail chips ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass border border-white/5 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Workout Type</p>
          <p className="text-sm font-semibold text-white">{result.recommended_workout}</p>
        </div>
        <div className="glass border border-white/5 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Generated At</p>
          <p className="text-xs font-medium text-gray-300 leading-snug">{formattedTime}</p>
        </div>
      </div>

      {/* ── Footer note ──────────────────────────────────────────── */}
      <p className="text-[11px] text-gray-600 mt-4 text-center leading-relaxed">
        Recommendation generated by the பயிற்சித் தோழன் AI model based on your fitness profile.
      </p>
    </div>
  )
}

// ─── Injury Risk Components ───────────────────────────────────────────────────

const EXERCISE_OPTIONS = [
  'Bench Press', 'Bicep Curl', 'Deadlift', 'Jump Squat',
  'Lunge', 'Plank', 'Push-up', 'Shoulder Press', 'Squat',
]
const MEDICAL_OPTIONS = ['None', 'Knee Pain', 'Lower Back Pain', 'Shoulder Pain']

const RISK_META = {
  Low:    { color: 'from-green-500/20 to-green-500/5',  border: 'border-green-500/20',  badge: 'bg-green-500/20  text-green-300  border-green-500/30',  icon: '🛡️', barColor: 'bg-green-400'  },
  Medium: { color: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/20', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: '⚠️', barColor: 'bg-yellow-400' },
  High:   { color: 'from-red-500/20 to-red-500/5',      border: 'border-red-500/20',    badge: 'bg-red-500/20    text-red-300    border-red-500/30',    icon: '🚨', barColor: 'bg-red-400'    },
}
const DEFAULT_RISK_META = RISK_META.Medium

// Shared select style matching existing SelectField in CompleteProfile
const ISEL = [
  'w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3',
  'text-white text-sm focus:outline-none focus:border-cyan-500/60',
  'focus:bg-gray-800 transition-all duration-200 appearance-none cursor-pointer',
].join(' ')

/**
 * InjuryRiskForm — collects exercise + angle inputs before calling the API.
 * Props: fields, onChange, onSubmit, loading, error
 */
const InjuryRiskForm = ({ fields, onChange, onSubmit, loading, error, t }) => {
  const angles = [
    { key: 'knee_angle',     label: t.dashboard.injury.kneeAngle,     hint: '0–180°' },
    { key: 'hip_angle',      label: t.dashboard.injury.hipAngle,      hint: '0–180°' },
    { key: 'shoulder_angle', label: t.dashboard.injury.shoulderAngle, hint: '0–180°' },
    { key: 'back_angle',     label: t.dashboard.injury.backAngle,     hint: '0–180°' },
  ]

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid sm:grid-cols-2 gap-4 mb-5">

        {/* Exercise */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {t.dashboard.injury.exercise}
          </label>
          <div className="relative">
            <select
              name="exercise"
              value={fields.exercise}
              onChange={onChange}
              className={ISEL}
              required
            >
              <option value="" disabled className="bg-gray-900 text-gray-400">{t.dashboard.injury.selectExercise}</option>
              {EXERCISE_OPTIONS.map(e => (
                <option key={e} value={e} className="bg-gray-900 text-white">{e}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>

        {/* Angle inputs */}
        {angles.map(({ key, label, hint }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {label}
            </label>
            <input
              type="number"
              name={key}
              value={fields[key]}
              onChange={onChange}
              min="0" max="180" step="0.1"
              placeholder={hint}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 text-sm
                         focus:outline-none focus:border-cyan-500/60 focus:bg-white/8
                         transition-all duration-200"
              required
            />
            <p className="text-xs text-gray-600">{hint}</p>
          </div>
        ))}

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {t.dashboard.injury.duration}
          </label>
          <input
            type="number"
            name="duration"
            value={fields.duration}
            onChange={onChange}
            min="1" max="300" step="1"
            placeholder="e.g. 30"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 text-sm
                       focus:outline-none focus:border-cyan-500/60 focus:bg-white/8
                       transition-all duration-200"
            required
          />
          <p className="text-xs text-gray-600">{t.dashboard.injury.minutesPerSession}</p>
        </div>

        {/* Medical condition */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {t.dashboard.injury.medicalCondition}
          </label>
          <div className="relative">
            <select
              name="medical_condition"
              value={fields.medical_condition}
              onChange={onChange}
              className={ISEL}
            >
              {MEDICAL_OPTIONS.map(m => (
                <option key={m} value={m} className="bg-gray-900 text-white">{m}</option>
              ))}
            </select>
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 glass border border-red-500/20 bg-red-500/5
                        rounded-xl px-4 py-3 text-sm text-red-400">
          ⚠ {error}
        </div>
      )}

      <Button
        type="submit"
        variant="secondary"
        size="lg"
        fullWidth
        loading={loading}
        icon={!loading ? <HiShieldCheck size={18} /> : null}
        className="shadow-xl shadow-green-500/15"
      >
        {loading ? t.dashboard.injury.analysing : t.dashboard.injury.checkRisk}
      </Button>

      {/* ⚕ Medical safety disclaimer */}
      <p className="text-[11px] text-gray-600 mt-4 text-center leading-relaxed">
        ⚕ {t.workout.summary.disclaimer}
      </p>
    </form>
  )
}

/**
 * InjuryRiskCard — displays the prediction result.
 * Props: result, onReset, onRefresh, loading
 */
const InjuryRiskCard = ({ result, onReset, onRefresh, loading, t }) => {
  const meta = RISK_META[result.risk_level] ?? DEFAULT_RISK_META
  const barWidth = Math.min(result.confidence, 100)

  const formattedTime = (() => {
    try {
      return new Date(result.generated_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    } catch { return result.generated_at }
  })()

  const confColor =
    result.risk_level === 'Low'    ? 'text-green-400' :
    result.risk_level === 'Medium' ? 'text-yellow-400' : 'text-red-400'

  const riskLabel =
    result.risk_level === 'Low'    ? t.dashboard.injury.lowRisk :
    result.risk_level === 'Medium' ? t.dashboard.injury.mediumRisk :
                                     t.dashboard.injury.highRisk

  return (
    <div className={`glass bg-gradient-to-br ${meta.color} ${meta.border}
                     border rounded-2xl p-6 animate-slide-up`}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center
                          justify-center text-3xl flex-shrink-0 shadow-lg">
            {meta.icon}
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {t.dashboard.injury.riskLevel}
            </p>
            <h3 className={`text-2xl font-black leading-tight ${confColor}`}>
              {riskLabel}
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold
                            uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.badge}`}>
            <HiCheckCircle size={11} /> AI Assessed
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-gray-500 hover:text-cyan-400 transition-colors p-1 rounded-lg
                         hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Re-check"
              title="Run again with same inputs"
            >
              <HiRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onReset}
              disabled={loading}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg
                         hover:bg-white/5 disabled:opacity-40 text-xs"
              title="Edit inputs"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* ── Confidence bar ───────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Model Confidence</p>
          <p className={`text-sm font-bold ${confColor}`}>{result.confidence.toFixed(1)}%</p>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${meta.barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* ── Recommendation ───────────────────────────────────────── */}
      <div className="glass border border-white/5 rounded-xl p-4 mb-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">
          {t.dashboard.injury.recommendation}
        </p>
        <p className="text-sm text-gray-200 leading-relaxed">{result.recommendation}</p>
      </div>

      {/* ── Prevention tips ──────────────────────────────────────── */}
      <div className="glass border border-white/5 rounded-xl p-4 mb-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">
          {t.dashboard.injury.preventionTips}
        </p>
        <ul className="space-y-2">
          {result.prevention_tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
              <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center
                               justify-center text-[9px] font-bold
                               ${result.risk_level === 'Low' ? 'bg-green-500/20 text-green-400' :
                                 result.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                 'bg-red-500/20 text-red-400'}`}>
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Footer chips ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass border border-white/5 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.injury.riskLevel}</p>
          <p className={`text-sm font-bold ${confColor}`}>{result.risk_level}</p>
        </div>
        <div className="glass border border-white/5 rounded-xl p-3 text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.injury.assessedAt}</p>
          <p className="text-xs font-medium text-gray-300 leading-snug">{formattedTime}</p>
        </div>
      </div>

      {/* ⚕ Medical safety disclaimer */}
      <p className="text-[11px] text-gray-600 text-center leading-relaxed">
        ⚕ {t.workout.summary.disclaimer}
      </p>
    </div>
  )
}

// ─── Diet Recommendation Card ─────────────────────────────────────────────────

/**
 * DietCard — displays BMI, BMR, macros, water, sleep + full Indian meal plan.
 * Props: result, onRefresh, loading
 */
const DietCard = ({ result, onRefresh, loading }) => {

  const formattedTime = (() => {
    try {
      return new Date(result.generated_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    } catch { return result.generated_at }
  })()

  const bmiColor =
    result.bmi_category === 'Normal'      ? 'text-green-400'  :
    result.bmi_category === 'Underweight' ? 'text-blue-400'   :
    result.bmi_category === 'Overweight'  ? 'text-yellow-400' : 'text-red-400'

  // Nutrition metric chips — [{label, value, unit, color}]
  const metrics = [
    { label: 'BMI',       value: result.bmi,            unit: result.bmi_category, color: bmiColor },
    { label: 'BMR',       value: `${result.bmr}`,       unit: 'kcal/day',          color: 'text-cyan-400'   },
    { label: 'Calories',  value: result.daily_calories, unit: 'kcal/day',          color: 'text-orange-400' },
    { label: 'Protein',   value: `${result.protein_g}g`,unit: 'per day',           color: 'text-purple-400' },
    { label: 'Carbs',     value: `${result.carbs_g}g`,  unit: 'per day',           color: 'text-yellow-400' },
    { label: 'Fat',       value: `${result.fat_g}g`,    unit: 'per day',           color: 'text-pink-400'   },
    { label: 'Water',     value: `${result.water_L}L`,  unit: 'per day',           color: 'text-blue-400'   },
    { label: 'Sleep',     value: `${result.sleep_hours}h`, unit: 'per night',      color: 'text-indigo-400' },
  ]

  // Meal plan rows
  const meals = [
    { time: '7:00 AM',  label: '🌅 Breakfast',        value: result.breakfast     },
    { time: '10:30 AM', label: '🍎 Mid-Morning Snack', value: result.mid_morning   },
    { time: '1:00 PM',  label: '🍛 Lunch',             value: result.lunch         },
    { time: '4:30 PM',  label: '🫖 Evening Snack',     value: result.evening_snack },
    { time: '7:30 PM',  label: '🌙 Dinner',            value: result.dinner        },
  ]

  return (
    <div className="glass border border-green-500/15 rounded-2xl overflow-hidden animate-slide-up
                    shadow-xl shadow-green-500/5">

      {/* ── Card header ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 px-6 py-4
                      border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center
                          justify-center text-xl">🥗</div>
          <div>
            <h3 className="text-sm font-bold text-white">Your AI Diet Plan</h3>
            <p className="text-[11px] text-gray-500">
              Goal: <span className="text-green-400">{result.goal}</span>
              {' · '}Language: <span className="text-cyan-400">{result.language}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold
                           uppercase tracking-wider px-2.5 py-1 rounded-full border
                           bg-green-500/20 text-green-300 border-green-500/30">
            <HiCheckCircle size={11} /> AI Generated
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5 rounded-lg
                       hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Regenerate diet plan"
            title="Generate a new diet plan"
          >
            <HiRefresh size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Nutrition metrics grid ───────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
            Nutrition Targets
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metrics.map(({ label, value, unit, color }) => (
              <div key={label}
                   className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                  {label}
                </p>
                <p className={`text-base font-black leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-700 mt-0.5">{unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Meal plan ────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
            Daily Meal Plan
          </p>
          <div className="space-y-3">
            {meals.map(({ time, label, value }) => (
              <div key={label}
                   className="glass border border-white/5 rounded-xl px-4 py-3
                              flex flex-col sm:flex-row sm:items-start gap-2">
                <div className="flex items-center gap-2 sm:w-44 flex-shrink-0">
                  <span className="text-[10px] text-gray-600 font-mono w-14 flex-shrink-0">
                    {time}
                  </span>
                  <span className="text-xs font-semibold text-white">{label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed sm:border-l sm:border-white/5 sm:pl-4">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <p className="text-[11px] text-gray-700 text-center pt-1">
          Generated at {formattedTime} · Based on Mifflin-St Jeor Formula · Indian diet plan
        </p>
      </div>
    </div>
  )
}

// ─── Weight Trend Chart ───────────────────────────────────────────────────────
// Uses recharts — renders a responsive area line chart of the user's
// last 7 weight entries.

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass border border-cyan-500/20 rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-cyan-400 font-bold">{payload[0].value} kg</p>
    </div>
  )
}

const WeightChart = ({ data }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div style={{ height: 180 }} />

  return (
  <div className="glass border border-cyan-500/10 rounded-2xl p-5
                  bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent">
    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-4">
      Weight Trend
    </p>
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00E5FF" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="weight"
            stroke="#00E5FF"
            strokeWidth={2}
            fill="url(#weightGrad)"
            dot={{ fill: '#00E5FF', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#00E5FF', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
  )
}

// ─── Progress Report Modal ───────────────────────────────────────────────────

/**
 * ProgressReportModal — Full-screen overlay showing the user's real progress data.
 * Uses existing stats (from Dashboard state) + fetches history on open.
 * Shows only real data; empty state if no entries exist.
 * Props: stats, history, historyLoading, onClose, t
 */
const ProgressReportModal = ({ stats, history, historyLoading, onClose, t }) => {
  const pr = t.dashboard.progressReport

  const hasData   = stats && stats.total_entries > 0
  const hasWeight = stats?.current_weight != null || stats?.starting_weight != null
  const hasChart  = stats?.weekly_weights?.length >= 2
  const hasAvg    = stats?.avg_sleep_hours != null ||
                    stats?.avg_water_L     != null ||
                    stats?.avg_calories    != null

  /** Format ISO timestamp to a readable local date string. */
  const fmtDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    } catch { return iso }
  }

  /** Colour and sign for weight change display. */
  const weightChangeColor =
    stats?.weight_change_kg == null ? 'text-gray-400' :
    stats.weight_change_kg < 0     ? 'text-green-400' :
    stats.weight_change_kg > 0     ? 'text-orange-400' : 'text-gray-400'

  const weightChangeLabel = (() => {
    if (stats?.weight_change_kg == null) return pr.notAvailable
    const sign = stats.weight_change_kg > 0 ? '+' : ''
    return `${sign}${stats.weight_change_kg} ${pr.kg}`
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-gray-950/92 backdrop-blur-md overflow-y-auto py-6 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={pr.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-3xl
                      shadow-2xl shadow-purple-500/10 overflow-hidden animate-slide-up mb-8">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-white/5 bg-gradient-to-r
                        from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/20
                            flex items-center justify-center text-xl flex-shrink-0">📊</div>
            <div>
              <p className="text-sm font-bold text-white">{pr.title}</p>
              <p className="text-[11px] text-gray-500">{pr.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                       flex items-center justify-center text-gray-400 hover:text-white
                       transition-all duration-200"
            aria-label={pr.close}
          >✕</button>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="p-6 space-y-6">

          {/* Loading state */}
          {historyLoading && !hasData && (
            <div className="flex flex-col items-center gap-4 py-12 animate-fade-in">
              <div className="w-10 h-10 rounded-full border-2 border-purple-500/30
                              border-t-purple-400 animate-spin" />
              <p className="text-gray-400 text-sm">{pr.loading}</p>
            </div>
          )}

          {/* ── Empty state ──────────────────────────────────────── */}
          {!historyLoading && !hasData && (
            <div className="flex flex-col items-center gap-4 py-14 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20
                              flex items-center justify-center text-3xl">📈</div>
              <div>
                <p className="text-white font-bold text-base mb-2">{pr.noData}</p>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  {pr.noDataSubtitle}
                </p>
              </div>
            </div>
          )}

          {/* ── Real data sections ───────────────────────────────── */}
          {hasData && (
            <>
              {/* ── Overview stats ─────────────────────────────── */}
              <div>
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
                  {pr.overview}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {/* Workouts completed */}
                  <div className="glass border border-purple-500/15 bg-purple-500/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-purple-400 leading-none">
                      {stats.total_workouts}
                    </p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
                      {pr.workoutsCompleted}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-0.5">{pr.sessions}</p>
                  </div>

                  {/* Current streak */}
                  <div className="glass border border-orange-500/15 bg-orange-500/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-orange-400 leading-none">
                      {stats.workout_streak}
                    </p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
                      {pr.currentStreak}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-0.5">{pr.days}</p>
                  </div>

                  {/* Days logged */}
                  <div className="glass border border-cyan-500/15 bg-cyan-500/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-cyan-400 leading-none">
                      {stats.total_entries}
                    </p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
                      {pr.daysLogged}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-0.5">{pr.days}</p>
                  </div>

                  {/* Goal progress */}
                  <div className="glass border border-green-500/15 bg-green-500/5 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-green-400 leading-none">
                      {stats.goal_progress_pct}%
                    </p>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">
                      {pr.goalProgress}
                    </p>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full transition-all duration-700"
                           style={{ width: `${Math.min(stats.goal_progress_pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Body Metrics ──────────────────────────────────── */}
              {hasWeight && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
                    {pr.bodyMetrics}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                        {pr.currentWeight}
                      </p>
                      <p className="text-lg font-black text-white leading-none">
                        {stats.current_weight != null ? stats.current_weight : pr.notAvailable}
                      </p>
                      {stats.current_weight != null && (
                        <p className="text-[10px] text-gray-700 mt-0.5">{pr.kg}</p>
                      )}
                    </div>
                    <div className="glass border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                        {pr.startingWeight}
                      </p>
                      <p className="text-lg font-black text-white leading-none">
                        {stats.starting_weight != null ? stats.starting_weight : pr.notAvailable}
                      </p>
                      {stats.starting_weight != null && (
                        <p className="text-[10px] text-gray-700 mt-0.5">{pr.kg}</p>
                      )}
                    </div>
                    <div className="glass border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                        {pr.weightChange}
                      </p>
                      <p className={`text-lg font-black leading-none ${weightChangeColor}`}>
                        {weightChangeLabel}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Weight Trend Chart ────────────────────────────── */}
              {hasChart && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
                    {pr.weightTrend}
                  </p>
                  <WeightChart data={stats.weekly_weights} />
                </div>
              )}

              {/* ── Daily Averages ────────────────────────────────── */}
              {hasAvg && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
                    {pr.dailyAverages}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {stats.avg_sleep_hours != null && (
                      <div className="glass border border-indigo-500/15 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                          {pr.avgSleep}
                        </p>
                        <p className="text-lg font-bold text-indigo-400">{stats.avg_sleep_hours}h</p>
                        <p className="text-[10px] text-gray-700">{pr.perNight}</p>
                      </div>
                    )}
                    {stats.avg_water_L != null && (
                      <div className="glass border border-blue-500/15 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                          {pr.avgWater}
                        </p>
                        <p className="text-lg font-bold text-blue-400">{stats.avg_water_L}L</p>
                        <p className="text-[10px] text-gray-700">{pr.perDay}</p>
                      </div>
                    )}
                    {stats.avg_calories != null && (
                      <div className="glass border border-yellow-500/15 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                          {pr.avgCalories}
                        </p>
                        <p className="text-lg font-bold text-yellow-400">
                          {stats.avg_calories}
                        </p>
                        <p className="text-[10px] text-gray-700">{pr.perDay}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Recent Activity ───────────────────────────────── */}
              <div>
                <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
                  {pr.recentActivity}
                </p>

                {historyLoading ? (
                  <div className="flex items-center justify-center gap-3 py-6 glass border border-white/5 rounded-2xl">
                    <div className="w-5 h-5 rounded-full border-2 border-purple-500/40
                                    border-t-purple-400 animate-spin" />
                    <p className="text-gray-500 text-sm">{pr.loading}</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="glass border border-white/5 rounded-2xl p-6 text-center">
                    <p className="text-gray-500 text-sm">{pr.noData}</p>
                  </div>
                ) : (
                  <div className="glass border border-white/5 rounded-2xl overflow-hidden">
                    {history.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`px-4 py-3 flex flex-col gap-1
                          ${idx !== history.length - 1 ? 'border-b border-white/5' : ''}`}
                      >
                        {/* Date + workout status */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-400 font-mono">
                            {fmtDate(entry.created_at)}
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                            ${ entry.workout_completed
                                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                                : 'bg-white/5 text-gray-600 border border-white/10' }`}>
                            {entry.workout_completed ? pr.workoutDone : pr.noWorkoutLogged}
                          </span>
                        </div>
                        {/* Inline stats row */}
                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
                          {entry.weight_kg != null && (
                            <span>⚖️ {entry.weight_kg} {pr.kg}</span>
                          )}
                          {entry.water_intake_L != null && (
                            <span>💧 {entry.water_intake_L}L</span>
                          )}
                          {entry.calories_consumed != null && (
                            <span>🍽️ {entry.calories_consumed} kcal</span>
                          )}
                          {entry.sleep_hours != null && (
                            <span>😴 {entry.sleep_hours}h</span>
                          )}
                        </div>
                        {/* Notes (workout details) */}
                        {entry.notes && (
                          <p className="text-[10px] text-gray-600 leading-relaxed italic
                                        border-l-2 border-purple-500/20 pl-2 mt-0.5">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Close button at bottom */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-semibold
                       bg-white/5 border border-white/10 text-gray-300
                       hover:bg-white/10 transition-all duration-200 mt-2"
          >
            {pr.close}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user, profile, logout } = useAuth()
  const { uiLanguage, setUiLanguage, langConfig } = useLanguage()
  const navigate         = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [coachOpen, setCoachOpen] = useState(false)  // AI Workout Form Coach modal
  const [showProgressReport, setShowProgressReport] = useState(false)
  const [progressHistory, setProgressHistory]       = useState([])
  const [historyLoading, setHistoryLoading]         = useState(false)
  const injurySectionRef    = useRef(null)
  const nutritionSectionRef = useRef(null)

  // ── Translation system ─────────────────────────────────────────────
  // Get translations based on user's preferred language
  const t = getTranslations(uiLanguage)
  const STATS = getSTATS(t)
  const QUICK_ACTIONS = getQUICK_ACTIONS(t)

  // ── Automatic day detection and workout planning ──────────────────────
  const currentDay = getCurrentWorkoutDay()
  const userGoal = profile?.fitness_goal || 'Weight Loss' // Default if not set
  const todaysWorkout = getWorkoutForDay(userGoal, currentDay.dayName)
  const nextWorkout = getNextWorkoutDay()

  // ── AI Workout Prediction state ──────────────────────────────────
  const [prediction,     setPrediction]     = useState(null)
  const [predLoading,    setPredLoading]    = useState(false)
  const [predError,      setPredError]      = useState('')

  // ── Injury Risk state ─────────────────────────────────────────────
  const INJURY_DEFAULTS = {
    exercise:          '',
    knee_angle:        '',
    hip_angle:         '',
    shoulder_angle:    '',
    back_angle:        '',
    duration:          '',
    medical_condition: 'None',
  }
  const [injuryFields,  setInjuryFields]  = useState(INJURY_DEFAULTS)
  const [injuryResult,  setInjuryResult]  = useState(null)
  const [injuryLoading, setInjuryLoading] = useState(false)
  const [injuryError,   setInjuryError]   = useState('')

  const handleInjuryChange = (e) => {
    const { name, value } = e.target
    setInjuryFields(prev => ({ ...prev, [name]: value }))
    if (injuryError) setInjuryError('')
  }

  const handleInjurySubmit = async (e) => {
    e.preventDefault()
    // Client-side required field check
    const required = ['exercise', 'knee_angle', 'hip_angle', 'shoulder_angle', 'back_angle', 'duration']
    const missing = required.filter(k => !injuryFields[k] && injuryFields[k] !== 0)
    if (missing.length) {
      setInjuryError('Please fill in all required fields.')
      return
    }
    setInjuryLoading(true)
    setInjuryError('')
    try {
      const payload = {
        exercise:          injuryFields.exercise,
        knee_angle:        parseFloat(injuryFields.knee_angle),
        hip_angle:         parseFloat(injuryFields.hip_angle),
        shoulder_angle:    parseFloat(injuryFields.shoulder_angle),
        back_angle:        parseFloat(injuryFields.back_angle),
        duration:          parseFloat(injuryFields.duration),
        medical_condition: injuryFields.medical_condition || 'None',
      }
      const result = await injuryAPI.checkInjuryRisk(payload)
      setInjuryResult(result)
      toast.success(`Injury risk assessed: ${result.risk_level} Risk`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to assess injury risk. Please try again.'
      setInjuryError(msg)
      toast.error(msg)
    } finally {
      setInjuryLoading(false)
    }
  }

  const handleInjuryReset = () => {
    setInjuryResult(null)
    setInjuryError('')
  }

  const handleInjuryRefresh = async () => {
    // Re-run with same inputs
    setInjuryResult(null)
    // Trigger form submit programmatically by re-using the handler with a fake event
    const fakeEvent = { preventDefault: () => {} }
    await handleInjurySubmit(fakeEvent)
  }

  // Scroll to injury section from quick-action tile click
  const handleInjuryTileClick = () => {
    injurySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }


  // Open Progress Report modal — fetch history on first open
  const handleProgressReportClick = useCallback(async () => {
    setShowProgressReport(true)
    setHistoryLoading(true)
    try {
      const { entries } = await progressAPI.getProgressHistory(0, 10)
      setProgressHistory(entries || [])
    } catch {
      setProgressHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // ── AI Diet Recommendation state ──────────────────────────────────
  const [dietResult,  setDietResult]  = useState(null)
  const [dietLoading, setDietLoading] = useState(false)
  const [dietError,   setDietError]   = useState('')

  const handleGetDiet = async () => {
    setDietLoading(true)
    setDietError('')
    try {
      const result = await dietAPI.getDietRecommendation()
      setDietResult(result)
      toast.success('AI diet plan generated!')
    } catch (err) {
      const msg = err.response?.data?.detail ||
        'Failed to generate diet plan. Please try again.'
      setDietError(msg)
      toast.error(msg)
    } finally {
      setDietLoading(false)
    }
  }

  const handleDietRefresh = () => {
    setDietResult(null)
    setDietError('')
    handleGetDiet()
  }

  // Scroll to nutrition section + auto-trigger plan if not yet generated
  // (declared here, AFTER dietResult / dietLoading / handleGetDiet are initialised)
  const handleNutritionTileClick = useCallback(() => {
    nutritionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!dietResult && !dietLoading) {
      handleGetDiet()
    }
  }, [dietResult, dietLoading, handleGetDiet])

  // ── Progress Tracking state ───────────────────────────────────────
  const PROGRESS_FORM_DEFAULTS = {
    weight_kg:          '',
    water_intake_L:     '',
    calories_consumed:  '',
    sleep_hours:        '',
    workout_completed:  false,
    notes:              '',
  }
  const [progressForm,    setProgressForm]    = useState(PROGRESS_FORM_DEFAULTS)
  const [progressStats,   setProgressStats]   = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressLogging, setProgressLogging] = useState(false)
  const [progressError,   setProgressError]   = useState('')
  const [progressSuccess, setProgressSuccess] = useState('')
  const [showLogForm,     setShowLogForm]      = useState(false)

  // Fetch stats on mount and after every successful log
  const fetchProgressStats = useCallback(async () => {
    setProgressLoading(true)
    try {
      const stats = await progressAPI.getProgressStats()
      setProgressStats(stats)
    } catch {
      // Non-fatal — stats stay null, section shows empty state
    } finally {
      setProgressLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProgressStats()
  }, [fetchProgressStats])

  const handleProgressFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setProgressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (progressError) setProgressError('')
  }

  const handleLogProgress = async (e) => {
    e.preventDefault()
    setProgressLogging(true)
    setProgressError('')
    setProgressSuccess('')
    try {
      const payload = {}
      if (progressForm.weight_kg)         payload.weight_kg         = parseFloat(progressForm.weight_kg)
      if (progressForm.water_intake_L)    payload.water_intake_L    = parseFloat(progressForm.water_intake_L)
      if (progressForm.calories_consumed) payload.calories_consumed = parseInt(progressForm.calories_consumed, 10)
      if (progressForm.sleep_hours)       payload.sleep_hours       = parseFloat(progressForm.sleep_hours)
      payload.workout_completed = progressForm.workout_completed
      if (progressForm.notes.trim())      payload.notes             = progressForm.notes.trim()

      await progressAPI.logProgress(payload)
      setProgressSuccess('Progress logged successfully!')
      setProgressForm(PROGRESS_FORM_DEFAULTS)
      setShowLogForm(false)
      toast.success('Progress logged!')
      await fetchProgressStats()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to log progress. Please try again.'
      setProgressError(msg)
      toast.error(msg)
    } finally {
      setProgressLogging(false)
    }
  }

  const handleGetPlan = async () => {
    setPredLoading(true)
    setPredError('')
    try {
      const result = await predictAPI.getWorkoutPrediction()
      setPrediction(result)
      toast.success('AI workout plan generated!')
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        'Failed to generate workout plan. Please try again.'
      setPredError(msg)
      toast.error(msg)
    } finally {
      setPredLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('You have been logged out.')
    navigate('/', { replace: true })
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'Athlete'

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Ambient background */}
      <div className="orb w-[500px] h-[500px] bg-cyan-500  top-[-15%] right-[-10%]"
           aria-hidden="true" style={{ animationDelay: '0s' }} />
      <div className="orb w-96 h-96 bg-green-500 bottom-[-10%] left-[-8%]"
           aria-hidden="true" style={{ animationDelay: '2s' }} />

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <DashboardNav
        user={user}
        profile={profile}
        onLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        uiLanguage={uiLanguage}
        setUiLanguage={setUiLanguage}
      />

      {/* ── Page body ───────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* ── Welcome banner ────────────────────────────────────────── */}
        <section className="mb-10 animate-slide-up">
          <div className="glass border border-cyan-500/10 rounded-3xl p-8
                          bg-gradient-to-br from-cyan-500/5 via-transparent to-green-500/5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {/* Greeting */}
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <HiClock size={14} className="text-cyan-500/60" />
                  {formatDate()}
                </p>
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                  {getGreeting(t)},{' '}
                  <span className="gradient-text">{firstName}!</span> 👋
                </h1>
                <p className="text-gray-400 text-sm max-w-md">
                  Your AI fitness companion is ready. Start a workout, check
                  your posture, or review your progress — all powered by AI.
                </p>
              </div>

              {/* Profile chip */}
              <div className="flex-shrink-0">
                <div className="glass border border-white/10 rounded-2xl p-4 text-center min-w-[140px]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-green-500
                                  flex items-center justify-center text-xl font-black text-gray-950
                                  mx-auto mb-3 shadow-lg shadow-cyan-500/30">
                    {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <p className="text-sm font-semibold text-white truncate max-w-[120px] mx-auto">
                    {user?.full_name}
                  </p>
                  <p className="text-[11px] text-gray-600 truncate max-w-[120px] mx-auto mt-0.5">
                    {user?.email}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px]
                                   text-green-400 bg-green-500/10 border border-green-500/20
                                   px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Account + Fitness Profile ─────────────────────────── */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              {t.dashboard.profile.title}
            </h2>
            <Link
              to="/complete-profile"
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300
                         transition-colors group"
            >
              <HiPencil size={13} className="group-hover:scale-110 transition-transform" />
              {t.dashboard.profile.editProfile}
            </Link>
          </div>

          {/* Top row — account identity chips */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

            {/* Name */}
            <div className="glass border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <HiUser size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">{t.common.welcome.split('').slice(0,4).join('') === 'Welc' ? 'Full Name' : 'முழு பெயர்'}</p>
                <p className="text-sm text-white font-medium truncate">{user?.full_name ?? '—'}</p>
              </div>
            </div>

            {/* Email */}
            <div className="glass border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">{t.common.welcome.split('').slice(0,4).join('') === 'Welc' ? 'Email' : 'மின்னஞ்சல்'}</p>
                <p className="text-sm text-white font-medium truncate">{user?.email ?? '—'}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="glass border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">{t.common.welcome.startsWith('W') ? 'Phone' : 'தொலைபேசி'}</p>
                <p className="text-sm text-white font-medium">{user?.phone ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Fitness profile card */}
          <div className="glass border border-cyan-500/10 rounded-2xl p-6
                          bg-gradient-to-br from-cyan-500/5 via-transparent to-green-500/5">

            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-green-500/20
                                flex items-center justify-center">
                  <HiSparkles size={16} className="text-cyan-400" />
                </div>
                <p className="text-sm font-semibold text-white">{t.common.welcome.startsWith('W') ? 'Fitness Profile' : 'Fitness சுயவிவரம்'}</p>
              </div>
              <Link
                to="/complete-profile"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors
                           flex items-center gap-1 glass px-2.5 py-1 rounded-lg border border-cyan-500/20
                           hover:border-cyan-400/40"
              >
                <HiPencil size={11} /> {t.common.edit}
              </Link>
            </div>

            {/* 8-field grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {/* Age */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.age}</p>
                <p className="text-lg font-bold text-white leading-none">
                  {profile?.age ?? '—'}
                </p>
                {profile?.age && <p className="text-[10px] text-gray-700 mt-0.5">{t.dashboard.profile.years}</p>}
              </div>

              {/* Gender */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.gender}</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  {profile?.gender ?? '—'}
                </p>
              </div>

              {/* Height */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.height}</p>
                <p className="text-lg font-bold text-white leading-none">
                  {profile?.height_cm ?? '—'}
                </p>
                {profile?.height_cm && <p className="text-[10px] text-gray-700 mt-0.5">{t.dashboard.profile.cm}</p>}
              </div>

              {/* Weight */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.weight}</p>
                <p className="text-lg font-bold text-white leading-none">
                  {profile?.weight_kg ?? '—'}
                </p>
                {profile?.weight_kg && <p className="text-[10px] text-gray-700 mt-0.5">{t.dashboard.profile.kg}</p>}
              </div>

              {/* Goal — spans 2 cols */}
              <div className="glass border border-cyan-500/15 bg-cyan-500/5 rounded-xl p-3 text-center col-span-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.goal}</p>
                <p className="text-sm font-bold text-cyan-300 leading-snug">
                  {profile?.fitness_goal
                    ? `${{
                        'Weight Loss':     '🔥',
                        'Muscle Gain':     '💪',
                        'Endurance':       '🏃',
                        'Flexibility':     '🧘',
                        'General Fitness': '⚡',
                      }[profile.fitness_goal] ?? ''} ${profile.fitness_goal}`
                    : '—'}
                </p>
              </div>

              {/* Experience */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.experience}</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  {profile?.experience_level
                    ? `${{ Beginner: '🌱', Intermediate: '🔥', Advanced: '⚡' }[profile.experience_level] ?? ''} ${profile.experience_level}`
                    : '—'}
                </p>
              </div>

              {/* Language */}
              <div className="glass border border-white/5 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{t.dashboard.profile.language}</p>
                <p className="text-sm font-semibold text-white leading-snug">
                  {profile?.preferred_language ?? '—'}
                </p>
              </div>
            </div>

            {/* Medical conditions — only shown when present */}
            {profile?.medical_conditions && (
              <div className="mt-3 glass border border-orange-500/15 bg-orange-500/5 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                  {t.dashboard.profile.medicalConditions}
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {formatMedicalCondition(profile.medical_conditions, profile.preferred_language)}
                </p>
              </div>
            )}

            {/* BMI badge — computed client-side when height + weight are present */}
            {profile?.height_cm && profile?.weight_kg && (() => {
              const hm = profile.height_cm / 100
              // FIX: Calculate as NUMBER first, classify, THEN round for display
              const bmiValue = profile.weight_kg / (hm * hm)
              
              // Determine category using UNROUNDED value
              const label =
                bmiValue < 18.5 ? t.dashboard.profile.underweight :
                bmiValue < 25   ? t.dashboard.profile.normalWeight :
                bmiValue < 30   ? t.dashboard.profile.overweight  : t.dashboard.profile.obese
              
              // Round AFTER classification
              const bmi = bmiValue.toFixed(1)
              
              const color =
                bmiValue < 18.5 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                bmiValue < 25   ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                bmiValue < 30   ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                  'text-red-400 bg-red-500/10 border-red-500/20'
              return (
                <div className={`mt-3 inline-flex items-center gap-2 border rounded-xl px-4 py-2 ${color}`}>
                  <HiShieldCheck size={14} />
                  <span className="text-xs font-medium">
                    {t.dashboard.profile.bmi} {bmi} — {label}
                  </span>
                </div>
              )
            })()}
          </div>
        </section>

        {/* ── Stats row ─────────────────────────────────────────────── */}
        <section className="mb-10 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">
            {t.common.welcome.startsWith('W') ? 'Your Stats' : 'உங்கள் புள்ளிவிவரங்கள்'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </section>

        {/* ── Quick actions ─────────────────────────────────────────── */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              {t.dashboard.quickActions.title}
            </h2>
            <span className="text-[10px] text-gray-700 border border-white/5 rounded-full px-2 py-0.5">
              {t.common.welcome.startsWith('W') ? 'Features in development' : 'அம்சங்கள் உருவாக்கத்தில்'}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* ── Start Workout — AUTOMATIC DAY DETECTION ──────── */}
            {currentDay.isRestDay ? (
              // REST DAY CARD (Saturday/Sunday)
              <div className="glass bg-gradient-to-b from-purple-500/20 to-purple-500/5 p-6 rounded-2xl
                              relative overflow-hidden text-left border border-purple-500/20">
                <span className="absolute top-3 right-3 text-[10px] font-semibold
                                 bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full
                                 border border-purple-500/30">
                  {t.dashboard.restDay.title} 🌴
                </span>
                <div className="text-purple-400 mb-4">
                  <span className="text-3xl">😴</span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{t.dashboard.restDay.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  {t.dashboard.restDay.message.replace('{{day}}', t.days[currentDay.dayName.toLowerCase()] || currentDay.dayName)}
                </p>
                <p className="text-[10px] text-purple-400/70 mt-2">
                  {t.dashboard.restDay.nextWorkout
                    .replace('{{day}}', t.days[nextWorkout.dayName.toLowerCase()] || nextWorkout.dayName)
                    .replace('{{count}}', nextWorkout.daysUntil.toString())
                    .replace(nextWorkout.daysUntil > 1 ? '_plural' : '', '')}
                </p>
              </div>
            ) : (
              // WORKOUT DAY CARD (Monday-Friday)
              <button
                onClick={() => setCoachOpen(true)}
                disabled={!todaysWorkout}
                className="glass bg-gradient-to-b from-cyan-500/20 to-cyan-500/5 p-6 rounded-2xl
                           hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden
                           text-left cursor-pointer focus:outline-none focus-visible:ring-2
                           focus-visible:ring-cyan-500/60 group disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t.dashboard.quickActions.todaysWorkout}
              >
                <span className="absolute top-3 right-3 text-[10px] font-semibold
                                 bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full
                                 border border-cyan-500/30">
                  {t.days[currentDay.dayName.toLowerCase()] || currentDay.dayName} ✨
                </span>
                <div className="text-cyan-400 mb-4">
                  <HiLightningBolt size={24} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">
                  {t.dashboard.quickActions.todaysWorkout}
                </h3>
                {todaysWorkout ? (
                  <>
                    <p className="text-xs text-cyan-300 font-medium mb-1">
                      {userGoal} — {todaysWorkout[0]?.muscleGroup}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {t.common.welcome.startsWith('W') 
                        ? '4 exercises · 3 sets each · AI form coach'
                        : '4 பயிற்சிகள் · ஒவ்வொன்றும் 3 sets · AI form coach'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-red-400">
                    {t.common.welcome.startsWith('W')
                      ? 'Please complete your profile first'
                      : 'முதலில் உங்கள் சுயவிவரத்தை முடிக்கவும்'}
                  </p>
                )}
              </button>
            )}

            {/* ── Remaining tiles — Injury Check + Progress Report clickable; Nutrition static */}
            {QUICK_ACTIONS.slice(1).map((a) => (
              a.id === 'injuryCheck' ? (
                <button
                  key={a.title}
                  id="injury-check-tile"
                  onClick={handleInjuryTileClick}
                  className={`glass bg-gradient-to-b ${a.color} p-6 rounded-2xl
                              hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden
                              text-left cursor-pointer focus:outline-none focus-visible:ring-2
                              focus-visible:ring-green-500/60 w-full border border-transparent
                              hover:border-green-500/20`}
                  aria-label={a.title}
                >
                  <div className={`${a.iconCol} mb-4`}>{a.icon}</div>
                  <h3 className="font-semibold text-white text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{a.desc}</p>
                </button>
              ) : a.id === 'progressReport' ? (
                <button
                  key={a.title}
                  id="progress-report-tile"
                  onClick={handleProgressReportClick}
                  className={`glass bg-gradient-to-b ${a.color} p-6 rounded-2xl
                              hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden
                              text-left cursor-pointer focus:outline-none focus-visible:ring-2
                              focus-visible:ring-purple-500/60 w-full border border-transparent
                              hover:border-purple-500/20`}
                  aria-label={a.title}
                >
                  <div className={`${a.iconCol} mb-4`}>{a.icon}</div>
                  <h3 className="font-semibold text-white text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{a.desc}</p>
                </button>
              ) : a.id === 'nutritionPlan' ? (
                <button
                  key={a.title}
                  id="nutrition-plan-tile"
                  onClick={handleNutritionTileClick}
                  className={`glass bg-gradient-to-b ${a.color} p-6 rounded-2xl
                              hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden
                              text-left cursor-pointer focus:outline-none focus-visible:ring-2
                              focus-visible:ring-orange-500/60 w-full border border-transparent
                              hover:border-orange-500/20`}
                  aria-label={a.title}
                >
                  <div className={`${a.iconCol} mb-4`}>{a.icon}</div>
                  <h3 className="font-semibold text-white text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{a.desc}</p>
                </button>
              ) : (
                <ActionTile key={a.title} {...a} />
              )
            ))}
          </div>
        </section>

        {/* ── AI Workout Recommendation ─────────────────────────── */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '0.22s' }}>

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              AI Workout Plan
            </h2>
            {prediction && (
              <span className="text-[10px] text-green-400 border border-green-500/20
                               bg-green-500/10 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active Plan
              </span>
            )}
          </div>

          {/* ── Idle state — CTA button ──────────────────────────── */}
          {!prediction && !predLoading && (
            <div className="glass border border-cyan-500/10 rounded-2xl p-8
                            bg-gradient-to-br from-cyan-500/5 via-transparent to-green-500/5
                            flex flex-col items-center text-center gap-5">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-green-500/20
                              flex items-center justify-center text-3xl
                              shadow-lg shadow-cyan-500/10">
                🤖
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Get Your AI Workout Plan
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Our trained AI model analyses your fitness profile — age, BMI, goal, and
                  experience — to recommend the perfect workout for you.
                </p>
              </div>

              {/* Error message */}
              {predError && (
                <div className="w-full glass border border-red-500/20 bg-red-500/5
                                rounded-xl px-4 py-3 text-sm text-red-400 text-left">
                  ⚠ {predError}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleGetPlan}
                loading={predLoading}
                icon={!predLoading ? <span className="text-base">🤖</span> : null}
                className="min-w-[220px] shadow-xl shadow-cyan-500/20"
              >
                {predLoading ? 'Generating Plan…' : 'Get AI Workout Plan'}
              </Button>
            </div>
          )}

          {/* ── Loading state ─────────────────────────────────────── */}
          {predLoading && (
            <div className="glass border border-cyan-500/10 rounded-2xl p-12
                            flex flex-col items-center gap-5 animate-fade-in">
              {/* Pulsing glow ring */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-cyan-500/10 animate-pulse-slow" />
                <div className="absolute w-28 h-28 rounded-full bg-cyan-500/5  animate-pulse-slow"
                     style={{ animationDelay: '0.5s' }} />
                <Loader size="lg" color="cyan" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Analysing Your Profile…</p>
                <p className="text-xs text-gray-500">
                  The AI model is processing your fitness data
                </p>
              </div>
            </div>
          )}

          {/* ── Result card ───────────────────────────────────────── */}
          {prediction && !predLoading && (
            <WorkoutCard
              result={prediction}
              onRefresh={handleGetPlan}
              loading={predLoading}
            />
          )}

          {/* Error below result (after a failed refresh) */}
          {prediction && predError && !predLoading && (
            <div className="mt-3 glass border border-red-500/20 bg-red-500/5
                            rounded-xl px-4 py-3 text-sm text-red-400">
              ⚠ Refresh failed: {predError}
            </div>
          )}
        </section>

        {/* ── AI Injury Risk Check ──────────────────────────────── */}
        <section ref={injurySectionRef} className="mt-10 animate-fade-in" style={{ animationDelay: '0.24s' }}>

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              🛡️ Injury Risk Check
            </h2>
            {injuryResult && (
              <span className={`text-[10px] border rounded-full px-2.5 py-0.5 flex items-center gap-1
                ${injuryResult.risk_level === 'Low'    ? 'text-green-400 border-green-500/20 bg-green-500/10' :
                  injuryResult.risk_level === 'Medium' ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' :
                  'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {injuryResult.risk_level} Risk
              </span>
            )}
          </div>

          {/* ── Form state ────────────────────────────────────────── */}
          {!injuryResult && (
            <div className="glass border border-green-500/10 rounded-2xl p-6
                            bg-gradient-to-br from-green-500/5 via-transparent to-cyan-500/5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center
                                justify-center text-xl flex-shrink-0">
                  🛡️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Check Injury Risk</h3>
                  <p className="text-xs text-gray-500">
                    Enter your exercise details and joint angles to assess injury risk.
                  </p>
                </div>
              </div>

              {injuryLoading ? (
                /* Loading overlay inside the card */
                <div className="flex flex-col items-center gap-5 py-8 animate-fade-in">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 rounded-full bg-green-500/10 animate-pulse-slow" />
                    <div className="absolute w-28 h-28 rounded-full bg-green-500/5 animate-pulse-slow"
                         style={{ animationDelay: '0.5s' }} />
                    <Loader size="lg" color="green" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold mb-1">Analysing Risk Factors…</p>
                    <p className="text-xs text-gray-500">
                      The AI model is evaluating your joint angles
                    </p>
                  </div>
                </div>
              ) : (
                <InjuryRiskForm
                  fields={injuryFields}
                  onChange={handleInjuryChange}
                  onSubmit={handleInjurySubmit}
                  loading={injuryLoading}
                  error={injuryError}
                  t={t}
                />
              )}
            </div>
          )}

          {/* ── Result card ───────────────────────────────────────── */}
          {injuryResult && !injuryLoading && (
            <InjuryRiskCard
              result={injuryResult}
              onReset={handleInjuryReset}
              onRefresh={handleInjuryRefresh}
              loading={injuryLoading}
              t={t}
            />
          )}

          {/* Refresh loading state (shows while re-running same inputs) */}
          {injuryResult && injuryLoading && (
            <div className="glass border border-green-500/10 rounded-2xl p-10
                            flex flex-col items-center gap-4 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-green-500/10 animate-pulse-slow" />
                <Loader size="lg" color="green" />
              </div>
              <p className="text-white font-semibold">Re-analysing…</p>
            </div>
          )}
        </section>

        {/* ── 🥗 AI Diet Recommendation ──────────────────────────── */}
        <section
          ref={nutritionSectionRef}
          className="mt-10 animate-fade-in"
          style={{ animationDelay: '0.26s' }}
          id="nutrition-section"
        >

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              🥗 AI Diet Recommendation
            </h2>
            {dietResult && (
              <span className="text-[10px] text-green-400 border border-green-500/20
                               bg-green-500/10 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active Plan
              </span>
            )}
          </div>

          {/* ── Idle CTA ──────────────────────────────────────────── */}
          {!dietResult && !dietLoading && (
            <div className="glass border border-green-500/10 rounded-2xl p-8
                            bg-gradient-to-br from-green-500/5 via-transparent to-cyan-500/5
                            flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20
                              flex items-center justify-center text-3xl shadow-lg shadow-green-500/10">
                🥗
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Get Your AI Diet Plan
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Get a personalised Indian diet plan with daily calorie targets, macro
                  breakdown, and a complete meal schedule tailored to your goal.
                </p>
              </div>
              {dietError && (
                <div className="w-full glass border border-red-500/20 bg-red-500/5
                                rounded-xl px-4 py-3 text-sm text-red-400 text-left">
                  ⚠ {dietError}
                </div>
              )}
              <Button
                variant="secondary"
                size="lg"
                onClick={handleGetDiet}
                loading={dietLoading}
                icon={!dietLoading ? <span className="text-base">🥗</span> : null}
                className="min-w-[220px] shadow-xl shadow-green-500/15"
              >
                {dietLoading ? 'Building Diet Plan…' : 'Get AI Diet Plan'}
              </Button>
            </div>
          )}

          {/* ── Loading ───────────────────────────────────────────── */}
          {dietLoading && (
            <div className="glass border border-green-500/10 rounded-2xl p-12
                            flex flex-col items-center gap-5 animate-fade-in">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-green-500/10 animate-pulse-slow" />
                <div className="absolute w-28 h-28 rounded-full bg-green-500/5  animate-pulse-slow"
                     style={{ animationDelay: '0.5s' }} />
                <Loader size="lg" color="green" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-1">Building Your Diet Plan…</p>
                <p className="text-xs text-gray-500">
                  Calculating BMI, BMR, macros and meal schedule
                </p>
              </div>
            </div>
          )}

          {/* ── Result card ───────────────────────────────────────── */}
          {dietResult && !dietLoading && (
            <DietCard
              result={dietResult}
              onRefresh={handleDietRefresh}
              loading={dietLoading}
            />
          )}

          {/* Refresh error */}
          {dietResult && dietError && !dietLoading && (
            <div className="mt-3 glass border border-red-500/20 bg-red-500/5
                            rounded-xl px-4 py-3 text-sm text-red-400">
              ⚠ Refresh failed: {dietError}
            </div>
          )}
        </section>

        {/* ── 📊 Progress Tracking ─────────────────────────────────── */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '0.27s' }}>

          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              📊 Progress Tracking
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowLogForm(v => !v); setProgressError(''); setProgressSuccess('') }}
            >
              {showLogForm ? 'Cancel' : '+ Log Today'}
            </Button>
          </div>

          {/* ── Log form (toggled) ────────────────────────────────── */}
          {showLogForm && (
            <div className="glass border border-cyan-500/10 rounded-2xl p-6
                            bg-gradient-to-br from-cyan-500/5 via-transparent to-green-500/5
                            mb-6 animate-slide-up">
              <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <span>📝</span> Log Today's Progress
              </h3>
              <form onSubmit={handleLogProgress} noValidate>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">

                  {/* Weight */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Weight (kg)</label>
                    <input type="number" name="weight_kg" value={progressForm.weight_kg}
                      onChange={handleProgressFormChange} min="10" max="500" step="0.1"
                      placeholder="e.g. 72.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                 text-white placeholder-gray-500 text-sm focus:outline-none
                                 focus:border-cyan-500/60 transition-all duration-200" />
                  </div>

                  {/* Water */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Water (L)</label>
                    <input type="number" name="water_intake_L" value={progressForm.water_intake_L}
                      onChange={handleProgressFormChange} min="0" max="20" step="0.1"
                      placeholder="e.g. 2.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                 text-white placeholder-gray-500 text-sm focus:outline-none
                                 focus:border-cyan-500/60 transition-all duration-200" />
                  </div>

                  {/* Calories */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Calories (kcal)</label>
                    <input type="number" name="calories_consumed" value={progressForm.calories_consumed}
                      onChange={handleProgressFormChange} min="0" max="15000" step="1"
                      placeholder="e.g. 2100"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                 text-white placeholder-gray-500 text-sm focus:outline-none
                                 focus:border-cyan-500/60 transition-all duration-200" />
                  </div>

                  {/* Sleep */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sleep (hrs)</label>
                    <input type="number" name="sleep_hours" value={progressForm.sleep_hours}
                      onChange={handleProgressFormChange} min="0" max="24" step="0.5"
                      placeholder="e.g. 7.5"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                 text-white placeholder-gray-500 text-sm focus:outline-none
                                 focus:border-cyan-500/60 transition-all duration-200" />
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Notes (optional)</label>
                    <input type="text" name="notes" value={progressForm.notes}
                      onChange={handleProgressFormChange} maxLength={500}
                      placeholder="How did today feel?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                 text-white placeholder-gray-500 text-sm focus:outline-none
                                 focus:border-cyan-500/60 transition-all duration-200" />
                  </div>
                </div>

                {/* Workout completed checkbox */}
                <label className="flex items-center gap-3 cursor-pointer mb-5 group select-none">
                  <div className="relative">
                    <input type="checkbox" name="workout_completed"
                      checked={progressForm.workout_completed}
                      onChange={handleProgressFormChange}
                      className="sr-only peer" />
                    <div className="w-5 h-5 rounded border border-white/20 bg-white/5
                                    peer-checked:bg-cyan-500 peer-checked:border-cyan-500
                                    transition-all duration-200 flex items-center justify-center">
                      {progressForm.workout_completed && (
                        <svg className="w-3 h-3 text-gray-950" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    ✅ Workout completed today
                  </span>
                </label>

                {progressError && (
                  <div className="mb-4 glass border border-red-500/20 bg-red-500/5
                                  rounded-xl px-4 py-3 text-sm text-red-400">
                    ⚠ {progressError}
                  </div>
                )}

                <Button type="submit" variant="primary" size="lg" fullWidth
                  loading={progressLogging}
                  icon={!progressLogging ? <span>💾</span> : null}>
                  {progressLogging ? 'Saving…' : 'Save Progress'}
                </Button>
              </form>
            </div>
          )}

          {/* ── Loading skeleton ──────────────────────────────────── */}
          {progressLoading && !progressStats && (
            <div className="glass border border-white/5 rounded-2xl p-10
                            flex items-center justify-center gap-4">
              <Loader size="md" color="cyan" />
              <p className="text-gray-500 text-sm">Loading progress…</p>
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────── */}
          {!progressLoading && progressStats && progressStats.total_entries === 0 && (
            <div className="glass border border-white/5 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3">📈</p>
              <p className="text-white font-semibold mb-1">No progress logged yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Start logging daily entries to track your fitness journey.
              </p>
              <Button variant="outline" size="sm"
                onClick={() => setShowLogForm(true)}>
                + Log Your First Entry
              </Button>
            </div>
          )}

          {/* ── Stats dashboard ───────────────────────────────────── */}
          {progressStats && progressStats.total_entries > 0 && (
            <div className="space-y-5">

              {/* Top stat chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

                {/* Current weight */}
                <div className="glass border border-cyan-500/15 bg-cyan-500/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Current Weight</p>
                  <p className="text-2xl font-black text-white leading-none">
                    {progressStats.current_weight != null ? `${progressStats.current_weight}` : '—'}
                  </p>
                  {progressStats.current_weight != null && (
                    <p className="text-[10px] text-gray-600 mt-0.5">kg</p>
                  )}
                  {progressStats.weight_change_kg != null && (
                    <p className={`text-xs font-semibold mt-1 ${
                      progressStats.weight_change_kg < 0 ? 'text-green-400' :
                      progressStats.weight_change_kg > 0 ? 'text-orange-400' : 'text-gray-500'
                    }`}>
                      {progressStats.weight_change_kg > 0 ? '+' : ''}{progressStats.weight_change_kg} kg
                    </p>
                  )}
                </div>

                {/* Goal progress */}
                <div className="glass border border-green-500/15 bg-green-500/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Goal Progress</p>
                  <p className="text-2xl font-black text-green-400 leading-none">
                    {progressStats.goal_progress_pct}%
                  </p>
                  <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(progressStats.goal_progress_pct, 100)}%` }} />
                  </div>
                </div>

                {/* Workout streak */}
                <div className="glass border border-orange-500/15 bg-orange-500/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Workout Streak</p>
                  <p className="text-2xl font-black text-orange-400 leading-none">
                    {progressStats.workout_streak}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    days · {progressStats.total_workouts} total
                  </p>
                </div>

                {/* Total entries */}
                <div className="glass border border-purple-500/15 bg-purple-500/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Entries Logged</p>
                  <p className="text-2xl font-black text-purple-400 leading-none">
                    {progressStats.total_entries}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">days tracked</p>
                </div>
              </div>

              {/* Secondary metrics row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass border border-blue-500/15 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Avg Water</p>
                  <p className="text-lg font-bold text-blue-400">
                    {progressStats.avg_water_L != null ? `${progressStats.avg_water_L}L` : '—'}
                  </p>
                  <p className="text-[10px] text-gray-700">per day</p>
                </div>
                <div className="glass border border-indigo-500/15 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Avg Sleep</p>
                  <p className="text-lg font-bold text-indigo-400">
                    {progressStats.avg_sleep_hours != null ? `${progressStats.avg_sleep_hours}h` : '—'}
                  </p>
                  <p className="text-[10px] text-gray-700">per night</p>
                </div>
                <div className="glass border border-yellow-500/15 rounded-2xl p-4 text-center">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Avg Calories</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {progressStats.avg_calories != null ? `${progressStats.avg_calories}` : '—'}
                  </p>
                  <p className="text-[10px] text-gray-700">kcal / day</p>
                </div>
              </div>

              {/* Weight trend chart */}
              {progressStats.weekly_weights && progressStats.weekly_weights.length >= 2 && (
                <WeightChart data={progressStats.weekly_weights} />
              )}

              {/* Prompt to log if 1 entry only */}
              {progressStats.total_entries === 1 && (
                <p className="text-xs text-gray-600 text-center">
                  Log at least 2 weight entries to see your weight trend chart.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Coming-soon banner ────────────────────────────────────── */}
        <section className="mt-10 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="glass border border-cyan-500/10 rounded-2xl p-6
                          bg-gradient-to-r from-cyan-500/5 to-green-500/5
                          flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br
                            from-cyan-500/20 to-green-500/20 flex items-center justify-center">
              <HiSparkles size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">
                Full Platform Coming Soon
              </h3>
              <p className="text-xs text-gray-500">
                AI workout generation, injury prevention analysis, nutrition planning, and
                progress analytics are actively being built. Authentication is complete — stay tuned!
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => toast.info('Full platform launching soon!')}
            >
              Learn More
            </Button>
          </div>
        </section>

      </main>

      {/* ── AI Workout Form Coach modal (portal-style overlay) ── */}
      {coachOpen && todaysWorkout && (
        <WorkoutCoach
          user={user}
          profile={profile}
          workout={todaysWorkout}
          goal={userGoal}
          dayName={currentDay.dayName}
          uiLanguage={uiLanguage}
          langConfig={langConfig}
          onClose={() => setCoachOpen(false)}
        />
      )}

      {/* ── Progress Report modal ─────────────────────────────── */}
      {showProgressReport && (
        <ProgressReportModal
          stats={progressStats}
          history={progressHistory}
          historyLoading={historyLoading}
          onClose={() => setShowProgressReport(false)}
          t={t}
        />
      )}
    </div>
  )
}

export default Dashboard
