/**
 * WorkoutPlans.js
 * ================
 * Complete workout plan definitions for both fitness goals.
 * 
 * Structure:
 *   WORKOUT_PLANS[goal][day] = [exercise1, exercise2, exercise3, exercise4]
 * 
 * Exercise object:
 *   {
 *     name: string       - display name
 *     type: 'reps'|'time' - rep-based or time-based
 *     sets: number       - always 3
 *     target: number     - 15 reps OR 30 seconds
 *     muscleGroup: string - for display/organization
 *   }
 */

export const WORKOUT_PLANS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // MUSCLE GAIN PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  "Muscle Gain": {
    Monday: [
      { name: "Push-ups",          type: "reps", sets: 3, target: 15, muscleGroup: "Chest" },
      { name: "Wide Push-ups",     type: "reps", sets: 3, target: 15, muscleGroup: "Chest" },
      { name: "Incline Push-ups",  type: "reps", sets: 3, target: 15, muscleGroup: "Chest" },
      { name: "Diamond Push-ups",  type: "reps", sets: 3, target: 15, muscleGroup: "Chest" },
    ],
    Tuesday: [
      { name: "Superman",                type: "reps", sets: 3, target: 15, muscleGroup: "Back" },
      { name: "Reverse Snow Angels",     type: "reps", sets: 3, target: 15, muscleGroup: "Back" },
      { name: "Bird Dog",                type: "reps", sets: 3, target: 15, muscleGroup: "Back" },
      { name: "Prone Y-T-W Raises",      type: "reps", sets: 3, target: 15, muscleGroup: "Back" },
    ],
    Wednesday: [
      { name: "Bodyweight Squats", type: "reps", sets: 3, target: 15, muscleGroup: "Legs" },
      { name: "Reverse Lunges",    type: "reps", sets: 3, target: 15, muscleGroup: "Legs" },
      { name: "Glute Bridges",     type: "reps", sets: 3, target: 15, muscleGroup: "Legs" },
      { name: "Calf Raises",       type: "reps", sets: 3, target: 15, muscleGroup: "Legs" },
    ],
    Thursday: [
      { name: "Pike Push-ups",       type: "reps", sets: 3, target: 15, muscleGroup: "Shoulders" },
      { name: "Shoulder Taps",       type: "reps", sets: 3, target: 15, muscleGroup: "Shoulders" },
      { name: "Arm Circles",         type: "reps", sets: 3, target: 15, muscleGroup: "Shoulders" },
      { name: "Wall Handstand Hold", type: "time", sets: 3, target: 30, muscleGroup: "Shoulders" },
    ],
    Friday: [
      { name: "Diamond Push-ups",       type: "reps", sets: 3, target: 15, muscleGroup: "Arms" },
      { name: "Triceps Dips (Chair)",   type: "reps", sets: 3, target: 15, muscleGroup: "Arms" },
      { name: "Biceps Isometric Hold",  type: "time", sets: 3, target: 30, muscleGroup: "Arms" },
      { name: "Close-grip Push-ups",    type: "reps", sets: 3, target: 15, muscleGroup: "Arms" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHT LOSS PLAN
  // ═══════════════════════════════════════════════════════════════════════════
  "Weight Loss": {
    Monday: [
      { name: "Jumping Jacks",      type: "reps", sets: 3, target: 15, muscleGroup: "Full Body" },
      { name: "Bodyweight Squats",  type: "reps", sets: 3, target: 15, muscleGroup: "Full Body" },
      { name: "Mountain Climbers",  type: "reps", sets: 3, target: 15, muscleGroup: "Full Body" },
      { name: "Burpees",            type: "reps", sets: 3, target: 15, muscleGroup: "Full Body" },
    ],
    Tuesday: [
      { name: "Jump Squats",     type: "reps", sets: 3, target: 15, muscleGroup: "Legs + Cardio" },
      { name: "Reverse Lunges",  type: "reps", sets: 3, target: 15, muscleGroup: "Legs + Cardio" },
      { name: "High Knees",      type: "reps", sets: 3, target: 15, muscleGroup: "Legs + Cardio" },
      { name: "Skater Jumps",    type: "reps", sets: 3, target: 15, muscleGroup: "Legs + Cardio" },
    ],
    Wednesday: [
      { name: "Push-ups",           type: "reps", sets: 3, target: 15, muscleGroup: "Upper Body" },
      { name: "Shoulder Taps",      type: "reps", sets: 3, target: 15, muscleGroup: "Upper Body" },
      { name: "Mountain Climbers",  type: "reps", sets: 3, target: 15, muscleGroup: "Upper Body" },
      { name: "Plank to Push-up",   type: "reps", sets: 3, target: 15, muscleGroup: "Upper Body" },
    ],
    Thursday: [
      { name: "Burpees",           type: "reps", sets: 3, target: 15, muscleGroup: "HIIT" },
      { name: "High Knees",        type: "reps", sets: 3, target: 15, muscleGroup: "HIIT" },
      { name: "Jumping Jacks",     type: "reps", sets: 3, target: 15, muscleGroup: "HIIT" },
      { name: "Mountain Climbers", type: "reps", sets: 3, target: 15, muscleGroup: "HIIT" },
    ],
    Friday: [
      { name: "Plank",             type: "time", sets: 3, target: 30, muscleGroup: "Core + Cardio" },
      { name: "Bicycle Crunches",  type: "reps", sets: 3, target: 15, muscleGroup: "Core + Cardio" },
      { name: "Leg Raises",        type: "reps", sets: 3, target: 15, muscleGroup: "Core + Cardio" },
      { name: "Russian Twists",    type: "reps", sets: 3, target: 15, muscleGroup: "Core + Cardio" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL GOALS (map to closest existing plan)
  // ═══════════════════════════════════════════════════════════════════════════
  // If user has "Endurance" goal, map to Weight Loss plan (cardio-focused)
  // If user has "Flexibility" goal, map to Weight Loss plan (bodyweight-focused)
  // If user has "General Fitness" goal, map to Weight Loss plan (balanced)
}

/**
 * Get the workout plan for a specific goal and day.
 * Maps unmapped goals to the closest available plan.
 * 
 * @param {string} goal - User's fitness goal from profile
 * @param {string} day - Day name: 'Monday' | 'Tuesday' | ... | 'Sunday'
 * @returns {Array|null} - Array of 4 exercises, or null if rest day
 */
export function getWorkoutForDay(goal, day) {
  // Rest days
  if (day === 'Saturday' || day === 'Sunday') {
    return null
  }

  // Map unmapped goals to closest plan
  let planKey = goal
  if (!WORKOUT_PLANS[goal]) {
    // Default mapping for unmapped goals
    if (goal === 'Muscle Gain') {
      planKey = 'Muscle Gain'
    } else {
      // Endurance, Flexibility, General Fitness, Weight Loss → Weight Loss plan
      planKey = 'Weight Loss'
    }
  }

  // Return the workout for the day
  return WORKOUT_PLANS[planKey]?.[day] || null
}

/**
 * Get display metadata for a fitness goal
 */
export const GOAL_META = {
  'Weight Loss':     { emoji: '🔥', color: 'orange' },
  'Muscle Gain':     { emoji: '💪', color: 'cyan' },
  'Endurance':       { emoji: '🏃', color: 'green' },
  'Flexibility':     { emoji: '🧘', color: 'purple' },
  'General Fitness': { emoji: '⚡', color: 'yellow' },
}

/**
 * Get display metadata for day/muscle group
 */
export const DAY_META = {
  Monday:    { shortName: 'Mon', icon: '💪' },
  Tuesday:   { shortName: 'Tue', icon: '🔥' },
  Wednesday: { shortName: 'Wed', icon: '🏋️' },
  Thursday:  { shortName: 'Thu', icon: '⚡' },
  Friday:    { shortName: 'Fri', icon: '💯' },
  Saturday:  { shortName: 'Sat', icon: '🌴', isRest: true },
  Sunday:    { shortName: 'Sun', icon: '😴', isRest: true },
}
