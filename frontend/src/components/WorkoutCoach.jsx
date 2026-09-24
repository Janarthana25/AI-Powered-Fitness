/**
 * WorkoutCoach.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Personal Trainer — Automatic Goal-Based Workout System
 *
 * NEW FEATURES:
 *   - Automatic day detection (Mon-Fri workouts, Sat-Sun rest)
 *   - Goal-based workout plans (4 exercises per day)
 *   - Automatic exercise progression (1 → 2 → 3 → 4)
 *   - 3 sets × 15 reps per exercise (or 3 sets × 30s for time-based)
 *   - 90-second mandatory REST timer between sets
 *   - Camera pause during rest (no accidental reps)
 *   - English voice announcements at each milestone
 *   - Rep-based mode: Squats, Push-ups, etc.
 *   - Time-based mode: Plank, Wall Handstand Hold, etc.
 *
 * Flow:
 *   1. CHECKIN  — Voice check-in (when did you last eat?)
 *   2. READY    — Show today's workout plan preview
 *   3. COACHING — Camera on, rep/time tracking, automatic progression
 *      3a. ACTIVE   — Counting reps or tracking time
 *      3b. REST     — 90s countdown, camera paused
 *      3c. SET_COMPLETE → REST → next set
 *      3d. EXERCISE_COMPLETE → next exercise
 *   4. SUMMARY  — All exercises complete, show stats, save progress
 *
 * MediaPipe is loaded via CDN in index.html — window.Pose is available.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { progressAPI } from '../api/authAPI'
import { formatTime } from '../utils/dateUtils'
import { getTranslations } from '../utils/translations'

// ─── MediaPipe landmark indices (from the Pose solution) ─────────────────────
const MP = {
  LEFT_SHOULDER:  11, RIGHT_SHOULDER: 12,
  LEFT_HIP:       23, RIGHT_HIP:      24,
  LEFT_KNEE:      25, RIGHT_KNEE:     26,
  LEFT_ANKLE:     27, RIGHT_ANKLE:    28,
}

// ─── Squat thresholds (degrees) ───────────────────────────────────────────────
const SQUAT = {
  DOWN_KNEE_ANGLE:    100,
  UP_KNEE_ANGLE:      160,
  MIN_HIP_DEPTH:      110,
  BACK_STRAIGHT_MIN:  160,
  VISIBILITY_THRESH:  0.55,
}

// ─── REST TIMER DURATION (seconds) ────────────────────────────────────────────
const REST_DURATION = 90 // 1 minute 30 seconds

// ─── REMOVED: Hardcoded T object — now using getTranslations() from utils ────

// Helper function to get translation object based on preferred language
const getT = (preferredLanguage) => {
  const t = getTranslations(preferredLanguage)
  return {
    // VoiceCheckin
    greeting:         (name) => t.workout.checkin.greeting.replace('{{name}}', name),
    eatQuestion:      t.workout.checkin.eatQuestion,
    youSaid:          t.workout.checkin.youSaid,
    micDenied:        t.workout.checkin.micError,
    micError:         (e) => `${t.workout.checkin.micFail} ${e}`,
    speakAnswer:      t.workout.checkin.speakAnswer,
    listening:        t.workout.checkin.listening,
    orChoose:         t.workout.checkin.orChoose,
    preparing:        t.workout.checkin.preparing,
    quickAnswers: [
      { label: t.workout.checkin.answers.min30,  mins: 30  },
      { label: t.workout.checkin.answers.hour1,  mins: 60  },
      { label: t.workout.checkin.answers.hour2, mins: 120 },
      { label: t.workout.checkin.answers.hour3,mins: 180 },
    ],
    // READY phase
    readyTitle:       (name) => t.workout.ready.title.replace('{{name}}', name),
    recentlyAte:      t.workout.ready.recentlyAte,
    letsGo:           t.workout.ready.letsGo,
    todaysWorkout:    t.workout.ready.todaysWorkout,
    standBack:        t.workout.ready.standBack,
    startButton:      t.workout.ready.startButton,
    // CameraCoach
    loadingPose:      t.workout.coaching.loadingPose,
    exerciseLabel:    t.workout.coaching.exercise,
    setLabel:         t.workout.coaching.set,
    repsLabel:        t.workout.coaching.reps,
    timeLabel:        t.workout.coaching.time,
    goodLabel:        t.workout.coaching.good,
    fixLabel:         t.workout.coaching.fix,
    restLabel:        t.workout.coaching.rest,
    restComplete:     t.workout.coaching.restComplete,
    endWorkout:       t.workout.coaching.endWorkout,
    // WorkoutSummary
    workoutComplete:  t.workout.summary.complete,
    totalExercises:   t.workout.summary.totalExercises,
    totalSets:        t.workout.summary.totalSets,
    totalReps:        t.workout.summary.totalReps,
    avgFormScore:     t.workout.summary.avgFormScore,
    duration:         t.workout.summary.duration,
    excellentWork:    t.workout.summary.excellentWork,
    goodEffort:       t.workout.summary.goodEffort,
    keepGoing:        t.workout.summary.keepGoing,
    disclaimer:       t.workout.summary.disclaimer,
    saving:           t.workout.summary.saving,
    saveProgress:     t.workout.summary.saveProgress,
    savedProgress:    t.workout.summary.savedProgress,
    close:            t.workout.summary.close,
    // Phase titles
    titleCheckin:     t.workout.phases.checkin,
    titleReady:       t.workout.phases.ready,
    titleCoaching:    t.workout.phases.coaching,
    titleSummary:     t.workout.phases.summary,
  }
}

// ─── Coaching messages (English only) ─────────────────────────────────────────
const getMSGS = (preferredLanguage) => {
  const t = getTranslations(preferredLanguage)
  return {
    goodForm:        t.workout.form.goodForm,
    straightenBack:  t.workout.form.straightenBack,
    lowerHips:       t.workout.form.lowerHips,
    kneeAlignment:   t.workout.form.kneeAlignment,
    chestUp:         t.workout.form.chestUp,
    noDetect:        t.workout.form.noDetect,
    getReady:        t.workout.form.getReady,
    repDone:         t.workout.form.repDone,
  }
}

// ─── Voice response for eat time ──────────────────────────────────────────────
function eatTimeResponse(minutes, lang) {
  const isTamil = lang === 'Tamil' || lang === 'ta' || lang === 'ta-IN'
  if (minutes === null) {
    return isTamil
      ? 'சரி! தொடங்குவதற்கு முன் நீங்கள் வசதியாக இருக்கிறீர்களா என்று உறுதி செய்துகொள்வோம்.'
      : "Okay! Let's make sure you're comfortable before we begin."
  }
  if (minutes <= 30) {
    return isTamil
      ? `${minutes} நிமிடங்களுக்கு முன் சாப்பிட்டீர்கள். மெதுவாக தொடங்குவோம்.`
      : `You ate about ${minutes} minutes ago. Let's keep the start gentle.`
  }
  if (minutes <= 90) {
    return isTamil
      ? `${minutes} நிமிடங்களாகிவிட்டது. சரியான நேரம் — தயாராக இருக்கும் போது தொடங்குவோம்!`
      : `It's been about ${minutes} minutes. That sounds fine - let's begin when you're ready.`
  }
  const hrs = Math.round(minutes / 60 * 10) / 10
  return isTamil
    ? `${hrs} மணி நேரம் ஆகிவிட்டது. தயாராக இருக்கிறீர்கள் — தொடங்குவோம்!`
    : `It's been about ${hrs} hours. You're good to go!`
}

// ─── Parse eat time from voice transcript ─────────────────────────────────────
function parseEatTime(text) {
  const t = text.toLowerCase().trim()

  // Tamil hour: X மணி நேரம் / X மணி
  const tamilHrMatch = t.match(/(\d+)\s*(?:மணி நேரம்|மணி)/)
  if (tamilHrMatch) return Math.round(parseFloat(tamilHrMatch[1]) * 60)

  // Tamil minutes: X நிமிடம் / நிமிடங்கள்
  const tamilMinMatch = t.match(/(\d+)\s*(?:நிமிடம்|நிமிடங்கள்|நிமிட)/)
  if (tamilMinMatch) return parseInt(tamilMinMatch[1], 10)

  // Tamil half hour: அரை மணி
  if (t.includes('அரை மணி')) return 30

  // English hour
  const hourMatch = t.match(/(\d+(?:\.\d+)?)\s*hour/)
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60)
  if (t.includes('an hour') || t.includes('a hour')) return 60
  if (t.includes('half hour') || t.includes('half an hour')) return 30

  // English minutes
  const minMatch = t.match(/(\d+)\s*min/)
  if (minMatch) return parseInt(minMatch[1], 10)

  // Fallback: any number
  const numMatch = t.match(/\b(\d+)\b/)
  if (numMatch) return parseInt(numMatch[1], 10)

  return null
}

// ─── createSpeaker() — Language-aware speech synthesis factory ────────────────
// Returns a speak() function tuned to the given langConfig.
// langConfig = { speechSynthesis: 'ta-IN' | 'en-IN', ... }
// All voice code must use this factory — never hardcode a locale.

let _lastSpokenMsg = ''
let _lastSpokenTime = 0
let _pendingSpeech = null

function createSpeaker(synthLang) {
  return function speak(text, cooldownMs = 4000) {
    if (!text || !window.speechSynthesis) return

    const now = Date.now()
    if (text === _lastSpokenMsg && now - _lastSpokenTime < cooldownMs) {
      console.log('[speak] skipped duplicate:', text.substring(0, 30))
      return
    }

    _lastSpokenMsg  = text
    _lastSpokenTime = now

    if (_pendingSpeech) {
      clearTimeout(_pendingSpeech)
      _pendingSpeech = null
    }
    window.speechSynthesis.cancel()

    console.log('[speak] speaking (' + synthLang + '):', text.substring(0, 50))

    _pendingSpeech = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate   = 0.92
      utterance.volume = 1
      utterance.lang   = synthLang  // from LANG_CONFIG — never hardcoded

      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        const langPrefix = (synthLang || 'en').split('-')[0].toLowerCase()
        // 1. Exact tag match (e.g. ta-IN or ta_IN)
        const exactVoice = voices.find(v => v.lang && v.lang.replace('_', '-').toLowerCase() === synthLang.toLowerCase())
        // 2. Prefix match (e.g. ta, ta-LK, ta-SG)
        const prefixVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix))
        // 3. Name match for Tamil voices (Valluvar, Pallavi, Tamil, தமிழ்)
        const nameVoice = langPrefix === 'ta' ? voices.find(v => {
          const name = (v.name || '').toLowerCase()
          return name.includes('tamil') || name.includes('valluvar') || name.includes('pallavi') || name.includes('தமிழ்')
        }) : null

        const chosenVoice = exactVoice || prefixVoice || nameVoice || null
        if (chosenVoice) {
          utterance.voice = chosenVoice
          console.log('[speak] using voice:', chosenVoice.name, chosenVoice.lang)
        } else if (langPrefix === 'ta') {
          console.warn('[speak] No Tamil voice found in browser! Available voices:', voices.map(v => v.name + ' (' + v.lang + ')'))
        }
      }

      utterance.onerror = (e) => console.warn('[speak] error:', e.error, 'lang:', synthLang)
      utterance.onend   = () => { _pendingSpeech = null }

      window.speechSynthesis.speak(utterance)
    }, 100)
  }
}

// Default speak() for backward compat — will be overridden per component
let speak = createSpeaker('en-IN')

// ─── Utility: angle between three 2-D points ─────────────────────────────────
function angleBetween(A, B, C) {
  const ax = A.x - B.x, ay = A.y - B.y
  const cx = C.x - B.x, cy = C.y - B.y
  const dot  = ax * cx + ay * cy
  const magA = Math.sqrt(ax * ax + ay * ay)
  const magC = Math.sqrt(cx * cx + cy * cy)
  if (magA === 0 || magC === 0) return 0
  const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)))
  return (Math.acos(cosAngle) * 180) / Math.PI
}

function midpoint(A, B) {
  return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
}

function landmarksVisible(lm, indices) {
  return indices.every(i => lm[i] && lm[i].visibility > SQUAT.VISIBILITY_THRESH)
}

// ─── Squat analyser ───────────────────────────────────────────────────────────
// FIXED: Now accepts MSGS as a parameter instead of relying on global scope
function analyseSquat(landmarks, MSGS) {
  const lm = landmarks

  const required = [
    MP.LEFT_HIP, MP.RIGHT_HIP,
    MP.LEFT_KNEE, MP.RIGHT_KNEE,
    MP.LEFT_ANKLE, MP.RIGHT_ANKLE,
    MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER,
  ]

  if (!landmarksVisible(lm, required)) {
    console.log('[analyseSquat] Landmarks not visible')
    return {
      visible: false, kneeAngle: 0, hipAngle: 0, backAngle: 0,
      state: 'TRANSITION', isGoodForm: false,
      feedback: MSGS.noDetect, color: 'red',
    }
  }

  const hip      = midpoint(lm[MP.LEFT_HIP],      lm[MP.RIGHT_HIP])
  const knee     = midpoint(lm[MP.LEFT_KNEE],     lm[MP.RIGHT_KNEE])
  const ankle    = midpoint(lm[MP.LEFT_ANKLE],    lm[MP.RIGHT_ANKLE])
  const shoulder = midpoint(lm[MP.LEFT_SHOULDER], lm[MP.RIGHT_SHOULDER])

  const kneeAngle = angleBetween(hip,      knee,     ankle)
  const hipAngle  = angleBetween(shoulder, hip,      knee)
  const backAngle = angleBetween(hip,      shoulder, { x: shoulder.x, y: shoulder.y - 0.1 })

  let state = 'TRANSITION'
  if (kneeAngle > SQUAT.UP_KNEE_ANGLE)   state = 'UP'
  if (kneeAngle < SQUAT.DOWN_KNEE_ANGLE) state = 'DOWN'

  console.log('[analyseSquat] kneeAngle:', kneeAngle.toFixed(1), 'hipAngle:', hipAngle.toFixed(1), 'backAngle:', backAngle.toFixed(1), 'state:', state)

  const issues = []
  if (hipAngle < SQUAT.MIN_HIP_DEPTH && state !== 'UP') {
    issues.push(MSGS.lowerHips)
  }
  if (backAngle < SQUAT.BACK_STRAIGHT_MIN) {
    issues.push(MSGS.straightenBack)
  }
  const leftKneeX  = lm[MP.LEFT_KNEE].x
  const leftAnkleX = lm[MP.LEFT_ANKLE].x
  if (Math.abs(leftKneeX - leftAnkleX) > 0.08) {
    issues.push(MSGS.kneeAlignment)
  }

  const isGoodForm = issues.length === 0
  const feedback   = isGoodForm ? MSGS.goodForm : issues[0]
  const color      = isGoodForm ? 'green' : 'red'

  console.log('[analyseSquat] isGoodForm:', isGoodForm, 'feedback:', feedback, 'color:', color)

  return { visible: true, kneeAngle, hipAngle, backAngle, state, isGoodForm, feedback, color }
}

// ─── Generic rep analyser (all non-squat rep-based exercises) ─────────────────
// Detects a complete movement cycle using the mid-hip Y coordinate.
// The first BASELINE_FRAMES frames establish the resting (UP) Y position.
// A rep is counted when the body departs past MOTION_THRESH and returns.
// baselineRef: { current: { baseY: number, framesSeen: number } | null }
// Returns the same shape as analyseSquat: { state, isGoodForm, feedback, color }
const GENERIC_BASELINE_FRAMES = 20  // frames to average for resting baseline
const GENERIC_MOTION_THRESH   = 0.04 // normalised Y displacement to enter DOWN
const GENERIC_RETURN_THRESH   = 0.02 // normalised Y displacement to return to UP

function analyseGenericRep(landmarks, baselineRef, MSGS) {
  const lm = landmarks
  // Need hips and shoulders visible
  const required = [MP.LEFT_HIP, MP.RIGHT_HIP, MP.LEFT_SHOULDER, MP.RIGHT_SHOULDER]
  if (!landmarksVisible(lm, required)) {
    return { visible: false, state: 'TRANSITION', isGoodForm: false,
             feedback: MSGS.noDetect, color: 'red' }
  }

  const hipY = midpoint(lm[MP.LEFT_HIP], lm[MP.RIGHT_HIP]).y
  const shoulderY = midpoint(lm[MP.LEFT_SHOULDER], lm[MP.RIGHT_SHOULDER]).y
  // Use shoulder–hip distance to normalise displacement (scale-invariant)
  const bodyLength = Math.abs(hipY - shoulderY) || 0.2

  // ── Establish / update baseline ──────────────────────────────────────────
  if (!baselineRef.current) {
    baselineRef.current = { baseY: hipY, framesSeen: 1, sumY: hipY }
  } else if (baselineRef.current.framesSeen < GENERIC_BASELINE_FRAMES) {
    baselineRef.current.sumY      += hipY
    baselineRef.current.framesSeen += 1
    baselineRef.current.baseY      = baselineRef.current.sumY / baselineRef.current.framesSeen
  }

  const baseY      = baselineRef.current.baseY
  // Displacement in body-length units (positive = hips moved down in screen = lower)
  const displacement = (hipY - baseY) / bodyLength

  // ── State decision ───────────────────────────────────────────────────────
  // For most exercises the working position moves hips DOWN (squats, lunges, push-ups)
  // or UP (mountain climbers, jumping jacks lift the body). We treat EITHER
  // direction of sufficient displacement as the "working" (DOWN) position.
  let state = 'TRANSITION'
  const absDisp = Math.abs(displacement)
  if (absDisp >= GENERIC_MOTION_THRESH)  state = 'DOWN'
  if (absDisp <= GENERIC_RETURN_THRESH)  state = 'UP'

  return {
    visible: true,
    state,
    isGoodForm: true,  // Generic analyser gives good form when body is detected
    feedback: MSGS.goodForm,
    color: 'green',
  }
}

// ─── VoiceCheckin — UI translatable, VOICE ENGLISH ONLY ──────────────────────
const VoiceCheckin = ({ firstName, preferredLanguage, langConfig, onComplete }) => {
  // Memoised translation object — stable across renders unless language changes
  const T = useMemo(() => getT(preferredLanguage), [preferredLanguage])
  // Stable speaker ref — only recreated when synthesis locale changes
  const speakLRef = useRef(createSpeaker(langConfig?.speechSynthesis || 'en-IN'))
  useEffect(() => {
    speakLRef.current = createSpeaker(langConfig?.speechSynthesis || 'en-IN')
  }, [langConfig?.speechSynthesis])
  // Stable wrapper — prevents stale closures in callbacks
  const speakL = useCallback((...args) => speakLRef.current(...args), [])
  const [voiceWarning, setVoiceWarning] = useState('') // Tamil voice unavailability notice
  const [step, setStep] = useState('greeting')
  const [transcript, setTranscript] = useState('')
  const [aiMessage, setAiMessage] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    setVoiceSupported(!!SR)
    if (window.speechSynthesis) {
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const synthLang = langConfig?.speechSynthesis || 'en-IN'
        if (synthLang.startsWith('ta') && voices.length > 0) {
          const hasTamil = voices.some(v => v.lang.startsWith('ta'))
          if (!hasTamil) {
            setVoiceWarning('தமிழ் குரல் இந்த browser-இல் கிடைக்கவில்லை. Device TTS settings-ஐ சோதிக்கவும்.')
          } else {
            setVoiceWarning('')
          }
        }
      }
      window.speechSynthesis.addEventListener('voiceschanged', checkVoices)
      checkVoices()
    }
  }, [langConfig])

  useEffect(() => {
    if (step !== 'greeting') return
    const greeting = T.greeting(firstName)
    setAiMessage(greeting)
    speakL(greeting, 0)
    const t = setTimeout(() => {
      const question = T.eatQuestion
      setAiMessage(question)
      speakL(question, 0)
      setStep('question')
    }, 3000)
    return () => clearTimeout(t)
  // T and speakL are stable refs/memos - intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, firstName])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMicError('Speech recognition not supported in this browser.')
      return
    }
    
    setMicError('')
    setTranscript('')
    
    const recog = new SR()
    recognitionRef.current = recog
    
    recog.continuous = false
    recog.interimResults = false
    // Language follows global LanguageContext — reads from central LANG_CONFIG
    recog.lang = langConfig?.speechRecognition || 'en-IN'

    recog.onstart = () => setIsListening(true)
    recog.onend = () => setIsListening(false)
    
    recog.onerror = (e) => {
      setIsListening(false)
      if (e.error === 'not-allowed') {
        setMicError('Microphone permission denied. Please allow microphone access and try again.')
      } else if (e.error === 'no-speech') {
        const noSpeechMsg = T.noSpeech || 'I couldn\'t hear you. Please try speaking again.'
        setMicError(noSpeechMsg)
        speakL(noSpeechMsg, 0)
        setTimeout(() => setMicError(''), 3000)
      } else {
        setMicError(`Speech recognition error: ${e.error}. Please use the buttons below.`)
      }
    }
    
    recog.onresult = (e) => {
      const resultIndex = e.results.length - 1
      const result = e.results[resultIndex]
      
      if (result.isFinal) {
        const text = result[0].transcript
        setTranscript(text)
        handleVoiceAnswer(text)
      }
    }
    
    try {
      recog.start()
    } catch (err) {
      setMicError('Could not start microphone. Please use the buttons below.')
    }
  }, [])

  const handleVoiceAnswer = useCallback((text) => {
    const mins = parseEatTime(text)
    const resp = eatTimeResponse(mins, preferredLanguage)
    setAiMessage(resp)
    speakL(resp, 0)
    setStep('done')
    setTimeout(() => onComplete(mins), 2500)
  }, [onComplete, speakL])

  const handleButtonAnswer = (mins) => {
    const resp = eatTimeResponse(mins, preferredLanguage)
    setAiMessage(resp)
    speakL(resp, 0)
    setStep('done')
    setTimeout(() => onComplete(mins), 2200)
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch {}
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-green-500/30
                      border-2 border-cyan-500/40 flex items-center justify-center text-4xl
                      shadow-xl shadow-cyan-500/20 animate-pulse-slow">
        🤖
      </div>

      <div className="glass border border-cyan-500/20 rounded-2xl px-6 py-4 max-w-sm">
        <p className="text-white font-medium text-sm leading-relaxed min-h-[2.5rem]">
          {aiMessage || '…'}
        </p>
      </div>

      {transcript && (
        <div className="glass border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-400">
          {T.youSaid} <span className="text-cyan-300">"{transcript}"</span>
        </div>
      )}

      {micError && (
        <div className="glass border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3
                        text-xs text-red-400 max-w-sm text-left">
          ⚠ {micError}
        </div>
      )}

      {voiceWarning && (
        <div className="glass border border-yellow-500/20 bg-yellow-500/5 rounded-xl px-4 py-2
                        text-xs text-yellow-400 max-w-sm text-center">
          🔔 {voiceWarning}
        </div>
      )}

      {step === 'question' && (
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {voiceSupported && (
            <button
              onClick={startListening}
              disabled={isListening}
              className={[
                'flex items-center justify-center gap-2 px-5 py-3 rounded-xl',
                'text-sm font-semibold transition-all duration-200',
                isListening
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25',
              ].join(' ')}
            >
              🎤 {isListening ? T.listening : T.speakAnswer}
            </button>
          )}

          <p className="text-[11px] text-gray-600 uppercase tracking-wider">
            {voiceSupported ? T.orChoose : 'Choose an answer:'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {T.quickAnswers.map(({ label, mins }) => (
              <button
                key={mins}
                onClick={() => handleButtonAnswer(mins)}
                className="glass border border-white/10 hover:border-cyan-500/30
                           rounded-xl px-3 py-2.5 text-xs font-medium text-gray-300
                           hover:text-white transition-all duration-200"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-xs text-gray-500 animate-fade-in">{T.preparing}</div>
      )}
    </div>
  )
}

// ─── CameraCoach — Automatic Exercise Progression ────────────────────────────
const CameraCoach = ({ workout, goal, dayName, preferredLanguage, langConfig, onEnd }) => {
  const T = getT(preferredLanguage) // Get translations for UI
  const MSGS = getMSGS(preferredLanguage) // Get form feedback messages
  // Language-aware speaker stored in a ref — stable across renders, so it
  // does NOT cause handleSetComplete/onResults/useEffect to re-run on each render.
  const speakRef = useRef(createSpeaker(langConfig?.speechSynthesis || 'en-IN'))
  // Update the ref when langConfig changes (e.g. user switches language mid-session)
  useEffect(() => {
    speakRef.current = createSpeaker(langConfig?.speechSynthesis || 'en-IN')
  }, [langConfig?.speechSynthesis])
  // Stable wrapper — always calls the current speaker
  const speak = useCallback((...args) => speakRef.current(...args), [])
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // Workout progression state
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [currentReps, setCurrentReps] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [goodReps, setGoodReps] = useState(0)
  const [badReps, setBadReps] = useState(0)
  
  // Phase state: 'ACTIVE' | 'REST' | 'SET_COMPLETE' | 'EXERCISE_COMPLETE'
  const [phase, setPhase] = useState('ACTIVE')
  const [restTimeLeft, setRestTimeLeft] = useState(REST_DURATION)
  
  // Exercise completion tracking
  const [completedExercises, setCompletedExercises] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [camError, setCamError] = useState('')
  const [feedback, setFeedback] = useState(MSGS.getReady)
  const [feedbackColor, setFeedbackColor] = useState('cyan')

  // Refs for state machine (avoid stale closures in rAF)
  const squatStateRef = useRef('UP')
  const currentRepsRef = useRef(0)
  const goodRepsRef = useRef(0)
  const badRepsRef = useRef(0)
  const repFormGoodFrames = useRef(0)
  const repFormBadFrames = useRef(0)
  const phaseRef = useRef('ACTIVE')
  const currentExerciseIndexRef = useRef(0)
  const currentSetRef = useRef(1)
  // Generic rep analyser baseline (non-squat exercises)
  const genericBaselineRef = useRef(null)
  
  // Time-based tracking
  const timeStartRef = useRef(null)
  const timeIntervalRef = useRef(null)

  const currentExercise = workout[currentExerciseIndex]
  const isTimeBased = currentExercise?.type === 'time'
  const target = currentExercise?.target || 15

  // ── Speak workout start ────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && currentExerciseIndex === 0 && currentSet === 1 && phase === 'ACTIVE') {
      const isTamil = (langConfig?.speechSynthesis || '').startsWith('ta')
      const msg = isTamil
        ? `${dayName} ${currentExercise.muscleGroup} workout தொடங்குகிறது. உடற்பயிற்சி ஒன்று. ${currentExercise.name}. Set ஒன்று. ` + (isTimeBased ? `${target} விநாடிகள் நிறுத்துக.` : `${target} reps.`)
        : `Today's workout is ${dayName} ${currentExercise.muscleGroup}. Exercise one. ${currentExercise.name}. Set one. ` + (isTimeBased ? `Hold for ${target} seconds.` : `${target} reps.`)
      speak(msg, 0)
    }
  }, [loading])

  // ── REST timer countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'REST') return

    const interval = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          // Rest complete
          clearInterval(interval)
          speak((langConfig?.speechSynthesis || '').startsWith('ta') ? 'ஓய்வு முடிந்தது. அடுத்த set-க்கு தயார்.' : 'Rest complete. Ready for the next set.', 0)
          setPhase('ACTIVE')
          phaseRef.current = 'ACTIVE'
          
          // Reset rep counters for next set
          setCurrentReps(0)
          setGoodReps(0)
          setBadReps(0)
          currentRepsRef.current = 0
          goodRepsRef.current = 0
          badRepsRef.current = 0
          repFormGoodFrames.current = 0
          repFormBadFrames.current = 0
          squatStateRef.current = 'UP'
          genericBaselineRef.current = null
          
          // Reset time tracking
          setCurrentTime(0)
          timeStartRef.current = null
          
          // Move to next set
          const nextSet = currentSet + 1
          setCurrentSet(nextSet)
          currentSetRef.current = nextSet
          
          setRestTimeLeft(REST_DURATION)
          
          return REST_DURATION
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [phase, currentSet])

  // ── Time-based exercise timer ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'ACTIVE' || !isTimeBased) return

    // Start timer when phase becomes ACTIVE
    if (!timeStartRef.current) {
      timeStartRef.current = Date.now()
    }

    timeIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timeStartRef.current) / 1000)
      setCurrentTime(elapsed)

      // Check if target time reached
      if (elapsed >= target) {
        clearInterval(timeIntervalRef.current)
        handleSetComplete()
      }
    }, 100)

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
        timeIntervalRef.current = null
      }
    }
  }, [phase, isTimeBased, target])

  // ── Handle set completion ──────────────────────────────────────────────────
  const handleSetComplete = useCallback(() => {
    console.log('[handleSetComplete] Set completed:', currentSet)
    
    const setNum = currentSetRef.current
    
    // Save this set's data
    const setData = {
      set: setNum,
      reps: isTimeBased ? 0 : currentRepsRef.current,
      time: isTimeBased ? target : 0,
      goodReps: goodRepsRef.current,
      badReps: badRepsRef.current,
    }

    // Announce set completion
    speak((langConfig?.speechSynthesis || '').startsWith('ta') ? `சூப்பர்! Set ${setNum} முடிந்தது. ஒரு நிமிடம் முப்பது விநாடி ஓய்வெடுக்கவும்.` : `Great! Set ${setNum} complete. Rest for one minute thirty seconds.`, 0)
    
    // Check if this was the last set
    if (setNum >= 3) {
      // Exercise complete
      console.log('[handleSetComplete] Exercise complete!')
      
      const exerciseData = {
        name: currentExercise.name,
        sets: 3,
        totalReps: isTimeBased ? 0 : currentRepsRef.current,
        totalTime: isTimeBased ? (target * 3) : 0,
        type: currentExercise.type,
      }
      
      setCompletedExercises(prev => [...prev, exerciseData])
      
      // Check if this was the last exercise
      if (currentExerciseIndexRef.current >= workout.length - 1) {
        // All exercises complete!
        speak((langConfig?.speechSynthesis || '').startsWith('ta') ? 'சிறந்த வேலை! இன்றைய workout முடிந்தது!' : 'Great job! You completed today\'s workout.', 0)
        setTimeout(() => {
          const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
          onEnd({
            completedExercises: [...completedExercises, exerciseData],
            duration,
            goal,
            dayName,
          })
        }, 2000)
      } else {
        // Move to next exercise
        const nextIndex = currentExerciseIndexRef.current + 1
        const nextEx = workout[nextIndex]
        
        speak((langConfig?.speechSynthesis || "").startsWith("ta") ? `${currentExercise.name} முடிந்தது. உடற்பயிற்சி ${nextIndex + 1}-க்கு செல்கிறோம். ${nextEx.name}.` : `${currentExercise.name} complete. Moving to exercise ${nextIndex + 1}. ${nextEx.name}.`, 0)
        
        setTimeout(() => {
          setCurrentExerciseIndex(nextIndex)
          currentExerciseIndexRef.current = nextIndex
          setCurrentSet(1)
          currentSetRef.current = 1
          setCurrentReps(0)
          setCurrentTime(0)
          currentRepsRef.current = 0
          goodRepsRef.current = 0
          badRepsRef.current = 0
          setGoodReps(0)
          setBadReps(0)
          squatStateRef.current = 'UP'
          genericBaselineRef.current = null
          timeStartRef.current = null
          setPhase('ACTIVE')
          phaseRef.current = 'ACTIVE'
          
          const isTa = (langConfig?.speechSynthesis || '').startsWith('ta')
          const msg = isTa
            ? `உடற்பயிற்சி ${nextIndex + 1}. ${nextEx.name}. Set ஒன்று. ` + (nextEx.type === 'time' ? `${nextEx.target} விநாடிகள் நிறுத்துக.` : `${nextEx.target} reps.`)
            : `Exercise ${nextIndex + 1} of 4. ${nextEx.name}. Set one. ` + (nextEx.type === 'time' ? `Hold for ${nextEx.target} seconds.` : `${nextEx.target} reps.`)
          speak(msg, 0)
        }, 3000)
      }
    } else {
      // Start REST phase
      setPhase('REST')
      phaseRef.current = 'REST'
      setRestTimeLeft(REST_DURATION)
    }
  }, [currentSet, isTimeBased, target, currentExercise, workout, completedExercises, goal, dayName, onEnd])

  // ── Draw helpers ───────────────────────────────────────────────────────────
  // NOTE: The <video> is now VISIBLE (shows live camera) and the <canvas> is an
  // ABSOLUTE TRANSPARENT OVERLAY that only draws pose landmarks.
  // Draw pose skeleton overlay on canvas.
  // NOTE: We draw the video frame AND skeleton inside one unified mirrored
  // canvas transform so they share the same coordinate space (selfie/mirror).
  const drawPose = useCallback((results, color) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    // ─── Unified mirror: apply ONE ctx transform that covers both the video
    // frame and the skeleton so they occupy the same coordinate space.
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-width, 0)

    // Draw the video frame as background (inside mirrored space)
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, width, height)
    } else {
      // Restore normal space to clear, then re-apply mirror (ctx.clearRect is
      // not affected by transforms but we need a clean approach).
      ctx.restore()
      ctx.clearRect(0, 0, width, height)
      return
    }

    if (!results.poseLandmarks) {
      ctx.restore()
      return
    }

    const drawConnectors = window.drawConnectors
    const drawLandmarks  = window.drawLandmarks
    const POSE_CONNECTIONS = window.POSE_CONNECTIONS

    if (!drawConnectors || !drawLandmarks || !POSE_CONNECTIONS) {
      ctx.restore()
      return
    }

    // Draw skeleton inside the same mirrored canvas transform.
    // drawConnectors/drawLandmarks use normalized coords (0–1) scaled by
    // canvas.width/height internally — they will now mirror correctly.
    const lineColor   = color === 'green' ? '#00C853' : '#ef4444'
    const circleColor = color === 'green' ? '#00E5FF' : '#ff6b6b'

    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: lineColor,
      lineWidth: 2,
    })
    drawLandmarks(ctx, results.poseLandmarks, {
      color: circleColor,
      lineWidth: 1,
      radius: 4,
    })

    ctx.restore()
  }, [])

  // ── On each MediaPipe frame ────────────────────────────────────────────────
  const onResults = useCallback((results) => {
    console.log('[onResults] Callback fired. poseLandmarks:', !!results.poseLandmarks, 'length:', results.poseLandmarks?.length)
    
    // During REST phase, show video feed without skeleton overlay
    if (phaseRef.current === 'REST') {
      if (canvasRef.current && results.image) {
        const ctx = canvasRef.current.getContext('2d')
        const { width, height } = canvasRef.current
        // Draw video frame
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-width, 0)
        ctx.drawImage(results.image, 0, 0, width, height)
        ctx.restore()
      }
      return
    }

    // During ACTIVE phase - only process if rep-based (not time-based)
    const exercise = workout[currentExerciseIndexRef.current]
    console.log('[onResults] Current exercise:', exercise?.name, 'type:', exercise?.type)
    
    if (exercise?.type === 'time') {
      // Time-based: just show pose overlay, no rep counting
      if (results.poseLandmarks) {
        drawPose(results, 'green')
        setFeedback('Hold position')
        setFeedbackColor('cyan')
      } else {
        if (canvasRef.current && results.image) {
          const ctx = canvasRef.current.getContext('2d')
          const { width, height } = canvasRef.current
          ctx.save()
          ctx.scale(-1, 1)
          ctx.translate(-width, 0)
          ctx.drawImage(results.image, 0, 0, width, height)
          ctx.restore()
        }
      }
      return
    }

    // Rep-based exercise: analyze form and count reps
    if (!results.poseLandmarks) {
      console.log('[onResults] No pose landmarks detected')
      setFeedback(MSGS.noDetect)
      setFeedbackColor('orange')
      if (canvasRef.current && results.image) {
        const ctx = canvasRef.current.getContext('2d')
        const { width, height } = canvasRef.current
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-width, 0)
        ctx.drawImage(results.image, 0, 0, width, height)
        ctx.restore()
      }
      return
    }

    console.log('[onResults] Pose landmarks detected:', results.poseLandmarks.length, 'points')
    
    // Log key landmark visibility
    if (results.poseLandmarks.length > 28) {
      const leftKnee = results.poseLandmarks[MP.LEFT_KNEE]
      const rightKnee = results.poseLandmarks[MP.RIGHT_KNEE]
      const leftHip = results.poseLandmarks[MP.LEFT_HIP]
      const rightHip = results.poseLandmarks[MP.RIGHT_HIP]
      console.log('[onResults] Left knee vis:', leftKnee?.visibility?.toFixed(2), 'Right knee vis:', rightKnee?.visibility?.toFixed(2))
      console.log('[onResults] Left hip vis:', leftHip?.visibility?.toFixed(2), 'Right hip vis:', rightHip?.visibility?.toFixed(2))
    }

    // Analyze exercise — squat gets full biomechanical analysis;
    // all other rep-based exercises use the generic movement analyser.
    let analysis
    if (exercise.name.toLowerCase().includes('squat')) {
      console.log('[onResults] Analyzing squat with MSGS:', !!MSGS)
      analysis = analyseSquat(results.poseLandmarks, MSGS)
    } else {
      // Generic rep analyser: detects UP/DOWN from hip Y displacement
      analysis = analyseGenericRep(results.poseLandmarks, genericBaselineRef, MSGS)
    }

    console.log('[onResults] Analysis result:', analysis)

    drawPose(results, analysis.color)
    setFeedback(analysis.feedback)
    setFeedbackColor(analysis.isGoodForm ? 'green' : 'red')

    if (!analysis.isGoodForm) {
      speak(analysis.feedback, 4000)
    }

    // ── Rep counting — all rep-based exercises use the same state machine ──
    if (exercise.type !== 'time') {
      const prev = squatStateRef.current
      const curr = analysis.state


      if (curr === 'DOWN' || prev === 'DOWN') {
        if (analysis.isGoodForm) {
          repFormGoodFrames.current += 1
        } else {
          repFormBadFrames.current += 1
        }
      }

      if (curr === 'DOWN' && prev !== 'DOWN') {
        squatStateRef.current = 'DOWN'
        repFormGoodFrames.current = 0
        repFormBadFrames.current = 0
        if (analysis.isGoodForm) {
          repFormGoodFrames.current = 1
        } else {
          repFormBadFrames.current = 1
        }

      } else if (curr === 'UP' && prev === 'DOWN') {
        squatStateRef.current = 'UP'
        currentRepsRef.current += 1

        const totalFormFrames = repFormGoodFrames.current + repFormBadFrames.current
        const goodFormRatio = totalFormFrames > 0 ? repFormGoodFrames.current / totalFormFrames : 0
        const isRepGood = goodFormRatio >= 0.7

        if (isRepGood) {
          goodRepsRef.current += 1
          setGoodReps(goodRepsRef.current)
        } else {
          badRepsRef.current += 1
          setBadReps(badRepsRef.current)
        }

        setCurrentReps(currentRepsRef.current)
        repFormGoodFrames.current = 0
        repFormBadFrames.current = 0
        speak(MSGS.repDone, 3000)

        if (currentRepsRef.current >= target) {
          handleSetComplete()
        }
      } else if (curr === 'UP' && prev !== 'DOWN') {
        squatStateRef.current = 'UP'
      }
    }
  }, [drawPose, workout, target, handleSetComplete, MSGS, speak, genericBaselineRef])

  // ── Initialize MediaPipe + camera (robust, long-running) ──────────────
  useEffect(() => {
    console.log('[MediaPipe Init] Starting initialization...')
    let cancelled = false
    let pose = null
    let consecutiveErrors = 0

    // Wait until the video element has real pixel dimensions
    const waitForVideoReady = (video) => new Promise((resolve) => {
      if (video.readyState >= 2 && video.videoWidth > 0) { resolve(); return }
      const done = () => { video.removeEventListener('loadeddata', done); resolve() }
      video.addEventListener('loadeddata', done)
      setTimeout(resolve, 8000) // safety: give up waiting after 8 s
    })

    const syncCanvas = (canvas, video) => {
      const w = video.videoWidth  || 640
      const h = video.videoHeight || 480
      if (canvas.width !== w)  canvas.width  = w
      if (canvas.height !== h) canvas.height = h
    }

    const drawRawFrame = (canvas, video) => {
      if (!canvas || !video.videoWidth) return
      try {
        const ctx = canvas.getContext('2d')
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-canvas.width, 0)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      } catch (_) {}
    }

    const init = async () => {
      // 1. Request camera stream
      console.log('[MediaPipe Init] Requesting camera...')
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width:     { ideal: 640 },
            height:    { ideal: 480 },
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        })
        console.log('[MediaPipe Init] Camera stream obtained')
      } catch (err) {
        if (cancelled) return
        console.error('[MediaPipe Init] Camera error:', err)
        setCamError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : `Camera unavailable: ${err.message}`
        )
        setLoading(false)
        return
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream

      // 2. Attach to <video> and wait for real dimensions
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', true)
      video.muted = true
      try { 
        await video.play()
        console.log('[MediaPipe Init] Video element playing')
      } catch (_) {}
      await waitForVideoReady(video)
      console.log('[MediaPipe Init] Video ready. Dimensions:', video.videoWidth, 'x', video.videoHeight)
      if (cancelled) return

      // 3. Init MediaPipe Pose
      console.log('[MediaPipe Init] Checking for window.Pose...')
      const PoseClass = window.Pose
      if (!PoseClass) {
        console.error('[MediaPipe Init] window.Pose NOT FOUND!')
        setCamError('MediaPipe Pose not loaded. Check your internet connection and refresh the page.')
        setLoading(false)
        return
      }
      console.log('[MediaPipe Init] window.Pose found, creating instance...')
      pose = new PoseClass({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      })
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence:  0.5,
      })
      console.log('[MediaPipe Init] Pose configured. Setting onResults callback...')
      pose.onResults(onResults)
      poseRef.current = pose
      console.log('[MediaPipe Init] Pose instance stored in ref')
      if (cancelled) return

      // 4. Size canvas and start the rAF render loop
      const canvas = canvasRef.current
      if (!canvas) return
      syncCanvas(canvas, video)
      setLoading(false)
      startTimeRef.current = Date.now()
      console.log('[MediaPipe Init] Starting render loop...')

      // rAF tick: resilient — NEVER stops on a pose error
      const tick = async () => {
        if (cancelled) return

        syncCanvas(canvas, video)

        if (video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
          try {
            await pose.send({ image: video })
            consecutiveErrors = 0
          } catch (err) {
            consecutiveErrors++
            console.warn('[cam] pose error #' + consecutiveErrors + ':', err?.message)
            drawRawFrame(canvas, video) // fallback: show plain video frame
          }
        } else {
          // Video not ready yet — draw plain frame while waiting
          drawRawFrame(canvas, video)
        }

        rafRef.current = requestAnimationFrame(tick) // always reschedule
      }

      rafRef.current = requestAnimationFrame(tick)
      console.log('[MediaPipe Init] Render loop started')
    }

    init()

    return () => {
      console.log('[MediaPipe Init] Cleanup starting...')
      cancelled = true
      if (rafRef.current)       { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      if (streamRef.current)    { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (poseRef.current)      { poseRef.current.close().catch(() => {}); poseRef.current = null }
      if (timeIntervalRef.current) { clearInterval(timeIntervalRef.current); timeIntervalRef.current = null }
      if (window.speechSynthesis) window.speechSynthesis.cancel()
      console.log('[MediaPipe Init] Cleanup complete')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — camera must only init once; onResults is stable via useCallback

  // ── End workout ───────────────────────────────────────────────────────────
  const handleEnd = () => {
    try {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    } catch (e) {
      console.warn('[CameraCoach] Error cancelling animation frame:', e)
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try {
            t.stop()
          } catch (e) {
            console.warn('[CameraCoach] Error stopping track:', e)
          }
        })
        streamRef.current = null
      }
    } catch (e) {
      console.warn('[CameraCoach] Error stopping camera:', e)
    }

    try {
      if (poseRef.current) {
        poseRef.current.close().catch(() => {})
        poseRef.current = null
      }
    } catch (e) {
      console.warn('[CameraCoach] Error closing pose:', e)
    }

    try {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current)
        timeIntervalRef.current = null
      }
    } catch (e) {
      console.warn('[CameraCoach] Error clearing time interval:', e)
    }

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch (e) {
      console.warn('[CameraCoach] Error cancelling speech:', e)
    }

    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000)
    
    const result = {
      completedExercises,
      duration: Number(durationSec) || 0,
      goal,
      dayName,
      incomplete: true,
    }

    onEnd(result)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (camError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="text-4xl">📷</div>
        <div className="glass border border-red-500/20 bg-red-500/5 rounded-2xl px-6 py-4
                        text-sm text-red-400 max-w-sm">
          {camError}
        </div>
      </div>
    )
  }

  const feedbackBorder =
    feedbackColor === 'green' ? 'border-green-500/30 bg-green-500/5 text-green-300' :
    feedbackColor === 'red'   ? 'border-red-500/30   bg-red-500/5   text-red-300'   :
                                'border-cyan-500/20  bg-cyan-500/5  text-cyan-300'

  return (
    <div className="flex flex-col gap-4">

      {/* ── Workout progress header ────────────────────────────── */}
      <div className="glass border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {T.exerciseLabel} {currentExerciseIndex + 1} / 4
            </p>
            <p className="text-lg font-bold text-white">{currentExercise.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {T.setLabel} {currentSet} / 3
            </p>
            <p className="text-lg font-bold text-cyan-400">
              {isTimeBased ? formatTime(currentTime) : `${currentReps} / ${target}`}
            </p>
          </div>
        </div>
        
        {/* Exercise progress bar */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-500"
            style={{ width: `${((currentExerciseIndex * 3 + currentSet - 1) / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Camera + skeleton overlay ──────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-black"
           style={{ aspectRatio: '4/3' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
          playsInline muted
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          bg-black/80 gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400
                            rounded-full animate-spin" />
            <p className="text-xs text-gray-400">{T.loadingPose}</p>
          </div>
        )}

        {/* REST overlay */}
        {!loading && phase === 'REST' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          bg-black/70 backdrop-blur-sm gap-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{T.restLabel}</p>
            <p className="text-6xl font-black text-orange-400">{formatTime(restTimeLeft)}</p>
            <p className="text-sm text-gray-400">Next: {T.setLabel} {currentSet} / 3</p>
          </div>
        )}

        {/* Live rep counter overlay */}
        {!loading && phase === 'ACTIVE' && (
          <div className="absolute top-3 left-3 glass border border-white/10 rounded-xl
                          px-3 py-2 flex items-center gap-3">
            {!isTimeBased && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-black text-white leading-none">{currentReps}</p>
                  <p className="text-[9px] text-gray-500 uppercase">{T.repsLabel}</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400 leading-none">{goodReps}</p>
                  <p className="text-[9px] text-gray-500 uppercase">{T.goodLabel}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-red-400 leading-none">{badReps}</p>
                  <p className="text-[9px] text-gray-500 uppercase">{T.fixLabel}</p>
                </div>
              </>
            )}
            {isTimeBased && (
              <div className="text-center">
                <p className="text-2xl font-black text-cyan-400 leading-none">{formatTime(currentTime)}</p>
                <p className="text-[9px] text-gray-500 uppercase">{T.timeLabel}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Live feedback banner ───────────────────────────────── */}
      {!loading && phase === 'ACTIVE' && (
        <div className={`glass border rounded-xl px-4 py-3 text-center text-sm font-semibold
                         transition-all duration-300 ${feedbackBorder}`}>
          {feedbackColor === 'green' ? '✅' : '⚠️'} {feedback}
        </div>
      )}

      {/* ── End button ────────────────────────────────────────── */}
      {!loading && (
        <button
          onClick={handleEnd}
          className="w-full py-3 rounded-xl text-sm font-semibold
                     bg-red-500/15 border border-red-500/30 text-red-400
                     hover:bg-red-500/25 transition-all duration-200"
        >
          {T.endWorkout}
        </button>
      )}
    </div>
  )
}

// ─── WorkoutSummary — Show all exercises + stats ─────────────────────────────
const WorkoutSummary = ({ result, preferredLanguage, onClose, onLogProgress }) => {
  const T = getT(preferredLanguage) // Get translations for UI
  
  const { completedExercises = [], duration = 0, goal = '', dayName = '', incomplete = false } = result || {}
  
  const totalSets = completedExercises.length * 3
  const totalReps = completedExercises.reduce((sum, ex) => sum + (ex.totalReps || 0), 0)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  const [logged, setLogged] = useState(false)
  const [logging, setLogging] = useState(false)

  const handleLog = async () => {
    setLogging(true)
    try {
      await onLogProgress()
      setLogged(true)
    } catch {
      // Silent
    } finally {
      setLogging(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-5xl mb-3">{incomplete ? '⏸️' : '🏆'}</div>
        <h3 className="text-xl font-black text-white mb-1">
          {incomplete ? 'Workout Paused' : T.workoutComplete}
        </h3>
        <p className="text-sm text-gray-500">{goal} · {dayName}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-cyan-400 leading-none">{completedExercises.length}</p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase">{T.totalExercises}</p>
        </div>
        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-400 leading-none">{totalSets}</p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase">{T.totalSets}</p>
        </div>
        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-400 leading-none">{totalReps}</p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase">{T.totalReps}</p>
        </div>
        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-gray-500 font-mono">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
          <p className="text-[10px] text-gray-600 mt-1 uppercase">{T.duration}</p>
        </div>
      </div>

      {/* Exercise list */}
      <div className="glass border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Exercises Completed</p>
        <div className="space-y-2">
          {completedExercises.map((ex, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm text-white font-medium">{ex.name}</span>
              </div>
              <span className="text-xs text-gray-500">
                {ex.sets} sets · {ex.type === 'time' ? `${ex.totalTime}s` : `${ex.totalReps} reps`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-gray-700 text-center leading-relaxed">
        {T.disclaimer}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!logged ? (
          <button
            onClick={handleLog}
            disabled={logging}
            className="flex-1 py-3 rounded-xl text-sm font-semibold
                       bg-cyan-500/15 border border-cyan-500/30 text-cyan-300
                       hover:bg-cyan-500/25 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {logging ? T.saving : T.saveProgress}
          </button>
        ) : (
          <div className="flex-1 py-3 rounded-xl text-sm font-semibold text-center
                          bg-green-500/10 border border-green-500/20 text-green-400">
            {T.savedProgress}
          </div>
        )}
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl text-sm font-semibold
                     bg-white/5 border border-white/10 text-gray-300
                     hover:bg-white/10 transition-all duration-200"
        >
          {T.close}
        </button>
      </div>
    </div>
  )
}

// ─── WorkoutCoach (main modal) ────────────────────────────────────────────────
// uiLanguage and langConfig come from LanguageContext via Dashboard.
const WorkoutCoach = ({ user, profile, workout, goal, dayName, uiLanguage, langConfig, onClose }) => {
  const effectiveLang = uiLanguage || profile?.preferred_language || 'English'
  const T = getT(effectiveLang) // UI translations driven by global language context
  
  const [phase, setPhase] = useState('CHECKIN')
  const [minsAgoEat, setMinsAgoEat] = useState(null)
  const [sessionResult, setSessionResult] = useState(null)

  const firstName = user?.full_name?.split(' ')[0] ?? 'Athlete'
  const preferredLanguage = effectiveLang
  const activeLangConfig = langConfig || { speechSynthesis: effectiveLang === 'Tamil' ? 'ta-IN' : 'en-IN', speechRecognition: effectiveLang === 'Tamil' ? 'ta-IN' : 'en-IN' }

  const handleCheckinDone = (mins) => {
    setMinsAgoEat(mins)
    setPhase('READY')
  }

  const handleStartCamera = () => setPhase('COACHING')

  const handleWorkoutEnd = (result) => {
    const safeResult = {
      completedExercises: result?.completedExercises || [],
      duration: Number(result?.duration) || 0,
      goal: result?.goal || goal,
      dayName: result?.dayName || dayName,
      incomplete: result?.incomplete || false,
    }
    setSessionResult(safeResult)
    setPhase('SUMMARY')
  }

  const handleLogProgress = async () => {
    if (!sessionResult) return
    const { completedExercises, duration, incomplete } = sessionResult
    const exerciseList = completedExercises.map(ex => 
      `${ex.name} (${ex.sets} sets, ${ex.type === 'time' ? ex.totalTime + 's' : ex.totalReps + ' reps'})`
    ).join(', ')
    
    await progressAPI.logProgress({
      workout_completed: !incomplete,
      notes: `${goal} · ${dayName} — ${exerciseList} · Duration: ${Math.floor(duration/60)}m ${duration%60}s`,
    })
  }

  const TITLES = {
    CHECKIN:  T.titleCheckin,
    READY:    T.titleReady,
    COACHING: T.titleCoaching,
    SUMMARY:  T.titleSummary,
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-gray-950/90 backdrop-blur-md overflow-y-auto py-6 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI Workout Form Coach"
    >
      <div className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl
                      shadow-2xl shadow-black/60 overflow-hidden animate-slide-up">

        <div className="flex items-center justify-between px-6 py-4
                        border-b border-white/5 bg-gradient-to-r
                        from-cyan-500/10 to-green-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-green-500
                            flex items-center justify-center text-xs font-black text-gray-950">
              PT
            </div>
            <div>
              <p className="text-sm font-bold text-white">{TITLES[phase]}</p>
              <p className="text-[11px] text-gray-500">
                {goal} · {dayName}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                       flex items-center justify-center text-gray-400 hover:text-white
                       transition-all duration-200"
            aria-label="Close workout coach"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-white/5">
          {['CHECKIN','READY','COACHING','SUMMARY'].map((p) => (
            <div
              key={p}
              className={`flex-1 h-1 transition-all duration-500 ${
                p === phase ? 'bg-cyan-500' :
                ['CHECKIN','READY','COACHING','SUMMARY'].indexOf(p) <
                ['CHECKIN','READY','COACHING','SUMMARY'].indexOf(phase)
                  ? 'bg-green-500/60' : 'bg-white/5'
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {phase === 'CHECKIN' && (
            <VoiceCheckin
              firstName={firstName}
              preferredLanguage={preferredLanguage}
              langConfig={activeLangConfig}
              onComplete={handleCheckinDone}
            />
          )}

          {phase === 'READY' && (
            <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-in">
              <div className="text-5xl animate-float">🏋️</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {T.readyTitle(firstName)}
                </h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  {minsAgoEat !== null && minsAgoEat <= 30
                    ? T.recentlyAte
                    : T.letsGo}
                </p>
              </div>
              
              {/* Today's workout preview */}
              <div className="glass border border-cyan-500/20 rounded-2xl p-5 text-left w-full max-w-sm">
                <p className="text-xs text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📅</span> {T.todaysWorkout}
                </p>
                <p className="text-lg font-bold text-white mb-1">{dayName} — {workout[0]?.muscleGroup}</p>
                <div className="space-y-1.5 mt-3">
                  {workout.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="text-cyan-400 font-bold">{i + 1}.</span>
                      <span>{ex.name}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-gray-500">
                        {ex.type === 'time' ? `${ex.target}s hold` : `${ex.target} reps`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 max-w-sm">
                {T.standBack}
              </p>

              <button
                onClick={handleStartCamera}
                className="px-8 py-4 rounded-xl text-sm font-bold
                           bg-gradient-to-r from-cyan-500 to-cyan-400
                           text-gray-950 shadow-lg shadow-cyan-500/30
                           hover:from-cyan-400 hover:to-cyan-300
                           hover:scale-[1.02] transition-all duration-200"
              >
                {T.startButton}
              </button>
            </div>
          )}

          {phase === 'COACHING' && (
            <CameraCoach
              workout={workout}
              goal={goal}
              dayName={dayName}
              preferredLanguage={preferredLanguage}
              langConfig={activeLangConfig}
              onEnd={handleWorkoutEnd}
            />
          )}

          {phase === 'SUMMARY' && sessionResult && (
            <WorkoutSummary
              result={sessionResult}
              preferredLanguage={preferredLanguage}
              onClose={onClose}
              onLogProgress={handleLogProgress}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkoutCoach
