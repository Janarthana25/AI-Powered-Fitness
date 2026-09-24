# **PROFILE SYSTEM BUGS — COMPLETE ANALYSIS REPORT**

Generated: Before any code changes
Status: Analysis complete, fixes pending approval

---

## **A. EXACT REASON TAMIL PREFERENCE IS NOT CONSISTENTLY REFLECTED**

### **Root Cause:**
The application **DOES NOT HAVE** a translation/localization system for user-facing text. The `preferred_language` field is:
1. **Stored correctly** in database (`user_profiles.preferred_language`)
2. **Retrieved correctly** by backend API (`GET /profile/me`)
3. **Available in AuthContext** (`profile.preferred_language`)
4. **NEVER USED** by any frontend component to switch UI language

### **Current State:**
- WorkoutCoach.jsx: Hardcoded **ENGLISH ONLY** translations (lines 56-113)
- Dashboard.jsx: All text is **ENGLISH ONLY**
- CompleteProfile.jsx: All labels are **ENGLISH ONLY**
- **NO** translation files exist
- **NO** language context exists
- **NO** localization utilities exist

### **Evidence:**
```javascript
// WorkoutCoach.jsx line 56:
// ─── ENGLISH ONLY TRANSLATIONS ────────────────────────────────────────────────
const T = {
  greeting:         (name) => `Hi ${name}! Ready to start your workout?`,
  eatQuestion:      'When did you last eat?',
  // ... ALL ENGLISH
}
```

### **Why it's not working:**
The preferred_language field is a **database-only setting** with NO UI implementation.

---

## **B. EXACT REASON BMI SHOWS DIFFERENT CATEGORIES**

### **Root Cause: BOUNDARY ERROR IN COMPARISON LOGIC**

There are **TWO DIFFERENT BMI THRESHOLD IMPLEMENTATIONS**:

#### **Implementation 1: CompleteProfile.jsx (line 144-148)**
```javascript
const calcBMI = (h, w) => {
  const hm = parseFloat(h) / 100
  const wk = parseFloat(w)
  const bmi = wk / (hm * hm)
  let label = ''
  if (bmi < 18.5)      label = 'Underweight'
  else if (bmi < 25)   label = 'Normal weight'  // ← CORRECT: < 25
  else if (bmi < 30)   label = 'Overweight'
  else                 label = 'Obese'
  return { value: bmi.toFixed(1), label }
}
```

#### **Implementation 2: Dashboard.jsx (line 1333-1343)**
```javascript
{profile?.height_cm && profile?.weight_kg && (() => {
  const hm  = profile.height_cm / 100
  const bmi = (profile.weight_kg / (hm * hm)).toFixed(1)  // ← ROUNDED FIRST

  const label =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal weight' :  // ← COMPARING ROUNDED STRING
    bmi < 30   ? 'Overweight'  : 'Obese'
```

**THE BUG:**
Dashboard rounds BMI BEFORE classification: `toFixed(1)` returns a **STRING**, not a number.

Example:
- Height: 165 cm, Weight: 68 kg
- Actual BMI: 24.977...
- Dashboard: `"24.98".toFixed(1)` → `"25.0"` (STRING)
- Comparison: `"25.0" < 25` → **FALSE** (string comparison fails)
- Result: **Classified as Overweight** (wrong!)
- CompleteProfile: `24.98 < 25` → **TRUE**
- Result: **Classified as Normal weight** (correct!)

---

## **C. EXACT BMI FORMULAS CURRENTLY USED**

### **Formula (Consistent across all implementations):**
```
BMI = weight_kg / (height_m × height_m)
where height_m = height_cm / 100
```

### **Locations:**
1. **CompleteProfile.jsx** (line 138-149) — Correct implementation
2. **Dashboard.jsx** (line 1331-1343) — **BUGGY** (rounds before classification)
3. **diet_service.py** (line 248-252) — Correct implementation

**All use the same formula, but Dashboard has the comparison bug.**

---

## **D. EXACT BMI THRESHOLDS CURRENTLY USED**

### **Standard WHO Thresholds (Used everywhere):**
```
BMI < 18.5  → Underweight
BMI < 25    → Normal (weight)
BMI < 30    → Overweight
BMI ≥ 30    → Obese
```

**THESE ARE CONSISTENT** across all implementations. The problem is NOT the thresholds — it's the comparison bug in Dashboard.

