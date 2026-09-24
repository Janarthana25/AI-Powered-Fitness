# WorkoutCoach Language & Speech Fix — Complete Report

## Files Changed

### 1. `frontend/src/components/WorkoutCoach.jsx`
Complete language and speech recognition fixes

### 2. `frontend/src/pages/Dashboard.jsx`  
Already passes both `user` and `profile` props (no changes needed)

---

## Root Causes Found

### 1. **SpeechRecognition Always Using English**
- **Problem**: `recog.lang = 'en-IN'` was hardcoded in VoiceCheckin
- **Fix**: Now uses `recog.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN'`

### 2. **Stale Language Closures**
- **Problem**: Language state captured in closures became stale in callbacks
- **Fix**: Added `langRef` using `useRef` to always access current language

### 3. **No Manual Language Selection**
- **Problem**: Users couldn't manually choose language before starting
- **Fix**: Added EN/த language toggle in modal header

### 4. **Language Auto-Detection Override Issue**
- **Problem**: Auto-detection would override manual user selection
- **Fix**: Added `manualLangSet` flag — auto-detection only works when user hasn't manually selected

### 5. **Speech Synthesis Duplicate/Stale Speech**
- **Problem**: React re-renders and HMR caused duplicate speech, old language speech after switching
- **Fix**: Enhanced `speak()` with:
  - Language-aware cache key: `${lang}:${text}`
  - `_pendingSpeech` timeout to prevent race conditions
  - Voice selection from available voices
  - 100ms delay before speaking to avoid cancel/speak conflicts

### 6. **No-Speech Error Handling**
- **Problem**: `no-speech` error treated as fatal, no retry option
- **Fix**: 
  - Friendly bilingual message on `no-speech`
  - Error clears after 3s so user can retry
  - No infinite restart loop

### 7. **Profile Language Field Access**
- **Problem**: Code tried `user.preferred_language` but it's in `profile.preferred_language`
- **Fix**: Already fixed — now reads `profile?.preferred_language`

### 8. **Speech Synthesis Language Selection**
- **Problem**: No voice matching, relied on browser default
- **Fix**: Now searches `speechSynthesis.getVoices()` for matching voice

### 9. **VoiceCheckin Didn't React to Lang Changes**
- **Problem**: VoiceCheckin component didn't update when parent lang changed
- **Fix**: Added `useEffect` to update AI message when lang changes during question step

### 10. **CameraCoach Used Stale Language**
- **Problem**: `onResults` callback captured initial `lang` prop
- **Fix**: Added `langRef` in CameraCoach, uses current language for all feedback

---

## Implementation Details

### Language State Management

```javascript
// WorkoutCoach main component
const profileLang = profile?.preferred_language?.toLowerCase() === 'tamil' ? 'ta' : 'en'
const [language, setLanguage] = useState(profileLang)
const [manualLangSet, setManualLangSet] = useState(false)
const langRef = useRef(language)
langRef.current = language
```

### Manual Language Selection

```javascript
const handleManualLangChange = (newLang) => {
  setLanguage(newLang)
  setManualLangSet(true)
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel() // Stop any ongoing speech
  }
}
```

### Auto Language Detection (Respects Manual Selection)

```javascript
const handleLangDetected = (detectedLang) => {
  if (!manualLangSet) {
    setLanguage(detectedLang === 'mixed' ? 'ta' : detectedLang)
  }
}
```

### SpeechRecognition Setup

```javascript
recog.continuous = false
recog.interimResults = false
recog.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN'

recog.onerror = (e) => {
  if (e.error === 'no-speech') {
    const noSpeechMsg = currentLang === 'ta' 
      ? 'குரல் கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்.'
      : 'I couldn\'t hear you. Please try again.'
    setMicError(noSpeechMsg)
    speak(noSpeechMsg, 0, currentLang)
    setTimeout(() => setMicError(''), 3000) // Clear after 3s
  }
}
```

### Enhanced speak() Function

```javascript
function speak(text, cooldownMs = 4000, lang = 'en') {
  const langKey = (lang === 'ta' || lang === 'mixed') ? 'ta' : 'en'
  const cacheKey = `${langKey}:${text}`
  
  // Skip duplicate
  if (cacheKey === _lastSpokenMsg && now - _lastSpokenTime < cooldownMs) return
  
  // Cancel previous
  window.speechSynthesis.cancel()
  
  // Small delay to avoid race condition
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langKey === 'ta' ? 'ta-IN' : 'en-IN'
    
    // Find matching voice
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang.startsWith(langKey === 'ta' ? 'ta' : 'en'))
    if (voice) utterance.voice = voice
    
    window.speechSynthesis.speak(utterance)
  }, 100)
}
```

