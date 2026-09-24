# Debugging Guide — WorkoutCoach Runtime Issues

## Changes Made

### Comprehensive Console Logging Added

I've added extensive console logging throughout the entire workout flow to trace the exact runtime behavior. No functional changes were made—only debugging output.

---

## How to Debug

### 1. Open Browser DevTools Console

```
F12 → Console tab
```

### 2. Start Workout

Click "Start Workout" button.

**Expected console output:**
```
[Dashboard] Start Workout clicked
[Dashboard] Setting coachOpen to true
```

### 3. Complete Voice Check-in

Complete the voice check-in (voice or buttons).

### 4. Start Camera

Click "Turn On Camera & Start".

Camera should open and MediaPipe should start detecting.

### 5. Monitor Rep Counting

**Every MediaPipe frame logs:**
```javascript
[CameraCoach] Frame: {
  kneeAngle: "165.3",
  hipAngle: "178.2",
  state: "UP",
  prevState: "UP",
  repsRef: 0,
  isGoodForm: true
}

[CameraCoach] State machine: { prev: "UP", curr: "UP" }
```

**When you squat down:**
```
[CameraCoach] ✓ Entered DOWN position
```

**When you return to standing:**
```
[CameraCoach] 🎉 REP COMPLETED! DOWN → UP
[CameraCoach] repsRef incremented to: 1
[CameraCoach] Calling setReps with: 1
```

### 6. Perform 5-10 Squats

Watch the console. Each complete squat cycle should log:
```
[CameraCoach] 🎉 REP COMPLETED! DOWN → UP
[CameraCoach] repsRef incremented to: [N]
```

**Check:**
- Does `repsRef` increment every time? (1, 2, 3, 4, 5...)
- Does the UI show the same number?
- Does it stop at 4?

### 7. Click "End Workout"

**Expected console output:**
```
[CameraCoach] handleEnd called
[CameraCoach] Final reps: [N]
[CameraCoach] Cancelling animation frame
[CameraCoach] Stopping camera stream
[CameraCoach] Closing MediaPipe
[CameraCoach] Cancelling speech
[CameraCoach] Calling onEnd with result: { reps: N, goodReps: ..., badReps: ..., duration: ... }
[WorkoutCoach] handleWorkoutEnd called with result: { ... }
[WorkoutCoach] Setting phase to SUMMARY
```

**Summary screen should appear.**

### 8. Click "Close" in Summary

**Expected console output:**
```
[WorkoutSummary] Close button clicked
[WorkoutSummary] Calling onClose
[Dashboard] WorkoutCoach onClose called
[Dashboard] Setting coachOpen to false
[Dashboard] coachOpen should now be false
```

**Dashboard should appear (NOT blank).**

---

## Diagnosis Checklist

### Problem 1: Rep Count Stops at 4

**Check console logs:**

1. **Does `repsRef` continue incrementing past 4?**
   - YES → React state update issue
   - NO → State machine logic issue

2. **Do you see "REP COMPLETED" messages for squats 5, 6, 7?**
   - YES → `setReps()` is being called, but UI not updating
   - NO → State machine not detecting the squats

3. **What is the `state` value when you perform squat 5?**
   - If always "TRANSITION" → threshold problem
   - If stuck at "DOWN" → not detecting return to UP
   - If stuck at "UP" → not detecting squat down

4. **Check knee angle and hip angle values:**
   - Knee angle < 100° → should be DOWN
   - Knee angle > 160° → should be UP
   - Between 100-160° → TRANSITION

### Problem 2: Blank Page After End Workout

**Check console logs:**

1. **Does "Setting phase to SUMMARY" appear?**
   - NO → `handleWorkoutEnd` not being called
   - YES → Continue checking

2. **Does console show any React errors?**
   - Check for red error messages
   - Check for "Cannot read property of undefined"

3. **Does "Dashboard onClose called" appear?**
   - NO → `onClose` not being triggered from WorkoutSummary
   - YES → `setCoachOpen(false)` is being called

4. **After onClose, is Dashboard content visible?**
   - NO, blank page → Dashboard render issue
   - NO, still showing WorkoutCoach → `coachOpen` state not updating

5. **Check Elements tab (F12 → Elements):**
   - Is Dashboard `<main>` element present in DOM?
   - Is WorkoutCoach modal still in DOM?
   - Is `overflow: hidden` still on `<body>`?

---

## Possible Issues & Solutions

### Issue A: repsRef Increments But UI Doesn't Update

**Symptom:**
```
[CameraCoach] repsRef incremented to: 5
[CameraCoach] repsRef incremented to: 6
```
But UI shows: Reps: 4

**Root Cause:** Stale closure in `setReps()`

**Solution:** Already implemented—we use `repsRef.current` directly

**Verify:**
```javascript
setReps(repsRef.current)  // ✅ Correct
// NOT: setReps(reps + 1)  // ❌ Stale closure
```

---

### Issue B: State Machine Stuck

**Symptom:**
```
[CameraCoach] State machine: { prev: "TRANSITION", curr: "TRANSITION" }
```

**Root Cause:** TRANSITION state being stored

**Solution:** Already fixed—TRANSITION is not stored

**Verify:**
The code should only set `squatStateRef.current` to "UP" or "DOWN", never "TRANSITION".

---

### Issue C: Camera Callback Not Running

**Symptom:** No console logs appearing during workout

**Root Cause:** MediaPipe not calling `onResults`

**Check:**
1. Is camera feed visible?
2. Is MediaPipe loaded? (Check Network tab for CDN requests)
3. Are there errors in console?

---

### Issue D: Dashboard Hidden Behind Modal