---

## **E. WHERE BMI IS ROUNDED**

### **1. CompleteProfile.jsx (line 149):**
```javascript
return { value: bmi.toFixed(1), label }
```
- Rounds **AFTER** classification ✅ CORRECT
- Returns rounded value for display only
- Classification uses unrounded value

### **2. Dashboard.jsx (line 1333):**
```javascript
const bmi = (profile.weight_kg / (hm * hm)).toFixed(1)
```
- Rounds **BEFORE** classification ❌ **BUG**
- Uses rounded STRING for comparison
- Causes boundary errors

### **3. diet_service.py (line 250):**
```python
bmi = round(weight / (height_m ** 2), 1)
```
- Rounds **AFTER** classification ✅ CORRECT
- Classification happens first (line 252-256)
- Rounded value returned to frontend

---

## **F. WHETHER BMI IS STORED OR CALCULATED**

### **Answer: CALCULATED (not stored)**

**Database schema (models.py):**
- ✅ Stores: `height_cm` (Float)
- ✅ Stores: `weight_kg` (Float)
- ❌ Does NOT store BMI

**Calculation locations:**
1. **Frontend (CompleteProfile):** Calculates for live preview only
2. **Frontend (Dashboard):** Calculates for profile card display
3. **Backend (diet_service):** Calculates when generating diet plan
4. **Backend prediction service:** Uses height/weight directly (no BMI needed)

**This is CORRECT architecture** — BMI should be derived, not stored.

---

## **G. EXACT MEDICAL CONDITION DATA FLOW**

### **Database:**
```python
# models.py line 56
medical_conditions = Column(String(500), nullable=True)
```
- Stored as free-text string (up to 500 characters)
- No predefined values
- User can type anything: "backpain", "knee injury", etc.

### **API Flow:**
```
User types: "backpain" in CompleteProfile
  ↓
PUT /profile/me → saves to database as-is
  ↓
GET /profile/me → returns: { medical_conditions: "backpain" }
  ↓
AuthContext.profile.medical_conditions = "backpain"
  ↓
Dashboard displays: profile.medical_conditions
```

### **Current Display (Dashboard.jsx line 1319-1327):**
```javascript
{profile?.medical_conditions && (
  <div>
    <p>Medical Conditions</p>
    <p>{profile.medical_conditions}</p>  // ← Shows raw value: "backpain"
  </div>
)}
```

**ISSUE:** No formatting or capitalization.
- User enters: "backpain"
- Dashboard shows: "backpain" (lowercase, no space)
- Should show: "Back pain" (user-friendly)

### **Predefined Values (Injury API only):**
```python
# schemas.py line 375
valid = {"None", "Knee Pain", "Lower Back Pain", "Shoulder Pain"}
```
These are ONLY used for the **Injury Risk API**, NOT for profile storage.

---

## **H. WHETHER AUTHCONTEXT CONTAINS STALE PROFILE DATA**

### **Analysis:**

**AuthContext.jsx (line 64-90):**
```javascript
useEffect(() => {
  if (!token) {
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
    .finally(() => {
      if (!cancelled) setProfileLoading(false)
    })

  return () => { cancelled = true }
}, [token])  // ← RE-FETCHES ONLY WHEN TOKEN CHANGES
```

**THE PROBLEM:**
- Profile is fetched **ONLY** on login (when token changes)
- When user updates profile in CompleteProfile:
  - Calls `setProfile(profileData)` (line 93-95)
  - Updates AuthContext state ✅
  - **BUT:** If user navigates away and back, uses old state
  - **NO** automatic re-fetch on page navigation

**STALE DATA SCENARIO:**
1. Login → profile fetched → AuthContext has profile
2. Edit profile → save → `setProfile()` updates AuthContext ✅
3. Logout
4. Login again → profile fetched from database ✅
5. **Works correctly after login**

**NOT STALE** — just needs refresh on navigation in some cases.

---

## **I. EXACT FILES THAT NEED MODIFICATION**

### **For BMI Bug Fix:**
1. **`frontend/src/pages/Dashboard.jsx`** (line 1331-1343)
   - Fix: Calculate BMI as number, classify, THEN round for display

### **For Language Implementation:**
2. **`frontend/src/utils/translations.js`** (NEW FILE)
   - Create translation dictionary for Tamil/English
   