### Language Selector UI

Added in modal header:
```jsx
<div className="flex items-center gap-1 glass border border-white/10 rounded-lg p-1">
  <button onClick={() => handleManualLangChange('en')} 
          className={language === 'en' ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-500'}>
    EN
  </button>
  <button onClick={() => handleManualLangChange('ta')}
          className={language === 'ta' ? 'bg-cyan-500/30 text-cyan-300' : 'text-gray-500'}>
    த
  </button>
</div>
```

---

## Testing Instructions

### Run the Frontend

```powershell
cd "C:\Users\ELCOT\Desktop\பயிற்சித் தோழன் AI\frontend"
npm run dev
```

Open browser to `http://localhost:5173`

### Run the Backend

```powershell
cd "C:\Users\ELCOT\Desktop\பயிற்சித் தோழன் AI\backend"
uvicorn main:app --reload
```

---

## Test Checklist

### ✅ TEST 1: Profile Language Tamil → Tamil UI

**Steps:**
1. Ensure profile `preferred_language = "Tamil"` in database
2. Login
3. Open Dashboard → click "Start Workout"

**Expected:**
- Console shows: `profile.preferred_language: Tamil`, `language state: ta`
- VoiceCheckin greeting in Tamil
- AI speaks Tamil
- All buttons show Tamil text
- Language toggle shows "த" highlighted

**Verify:**
- [ ] Console logs correct
- [ ] UI displays Tamil
- [ ] Speech is Tamil
- [ ] Microphone button says "பேசி பதில் சொல்லுங்கள்"

---

### ✅ TEST 2: Profile Language English → English UI

**Steps:**
1. Update profile `preferred_language = "English"` in database
2. Logout and login again
3. Open Dashboard → click "Start Workout"

**Expected:**
- Console shows: `profile.preferred_language: English`, `language state: en`
- VoiceCheckin greeting in English
- AI speaks English
- All buttons show English text
- Language toggle shows "EN" highlighted

**Verify:**
- [ ] Console logs correct
- [ ] UI displays English
- [ ] Speech is English
- [ ] Microphone button says "Speak your answer"

---

### ✅ TEST 3: Manual Switch Tamil → English

**Steps:**
1. Start with profile language = Tamil
2. Open WorkoutCoach (should be in Tamil)
3. Click "EN" button in header

**Expected:**
- Language immediately switches to English
- Any ongoing Tamil speech stops
- Next AI message is in English
- All UI text becomes English
- Microphone recognition uses `en-IN`
- Speech synthesis uses English voice

**Verify:**
- [ ] UI switches immediately
- [ ] Speech stops and restarts in English
- [ ] `manualLangSet` prevents auto-detection override
- [ ] SpeechRecognition lang = `en-IN`

---

### ✅ TEST 4: Manual Switch English → Tamil

**Steps:**
1. Start with profile language = English
2. Open WorkoutCoach (should be in English)
3. Click "த" button in header

**Expected:**
- Language immediately switches to Tamil
- Any ongoing English speech stops
- Next AI message is in Tamil
- All UI text becomes Tamil
- Microphone recognition uses `ta-IN`
- Speech synthesis uses Tamil voice

**Verify:**
- [ ] UI switches immediately
- [ ] Speech stops and restarts in Tamil
- [ ] `manualLangSet` prevents profile language override
- [ ] SpeechRecognition lang = `ta-IN`

---

### ✅ TEST 5: Tamil Voice Recognition

**Steps:**
1. Set language to Tamil (manually or via profile)
2. Click microphone button
3. Speak Tamil sentence: "முப்பது நிமிடம் முன்பு சாப்பிட்டேன்" (30 minutes ago I ate)

**Expected:**
- Recognition uses `ta-IN`
- Transcript appears: shows Tamil text
- Language detection confirms Tamil
- AI responds in Tamil
- Conversation continues in Tamil

**Verify:**
- [ ] Console shows `recognition.lang: ta-IN`
- [ ] Transcript displays Tamil script
- [ ] Detected language: `ta`
- [ ] Response speech is Tamil
- [ ] Next phase (READY) shows Tamil text

---

### ✅ TEST 6: English Voice Recognition