**Symptom:** Blank page after closing workout

**Root Cause:** CSS z-index or visibility issue

**Check:**
1. F12 → Elements → Look for Dashboard `<main>` element
2. Check computed styles for `display`, `visibility`, `opacity`
3. Check if `overflow: hidden` is still on `<body>`

**Verify cleanup:**
```javascript
useEffect(() => {
  document.body.style.overflow = 'hidden'
  return () => { document.body.style.overflow = '' }  // ✅ Must restore
}, [])
```

---

### Issue E: Modal Not Unmounting

**Symptom:** WorkoutCoach still visible after clicking Close

**Root Cause:** `coachOpen` state not updating

**Check:**
```
[Dashboard] Setting coachOpen to false
```

If this appears but modal is still visible, check:
```javascript
{coachOpen && <WorkoutCoach />}  // ✅ Correct conditional
```

---

## Manual Testing Steps

### Test 1: Rep Counting Accuracy

1. Open WorkoutCoach
2. Start camera
3. Perform **exactly 5 squats** slowly and deliberately
4. Watch console after each squat for "REP COMPLETED"
5. Count how many times "repsRef incremented to: [N]" appears
6. Check UI: Does it show Reps: 5?

**Pass criteria:** Console shows 5 increments, UI shows 5

---

### Test 2: Rep Counting Beyond 4

1. Perform 7 squats
2. Watch console for increments 5, 6, 7
3. Check UI after squat 7

**Pass criteria:** UI shows Reps: 7

---

### Test 3: Hold Position

1. Squat down and hold for 5 seconds
2. Watch console—should NOT see repeated "REP COMPLETED"
3. Stand up—should see ONE "REP COMPLETED"

**Pass criteria:** Exactly 1 rep counted, not multiple

---

### Test 4: End Workout Flow

1. Perform 3 squats
2. Click "End Workout"
3. Watch console for full flow
4. Summary appears with correct rep count
5. Click "Close"
6. Watch console for Dashboard onClose
7. Dashboard appears

**Pass criteria:** Dashboard visible, not blank

---

## Expected Console Output (Full Flow)

```
# Opening Workout
[Dashboard] Start Workout clicked
[Dashboard] Setting coachOpen to true

# Voice Check-in (skipped in this example)

# Starting Camera
[CameraCoach] Starting MediaPipe...

# First Squat
[CameraCoach] Frame: { ..., state: "UP", prevState: "UP", repsRef: 0 }
[CameraCoach] State machine: { prev: "UP", curr: "UP" }
...
[CameraCoach] Frame: { ..., state: "DOWN", prevState: "UP", repsRef: 0 }
[CameraCoach] State machine: { prev: "UP", curr: "DOWN" }
[CameraCoach] ✓ Entered DOWN position
...
[CameraCoach] Frame: { ..., state: "UP", prevState: "DOWN", repsRef: 0 }
[CameraCoach] State machine: { prev: "DOWN", curr: "UP" }
[CameraCoach] 🎉 REP COMPLETED! DOWN → UP
[CameraCoach] repsRef incremented to: 1
[CameraCoach] Calling setReps with: 1

# Second Squat
[CameraCoach] Frame: { ..., state: "DOWN", prevState: "UP", repsRef: 1 }
[CameraCoach] ✓ Entered DOWN position
[CameraCoach] Frame: { ..., state: "UP", prevState: "DOWN", repsRef: 1 }
[CameraCoach] 🎉 REP COMPLETED! DOWN → UP
[CameraCoach] repsRef incremented to: 2
[CameraCoach] Calling setReps with: 2

# ... continues for each squat ...

# Ending Workout
[CameraCoach] handleEnd called
[CameraCoach] Final reps: 5
[CameraCoach] Cancelling animation frame
[CameraCoach] Stopping camera stream
[CameraCoach] Closing MediaPipe
[CameraCoach] Cancelling speech
[CameraCoach] Calling onEnd with result: { reps: 5, goodReps: 4, badReps: 1, duration: 45 }
[WorkoutCoach] handleWorkoutEnd called with result: { reps: 5, ... }
[WorkoutCoach] Setting phase to SUMMARY

# Closing
[WorkoutSummary] Close button clicked
[WorkoutSummary] Calling onClose
[Dashboard] WorkoutCoach onClose called
[Dashboard] Setting coachOpen to false
[Dashboard] coachOpen should now be false
```

---

## Next Steps

1. **Run the app**: `npm run dev`
2. **Open DevTools**: F12 → Console
3. **Start workout and perform squats**
4. **Watch console logs carefully**
5. **Report findings:**
   - Does `repsRef` increment past 4?
   - Does UI update match console?
   - Are there any errors?
   - Does Dashboard appear after closing?

Based on the console output, we can identify the **exact point** where the bug occurs.

---

## Build Status

✅ **npm run build** — SUCCESS

No compile errors. Debugging logs are active in development mode.

---

## Files Modified

1. **frontend/src/components/WorkoutCoach.jsx**
   - Added console logs in `onResults` callback
   - Added console logs in `handleEnd`
   - Added console logs in `handleWorkoutEnd`
   - Added console logs in Close buttons
   - Added console logs for state transitions

2. **frontend/src/pages/Dashboard.jsx**
   - Added console logs for Start Workout button
   - Added console logs in `onClose` handler

---

## Summary

Comprehensive debugging logs have been added to trace:
- Every MediaPipe frame
- State transitions (UP/DOWN/TRANSITION)
- Rep counting logic
- End workout flow
- Modal close flow
- Dashboard state changes

**The logs will reveal the exact runtime behavior and identify where the bugs occur.**

Test the app now and report the console output! 🔍