3. **`frontend/src/components/WorkoutCoach.jsx`** (line 56-113)
   - Replace hardcoded English with translation lookup
   - Keep voice ENGLISH ONLY (do NOT change recognition.lang)

4. **`frontend/src/pages/Dashboard.jsx`** (various lines)
   - Add translation support for UI labels
   - Keep implementation minimal

5. **`frontend/src/pages/CompleteProfile.jsx`** (optional)
   - Add translations for form labels if time permits

### **For Medical Condition Display:**
6. **`frontend/src/pages/Dashboard.jsx`** (line 1325)
   - Add formatting function: "backpain" → "Back pain"

### **For Profile Persistence (already working, no changes needed):**
- ✅ AuthContext.jsx — already correct
- ✅ Backend API — already correct
- ✅ Database — already correct

---

## **J. WHETHER DATABASE CHANGES ARE REQUIRED**

### **Answer: NO DATABASE CHANGES REQUIRED**

**Reasons:**
1. **BMI:** Should remain calculated (not stored) ✅
2. **Language:** Already stored in `user_profiles.preferred_language` ✅
3. **Medical conditions:** Already stored as free-text ✅
4. **Height/Weight:** Already stored correctly ✅

**NO schema changes needed. This is purely a frontend bug fix.**

---

## **K. WHETHER API CHANGES ARE REQUIRED**

### **Answer: NO API CHANGES REQUIRED**

**Reasons:**
1. **Backend BMI calculation** (diet_service.py) is CORRECT
2. **Profile API** (`GET /profile/me`, `PUT /profile/me`) works correctly
3. **Language field** is already returned in API responses
4. **Medical conditions** are already returned as-is

**Backend is functioning correctly. Issues are frontend-only.**

---

## **SUMMARY OF ISSUES**

| Bug | Root Cause | Location | Fix Required |
|-----|-----------|----------|--------------|
| **1. Language not working** | No translation system exists | WorkoutCoach.jsx, Dashboard.jsx | Add minimal translation dictionary + lookup |
| **2. BMI category mismatch** | Comparing rounded STRING instead of number | Dashboard.jsx line 1333 | Calculate → classify → round |
| **3. Medical condition display** | Raw value shown without formatting | Dashboard.jsx line 1325 | Add capitalization/space formatting |
| **4. Profile persistence** | ✅ WORKING CORRECTLY | - | No fix needed |
| **5. Stale AuthContext** | ✅ WORKING CORRECTLY (re-fetches on login) | - | No fix needed |

---

## **PROPOSED FIX STRATEGY**

### **Phase 1: Fix BMI Bug (CRITICAL)**
- Dashboard.jsx: Change line 1333 to calculate as number first
- Test: Height 165cm, Weight 68kg → should show "Normal weight" everywhere

### **Phase 2: Add Minimal Translation System**
- Create `translations.js` with Tamil/English dictionaries
- Update WorkoutCoach.jsx to use translations (KEEP voice English-only)
- Update Dashboard.jsx for key labels only
- DO NOT translate everything — focus on workout/profile areas

### **Phase 3: Format Medical Condition Display**
- Add helper function: `formatMedicalCondition("backpain")` → "Back pain"
- Apply in Dashboard profile card

### **Phase 4: Test & Build**
- Run all 7 test scenarios from user requirements
- Verify build passes
- Verify workout system still works

---

## **VOICE SYSTEM PROTECTION (CRITICAL)**

**MUST REMAIN ENGLISH ONLY:**
```javascript
// VoiceCheckin - DO NOT CHANGE THIS
recognition.lang = 'en-IN'  // ← ALWAYS en-IN
utterance.lang = 'en-IN'    // ← ALWAYS en-IN
```

**Even when `preferred_language = Tamil`:**
- UI text: Can use Tamil ✅
- Voice recognition: ENGLISH ONLY ✅
- Voice synthesis: ENGLISH ONLY ✅

**DO NOT:**
- Add `recognition.lang = 'ta-IN'`
- Add Tamil speech synthesis
- Create language-based voice switching

---

## **NEXT STEPS**

1. ✅ Analysis complete
2. ⏳ Await approval to proceed with fixes
3. ⏳ Implement fixes in order: BMI → Translation → Medical condition
4. ⏳ Test all scenarios
5. ⏳ Build verification

**NO CODE CHANGES MADE YET — AWAITING CONFIRMATION TO PROCEED**