**Steps:**
1. Set language to English (manually or via profile)
2. Click microphone button
3. Speak English sentence: "I ate one hour ago"

**Expected:**
- Recognition uses `en-IN`
- Transcript appears: shows English text
- Language detection confirms English
- AI responds in English
- Conversation continues in English

**Verify:**
- [ ] Console shows `recognition.lang: en-IN`
- [ ] Transcript displays English text
- [ ] Detected language: `en`
- [ ] Response speech is English
- [ ] Next phase (READY) shows English text

---

### ✅ TEST 7: No-Speech Error Handling

**Steps:**
1. Set language to Tamil or English
2. Click microphone button
3. Wait without speaking (trigger `no-speech` error)

**Expected:**
- Friendly error message appears:
  - Tamil: "குரல் கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்."
  - English: "I couldn't hear you. Please try again."
- AI speaks the error message
- Error clears after 3 seconds
- User can click microphone again to retry
- No infinite recognition restart loop

**Verify:**
- [ ] Error message displays correctly
- [ ] AI speaks error message
- [ ] Error disappears after 3s
- [ ] Can retry without page refresh
- [ ] No console errors

---

### ✅ TEST 8: Camera Workout in Tamil

**Steps:**
1. Set language to Tamil
2. Complete voice check-in in Tamil
3. Click "கேமராவை இயக்கி தொடங்குங்கள்"
4. Allow camera access
5. Do squats

**Expected:**
- All camera phase UI in Tamil
- Feedback messages in Tamil: "சூப்பர்! சரியாக செய்கிறீர்கள்"
- Rep counter labels in Tamil: "Reps", "சரி", "சரிசெய்"
- AI speaks Tamil feedback
- Rep completion spoken in Tamil: "ஒரு Rep முடிந்தது!"
- End button: "Workout முடிக்கவும்"

**Verify:**
- [ ] Camera starts successfully
- [ ] Pose detection works
- [ ] Feedback text is Tamil
- [ ] Feedback speech is Tamil
- [ ] Rep counting works
- [ ] Summary shows Tamil text

---

### ✅ TEST 9: Camera Workout in English

**Steps:**
1. Set language to English
2. Complete voice check-in in English
3. Click "Turn On Camera & Start"
4. Allow camera access
5. Do squats

**Expected:**
- All camera phase UI in English
- Feedback messages in English: "Good form!"
- Rep counter labels in English: "Reps", "Good", "Fix"
- AI speaks English feedback
- Rep completion spoken in English: "Rep completed!"
- End button: "End Workout"

**Verify:**
- [ ] Camera starts successfully
- [ ] Pose detection works
- [ ] Feedback text is English
- [ ] Feedback speech is English
- [ ] Rep counting works
- [ ] Summary shows English text

---

### ✅ TEST 10: Auto Language Detection (No Manual Selection)

**Steps:**
1. Profile language = Tamil
2. Open WorkoutCoach (starts in Tamil)
3. Do NOT manually click EN/த button
4. Click microphone
5. Speak in English: "I ate two hours ago"

**Expected:**
- Recognition starts with `ta-IN` (from profile)
- Detects English from transcript
- Language switches to `en`
- UI updates to English
- Response is in English
- Subsequent phases use English

**Verify:**
- [ ] Initial lang: `ta`
- [ ] Detected lang: `en`
- [ ] Language switches automatically
- [ ] UI updates immediately
- [ ] Speech changes to English

---

### ✅ TEST 11: Manual Selection Prevents Auto-Detection

**Steps:**
1. Profile language = Tamil
2. Open WorkoutCoach (starts in Tamil)
3. Manually click "EN" button
4. Click microphone
5. Speak in Tamil

**Expected:**
- Language stays `en` (manual selection has priority)
- Recognition uses `en-IN`
- May not understand Tamil well (expected)
- Does NOT switch to Tamil automatically
- User must manually click "த" to switch

**Verify:**
- [ ] Language remains English
- [ ] Console shows "language manually set - ignoring detection"
- [ ] UI stays English
- [ ] No automatic switch

---

### ✅ TEST 12: Speech Synthesis Deduplication

**Steps:**
1. Open WorkoutCoach
2. Wait for greeting speech
3. Quickly click EN/த button multiple times
4. Observe console and audio

**Expected:**
- Only one speech plays at a time
- Previous speech cancels when new speech starts
- Console shows: `[speak] skipped duplicate:` for same message
- No overlapping audio
- No stale language speech after switching

