/**
 * LanguageContext.jsx
 * ═══════════════════════════════════════════════════════════════════════
 * Global Language System for Payirchi Thozhan AI
 *
 * Provides a single source of truth for the selected UI language.
 * Language selection is persisted in localStorage ('pt_ui_lang') so it
 * survives page refreshes and navigations.
 *
 * On first visit (no localStorage value), it initializes from the user's
 * profile preferred_language. If neither is set, defaults to 'English'.
 *
 * Central language config drives:
 *   - UI translations  (via getTranslations())
 *   - SpeechSynthesis  (utterance.lang)
 *   - SpeechRecognition (recognition.lang)
 *
 * Usage:
 *   import { useLanguage } from '../context/LanguageContext'
 *   const { uiLanguage, setUiLanguage, langConfig } = useLanguage()
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// Storage key
const LANG_KEY = 'pt_ui_lang'

// Supported languages
export const SUPPORTED_LANGUAGES = ['Tamil', 'English']

/**
 * LANG_CONFIG - Central language-to-voice configuration.
 * All SpeechSynthesis and SpeechRecognition code reads from here.
 * Never hardcode 'en-IN' or 'ta-IN' elsewhere.
 * These objects are module-level constants — same reference always.
 */
export const LANG_CONFIG = {
  Tamil: {
    ui:                'ta',
    speechRecognition: 'ta-IN',
    speechSynthesis:   'ta-IN',
  },
  English: {
    ui:                'en',
    speechRecognition: 'en-IN',
    speechSynthesis:   'en-IN',
  },
}

const LanguageContext = createContext(null)

export const LanguageProvider = ({ children, profileLanguage }) => {
  const [uiLanguage, setUiLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY)
      if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored
    } catch {}
    if (profileLanguage && SUPPORTED_LANGUAGES.includes(profileLanguage)) {
      return profileLanguage
    }
    return 'English'
  })

  // Sync from profile on first load if nothing stored yet
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY)
      if (!stored && profileLanguage && SUPPORTED_LANGUAGES.includes(profileLanguage)) {
        setUiLanguageState(profileLanguage)
      }
    } catch {}
  }, [profileLanguage])

  const setUiLanguage = useCallback((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return
    try { localStorage.setItem(LANG_KEY, lang) } catch {}
    setUiLanguageState(lang)
  }, [])

  // langConfig points directly to the module-level LANG_CONFIG entry —
  // same object reference when the language hasn't changed. No useMemo needed.
  const langConfig = LANG_CONFIG[uiLanguage] ?? LANG_CONFIG.English

  // Memoize the context value so consumers don't re-render on every parent render.
  const value = useMemo(() => ({
    uiLanguage,
    setUiLanguage,
    langConfig,
    LANG_CONFIG,
    SUPPORTED_LANGUAGES,
  }), [uiLanguage, setUiLanguage, langConfig])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}

export default LanguageContext
