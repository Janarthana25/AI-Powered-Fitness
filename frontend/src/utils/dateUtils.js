/**
 * dateUtils.js
 * =============
 * Utilities for automatic workout day detection and date handling.
 */

/**
 * Get the current workout day information from system date.
 * 
 * CRITICAL: Uses new Date().getDay() to determine the actual current day.
 * DO NOT hardcode or assume the day.
 * 
 * @returns {{
 *   dayName: string,      // 'Monday' | 'Tuesday' | ... | 'Sunday'
 *   dayIndex: number,     // 0 (Sunday) to 6 (Saturday)
 *   isRestDay: boolean,   // true if Saturday or Sunday
 *   isWorkoutDay: boolean // true if Monday-Friday
 * }}
 */
export function getCurrentWorkoutDay() {
  const now = new Date()
  const dayIndex = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Map numeric day to day name
  const dayNames = [
    'Sunday',    // 0
    'Monday',    // 1
    'Tuesday',   // 2
    'Wednesday', // 3
    'Thursday',  // 4
    'Friday',    // 5
    'Saturday',  // 6
  ]

  const dayName = dayNames[dayIndex]
  const isRestDay = dayIndex === 0 || dayIndex === 6 // Sunday or Saturday
  const isWorkoutDay = !isRestDay

  return {
    dayName,
    dayIndex,
    isRestDay,
    isWorkoutDay,
  }
}

/**
 * Get formatted date string for display
 * 
 * @returns {string} - e.g., "Monday, January 15, 2024"
 */
export function getFormattedDate() {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get the next workout day (skips Saturday/Sunday if today is Friday)
 * 
 * @returns {{dayName: string, daysUntil: number}}
 */
export function getNextWorkoutDay() {
  const today = getCurrentWorkoutDay()

  if (today.isWorkoutDay && today.dayName !== 'Friday') {
    // Monday-Thursday: next day is a workout day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const nextDayIndex = (today.dayIndex + 1) % 7
    return {
      dayName: dayNames[nextDayIndex],
      daysUntil: 1,
    }
  } else if (today.dayName === 'Friday') {
    // Friday → next is Monday (3 days)
    return {
      dayName: 'Monday',
      daysUntil: 3,
    }
  } else if (today.dayName === 'Saturday') {
    // Saturday → next is Monday (2 days)
    return {
      dayName: 'Monday',
      daysUntil: 2,
    }
  } else {
    // Sunday → next is Monday (1 day)
    return {
      dayName: 'Monday',
      daysUntil: 1,
    }
  }
}

/**
 * Format seconds into MM:SS display
 * 
 * @param {number} totalSeconds - Total seconds (e.g., 90)
 * @returns {string} - Formatted time (e.g., "01:30")
 */
export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Format duration in seconds to human-readable string
 * 
 * @param {number} seconds - Duration in seconds
 * @returns {string} - e.g., "2m 30s" or "45s"
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}