**Verify:**
- [ ] Only one voice at a time
- [ ] No audio overlap
- [ ] Console shows duplicate prevention
- [ ] Smooth language switching

---

### ✅ TEST 13: Microphone Permission Denied

**Steps:**
1. In browser settings, block microphone for localhost
2. Open WorkoutCoach
3. Click microphone button

**Expected:**
- Error message appears:
  - Tamil: "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது..."
  - English: "Microphone permission denied..."
- Quick-answer buttons remain available
- User can continue with button clicks
- No crash

**Verify:**
- [ ] Error message displays
- [ ] Buttons work as fallback
- [ ] Workflow continues
- [ ] No console errors

---

### ✅ TEST 14: Complete Workflow Tamil

**End-to-end test:**
1. Profile language = Tamil
2. Open WorkoutCoach → Tamil UI
3. Voice check-in in Tamil
4. Camera workout → Tamil feedback
5. Complete workout
6. Summary → Tamil text
7. Save to progress

**Verify:**
- [ ] Every phase uses Tamil
- [ ] All speech is Tamil
- [ ] No English text appears
- [ ] Progress saves successfully

---

### ✅ TEST 15: Complete Workflow English

**End-to-end test:**
1. Profile language = English
2. Open WorkoutCoach → English UI
3. Voice check-in in English
4. Camera workout → English feedback
5. Complete workout
6. Summary → English text
7. Save to progress

**Verify:**
- [ ] Every phase uses English
- [ ] All speech is English
- [ ] No Tamil text appears
- [ ] Progress saves successfully

---

## Debug Console Logs

The fixed code includes comprehensive logging. Open browser DevTools Console and look for:

```
[WorkoutCoach] profile.preferred_language: Tamil
[WorkoutCoach] profileLang computed: ta
[WorkoutCoach] language state: ta
[VoiceCheckin] received lang prop: ta
[VoiceCheckin] T.greeting: வணக்கம் Janarthanan! workout ஆரம்பிக்க...
[speak] speaking in ta : வணக்கம் Janarthanan! workout ஆரம்பிக்க...
[VoiceCheckin] starting recognition with lang: ta
[VoiceCheckin] recognition.lang set to: ta-IN
[VoiceCheckin] recognition started
[VoiceCheckin] transcript: முப்பது நிமிடம் முன்பு
[VoiceCheckin] detected language: ta
[VoiceCheckin] handleVoiceAnswer with lang: ta
```

---

## Known Behavior (Not Bugs)

### 1. **Voice Quality**
- Tamil voice quality depends on browser and OS
- Windows may have better Tamil voices than some browsers
- English voice should be available on all platforms

### 2. **Recognition Accuracy**
- Tamil recognition accuracy varies by accent and pronunciation
- May work better with clear, standard Tamil pronunciation
- English recognition is generally more accurate

### 3. **Mixed Language (Tanglish)**
- Code treats "mixed" as Tamil for UI purposes
- Users speaking Tanglish get Tamil UI
- This is intentional design choice

### 4. **Voice Cooldown**
- Same message won't repeat within 4 seconds
- This prevents annoying repetition during rep counting
- Different messages can be spoken immediately

---

## Summary

### What Was Fixed

1. ✅ SpeechRecognition now uses correct language (`ta-IN` or `en-IN`)
2. ✅ Manual language selection with EN/த toggle
3. ✅ Manual selection prevents auto-detection override
4. ✅ Stale closure issues fixed with `langRef`
5. ✅ Speech synthesis enhanced with deduplication and voice selection
6. ✅ No-speech error handled gracefully
7. ✅ Profile language correctly read from `profile.preferred_language`
8. ✅ All UI text uses TRANSLATIONS[lang]
9. ✅ All speech uses correct language
10. ✅ Camera coach uses current language for all feedback

### What Was NOT Changed

- ❌ Camera/video/canvas logic
- ❌ MediaPipe pose detection
- ❌ Squat counting algorithm
- ❌ Rep tracking logic
- ❌ UI layout and styling
- ❌ Workout phases (CHECKIN → READY → COACHING → SUMMARY)
- ❌ Other Dashboard features
- ❌ Backend API

---

## Next Steps

1. Test all 15 test cases above
2. If any test fails, check console logs for the exact issue
3. Verify both Tamil and English voices are working in your browser
4. Test on different browsers if needed (Chrome recommended)
5. If Tamil voice is not available, browser may use default voice — this is OS/browser limitation

**The code is now ready for testing!** 🚀
