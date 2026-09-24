/**
 * translations.js
 * ===============
 * Comprehensive bilingual translation system for Payirchi Thozhan AI
 * 
 * Supported languages:
 *   - English (en)
 *   - Tamil (ta)
 * 
 * Usage:
 *   import { getTranslations } from './translations'
 *   const t = getTranslations(userLanguage)
 *   <p>{t.common.welcome}</p>
 */

const TRANSLATIONS = {
  en: {
    // ═══════════════════════════════════════════════════════════════════════
    // COMMON / SHARED
    // ═══════════════════════════════════════════════════════════════════════
    common: {
      appName: 'பயிற்சித் தோழன் AI',
      welcome: 'Welcome',
      loading: 'Loading…',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      update: 'Update',
      retry: 'Retry',
      refresh: 'Refresh',
      logout: 'Logout',
      login: 'Login',
      signup: 'Sign Up',
      or: 'or',
      and: 'and',
      of: 'of',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════
    dashboard: {
      greeting: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
      },
      today: 'Today',
      stats: {
        workoutsDone: 'Workouts Done',
        sessions: 'sessions',
        caloriesBurned: 'Calories Burned',
        kcal: 'kcal',
        activeStreak: 'Active Streak',
        days: 'days',
        injuryAlerts: 'Injury Alerts',
        thisWeek: 'this week',
      },
      quickActions: {
        title: 'Quick Actions',
        startWorkout: 'Start Workout',
        startWorkoutDesc: 'Begin your personalized workout session',
        todaysWorkout: "Start Today's Workout",
        injuryCheck: 'Injury Check',
        injuryCheckDesc: 'Scan your posture and movement for risk factors',
        progressReport: 'Progress Report',
        progressReportDesc: 'View detailed analytics of your training history',
        nutritionPlan: 'Nutrition Plan',
        nutritionPlanDesc: 'AI-powered meal recommendations for your goals',
        comingSoon: 'Coming Soon',
        liveAI: 'Live AI ✨',
      },
      profile: {
        title: 'Your Profile',
        complete: 'Complete',
        incomplete: 'Incomplete',
        editProfile: 'Edit Profile',
        age: 'Age',
        years: 'years',
        gender: 'Gender',
        height: 'Height',
        cm: 'cm',
        weight: 'Weight',
        kg: 'kg',
        goal: 'Fitness Goal',
        experience: 'Experience',
        language: 'Preferred Language',
        medicalConditions: 'Medical Conditions',
        bmi: 'BMI',
        underweight: 'Underweight',
        normalWeight: 'Normal weight',
        overweight: 'Overweight',
        obese: 'Obese',
      },
      workout: {
        title: 'AI Workout Plan',
        activePlan: 'Active Plan',
        getAIPlan: 'Get AI Workout Plan',
        generating: 'Generating Plan…',
        description: 'Our trained AI model analyses your fitness profile — age, BMI, goal, and experience — to recommend the perfect workout for you.',
        recommended: 'Recommended Workout',
        confidence: 'Model Confidence',
        workoutType: 'Workout Type',
        generatedAt: 'Generated At',
        regenerate: 'Regenerate',
      },
      injury: {
        title: 'Check Injury Risk',
        description: 'Enter your exercise details and joint angles to assess injury risk.',
        exercise: 'Exercise',
        selectExercise: 'Select exercise…',
        kneeAngle: 'Knee Angle',
        hipAngle: 'Hip Angle',
        shoulderAngle: 'Shoulder Angle',
        backAngle: 'Back Angle',
        duration: 'Duration',
        minutesPerSession: 'Minutes per session',
        medicalCondition: 'Medical Condition',
        checkRisk: '🛡️ Check Injury Risk',
        analysing: 'Analysing Risk…',
        riskLevel: 'Injury Risk Level',
        lowRisk: 'Low Risk',
        mediumRisk: 'Medium Risk',
        highRisk: 'High Risk',
        recommendation: 'Safety Recommendation',
        preventionTips: 'Prevention Tips',
        assessedAt: 'Assessed At',
      },
      diet: {
        title: 'Your AI Diet Plan',
        generating: 'Generating…',
        calculating: 'Calculating BMI, BMR, macros and meal schedule',
        getDietPlan: 'Get AI Diet Plan',
        description: 'Get a personalized nutrition plan based on your fitness goals.',
        bmi: 'BMI',
        bmr: 'BMR',
        calories: 'Calories',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        water: 'Water',
        sleep: 'Sleep',
        perDay: 'per day',
        perNight: 'per night',
        mealPlan: 'Your Meal Plan',
        breakfast: '🌅 Breakfast',
        midMorning: '🍎 Mid-Morning Snack',
        lunch: '🍛 Lunch',
        eveningSnack: '🫖 Evening Snack',
        dinner: '🌙 Dinner',
      },
      progress: {
        title: 'Progress Tracking',
        logToday: "📝 Log Today's Progress",
        weight: 'Weight (kg)',
        waterIntake: 'Water (L)',
        calories: 'Calories',
        sleepHours: 'Sleep (hrs)',
        workoutCompleted: 'Workout Completed',
        notes: 'Notes',
        optional: 'optional',
        saveProgress: '💾 Save Progress',
        saving: 'Saving…',
      },
      progressReport: {
        title: 'Progress Report',
        subtitle: 'Your fitness journey at a glance',
        close: 'Close',
        loading: 'Loading your progress…',
        noData: 'No progress logged yet',
        noDataSubtitle: 'Start logging daily entries — body weight, sleep, water, and workout status — to build your progress report.',
        overview: 'Overview',
        workoutsCompleted: 'Workouts Completed',
        currentStreak: 'Current Streak',
        daysLogged: 'Days Logged',
        goalProgress: 'Goal Progress',
        days: 'days',
        sessions: 'sessions',
        bodyMetrics: 'Body Metrics',
        currentWeight: 'Current Weight',
        startingWeight: 'Starting Weight',
        weightChange: 'Weight Change',
        weightTrend: 'Weight Trend',
        dailyAverages: 'Daily Averages',
        avgSleep: 'Avg Sleep',
        avgWater: 'Avg Water',
        avgCalories: 'Avg Calories',
        perNight: 'per night',
        perDay: 'per day',
        recentActivity: 'Recent Activity (last 10)',
        workoutDone: 'Workout ✅',
        noWorkoutLogged: 'Rest / No workout',
        notes: 'Notes',
        kg: 'kg',
        notAvailable: '—',
      },
      restDay: {
        title: 'Rest Day',
        message: "Recovery is part of your training. Enjoy your {{day}}!",
        nextWorkout: 'Next workout: {{day}} ({{count}} day)',
        nextWorkout_plural: 'Next workout: {{day}} ({{count}} days)',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // WORKOUT COACH
    // ═══════════════════════════════════════════════════════════════════════
    workout: {
      phases: {
        checkin: '🤖 AI Pre-Workout Check-in',
        ready: '✅ Ready to Start',
        coaching: '🏋️ Workout Coach — Live',
        summary: '🏆 Workout Summary',
      },
      checkin: {
        greeting: 'Hi {{name}}! Ready to start your workout?',
        eatQuestion: 'When did you last eat?',
        youSaid: 'You said:',
        speakAnswer: 'Speak your answer',
        listening: 'Listening…',
        orChoose: 'Or choose:',
        chooseAnswer: 'Choose an answer:',
        preparing: 'Preparing your session…',
        answers: {
          min30: '30 min ago',
          hour1: '1 hour ago',
          hour2: '2 hours ago',
          hour3: '3+ hours ago',
        },
        micError: 'Microphone permission denied. Please use the buttons below instead.',
        micFail: 'Could not start microphone. Use the buttons below.',
        noSpeech: "I couldn't hear you. Please try speaking again.",
      },
      ready: {
        title: 'Ready to Begin, {{name}}!',
        recentlyAte: "We'll start gently since you ate recently.",
        letsGo: "Great — let's get into it!",
        todaysWorkout: "Today's Workout",
        standBack: 'Stand back so your full body is visible in the camera.',
        startButton: '📷 Turn On Camera & Start',
        howItWorks: 'How it works',
        cameraDetects: '📷 Camera detects your body automatically',
        correctPosture: '🟢 Green = correct posture',
        incorrectPosture: '🔴 Red = posture needs adjustment',
        repsCounted: '🔢 Reps counted when you complete each movement',
        setsTarget: '{{sets}} sets × {{reps}} reps',
        timeTarget: '{{sets}} sets × {{seconds}}s hold',
      },
      coaching: {
        loadingPose: 'Loading AI pose detection…',
        exercise: 'Exercise',
        set: 'Set',
        reps: 'Reps',
        time: 'Time',
        good: 'Good',
        fix: 'Fix',
        rest: 'REST',
        restComplete: 'READY FOR NEXT SET',
        endWorkout: '🏁 End Workout',
        cameraError: 'Camera unavailable. Please allow camera access and try again.',
      },
      form: {
        goodForm: 'Good form!',
        straightenBack: 'Straighten your back',
        lowerHips: 'Lower your hips',
        kneeAlignment: 'Keep your knees aligned',
        chestUp: 'Keep your chest up',
        noDetect: 'Unable to detect posture — adjust your position',
        getReady: 'Get into starting position',
        repDone: 'Rep completed!',
        holdPosition: 'Hold position',
      },
      summary: {
        complete: 'Workout Complete!',
        paused: 'Workout Paused',
        totalExercises: 'Exercises',
        totalSets: 'Total Sets',
        totalReps: 'Total Reps',
        avgFormScore: 'Avg Form Score',
        duration: 'Duration',
        exercisesCompleted: 'Exercises Completed',
        sets: 'sets',
        reps: 'reps',
        excellentWork: 'Excellent work! Keep it up!',
        goodEffort: 'Good effort! Focus on form to improve.',
        keepGoing: 'Keep going! Consistency is key.',
        disclaimer: 'This is a fitness assistance tool, not a medical diagnostic system.',
        saveProgress: '💾 Save to Progress',
        savedProgress: '✅ Saved to Progress',
        saving: 'Saving…',
        close: 'Close',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE / COMPLETE PROFILE
    // ═══════════════════════════════════════════════════════════════════════
    profile: {
      title: 'Complete Your Profile',
      editTitle: 'Edit Profile',
      subtitle: 'Help us personalize your fitness journey',
      steps: {
        bodyMetrics: 'Body Metrics',
        fitnessGoals: 'Fitness Goals',
        preferences: 'Preferences',
      },
      fields: {
        age: 'Age',
        agePlaceholder: 'e.g. 25',
        ageHint: 'Must be between 5 and 120',
        gender: 'Gender',
        genderSelect: 'Select your gender',
        male: 'Male',
        female: 'Female',
        other: 'Other',
        preferNotToSay: 'Prefer not to say',
        height: 'Height (cm)',
        heightPlaceholder: 'e.g. 170',
        heightHint: 'Must be between 50 and 300 cm',
        weight: 'Weight (kg)',
        weightPlaceholder: 'e.g. 70',
        weightHint: 'Must be between 10 and 500 kg',
        fitnessGoal: 'Fitness Goal',
        goalSelect: 'Select your primary goal',
        weightLoss: 'Weight Loss',
        muscleGain: 'Muscle Gain',
        endurance: 'Endurance',
        flexibility: 'Flexibility',
        generalFitness: 'General Fitness',
        experience: 'Experience Level',
        experienceSelect: 'Select your experience',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        medicalConditions: 'Medical Conditions',
        medicalPlaceholder: 'e.g. Lower back pain, knee injury… (leave blank if none)',
        medicalHint: 'Helps the AI avoid exercises that may aggravate existing conditions.',
        medicalMax: '{{count}}/500',
        preferredLanguage: 'Preferred Language',
        languageSelect: 'Select your preferred language',
        tamil: 'Tamil',
        english: 'English',
        hindi: 'Hindi',
        telugu: 'Telugu',
        kannada: 'Kannada',
        malayalam: 'Malayalam',
        bengali: 'Bengali',
        marathi: 'Marathi',
      },
      bmi: {
        label: 'Your BMI',
        calculated: 'Calculated: {{value}}',
        category: 'Category: {{category}}',
      },
      buttons: {
        next: 'Next',
        back: 'Back',
        saveProfile: 'Save Profile',
        updating: 'Updating…',
        completeProfile: 'Complete Profile',
      },
      errors: {
        ageRequired: 'Age is required',
        ageInvalid: 'Age must be between 5 and 120',
        genderRequired: 'Please select your gender',
        heightRequired: 'Height is required',
        heightInvalid: 'Height must be between 50 and 300 cm',
        weightRequired: 'Weight is required',
        weightInvalid: 'Weight must be between 10 and 500 kg',
        goalRequired: 'Please select a fitness goal',
        experienceRequired: 'Please select your experience level',
        languageRequired: 'Please select a language',
        medicalMax: 'Maximum 500 characters',
      },
      success: {
        saved: 'Profile saved successfully!',
        updated: 'Profile updated successfully!',
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DAYS OF WEEK
    // ═══════════════════════════════════════════════════════════════════════
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // MUSCLE GROUPS
    // ═══════════════════════════════════════════════════════════════════════
    muscleGroups: {
      chest: 'Chest',
      back: 'Back',
      legs: 'Legs',
      shoulders: 'Shoulders',
      arms: 'Arms',
      fullBody: 'Full Body',
      legsCardio: 'Legs + Cardio',
      upperBody: 'Upper Body',
      hiit: 'HIIT',
      coreCardio: 'Core + Cardio',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // EXERCISES (Keep English names, add Tamil descriptions if needed)
    // ═══════════════════════════════════════════════════════════════════════
    exercises: {
      // Note: Exercise names are typically kept in English for consistency
      // Add translations only if specifically needed
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TAMIL TRANSLATIONS
  // ═══════════════════════════════════════════════════════════════════════
  ta: {
    common: {
      appName: 'பயிற்சித் தோழன் AI',
      welcome: 'வரவேற்கிறோம்',
      loading: 'ஏற்றுகிறது…',
      save: 'சேமி',
      cancel: 'ரத்து',
      close: 'மூடு',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      confirm: 'உறுதிப்படுத்து',
      back: 'பின்',
      next: 'அடுத்து',
      submit: 'சமர்ப்பி',
      update: 'புதுப்பி',
      retry: 'மீண்டும் முயற்சி',
      refresh: 'புதுப்பி',
      logout: 'வெளியேறு',
      login: 'உள்நுழை',
      signup: 'பதிவு செய்',
      or: 'அல்லது',
      and: 'மற்றும்',
      of: 'இல்',
      none: 'இல்லை',
      yes: 'ஆம்',
      no: 'இல்லை',
      ok: 'சரி',
      error: 'பிழை',
      success: 'வெற்றி',
      warning: 'எச்சரிக்கை',
      info: 'தகவல்',
    },

    dashboard: {
      greeting: {
        morning: 'காலை வணக்கம்',
        afternoon: 'மதிய வணக்கம்',
        evening: 'மாலை வணக்கம்',
      },
      today: 'இன்று',
      stats: {
        workoutsDone: 'செய்த Workouts',
        sessions: 'sessions',
        caloriesBurned: 'எரிந்த கலோரிகள்',
        kcal: 'kcal',
        activeStreak: 'தொடர் நாட்கள்',
        days: 'நாட்கள்',
        injuryAlerts: 'காயம் எச்சரிக்கைகள்',
        thisWeek: 'இந்த வாரம்',
      },
      quickActions: {
        title: 'விரைவு செயல்கள்',
        startWorkout: 'Workout தொடங்கு',
        startWorkoutDesc: 'உங்கள் தனிப்பயனாக்கப்பட்ட workout session தொடங்குங்கள்',
        todaysWorkout: 'இன்றைய Workout தொடங்கு',
        injuryCheck: 'காயம் சோதனை',
        injuryCheckDesc: 'உங்கள் நிலை மற்றும் இயக்கத்தை ஆபத்து காரணிகளுக்கு சோதிக்கவும்',
        progressReport: 'முன்னேற்ற அறிக்கை',
        progressReportDesc: 'உங்கள் பயிற்சி வரலாற்றின் விரிவான பகுப்பாய்வை காண்க',
        nutritionPlan: 'உணவு திட்டம்',
        nutritionPlanDesc: 'உங்கள் இலக்குகளுக்கான AI-உதவி உணவு பரிந்துரைகள்',
        comingSoon: 'விரைவில்',
        liveAI: 'நேரடி AI ✨',
      },
      profile: {
        title: 'உங்கள் சுயவிவரம்',
        complete: 'முழுமை',
        incomplete: 'முழுமையற்றது',
        editProfile: 'சுயவிவரத்தை திருத்து',
        age: 'வயது',
        years: 'ஆண்டுகள்',
        gender: 'பாலினம்',
        height: 'உயரம்',
        cm: 'cm',
        weight: 'எடை',
        kg: 'kg',
        goal: 'Fitness இலக்கு',
        experience: 'அனுபவம்',
        language: 'விருப்ப மொழி',
        medicalConditions: 'மருத்துவ நிலைமைகள்',
        bmi: 'BMI',
        underweight: 'குறைவான எடை',
        normalWeight: 'சாதாரண எடை',
        overweight: 'அதிக எடை',
        obese: 'மிக அதிக எடை',
      },
      workout: {
        title: 'AI Workout திட்டம்',
        activePlan: 'செயல்படும் திட்டம்',
        getAIPlan: 'AI Workout திட்டம் பெறுக',
        generating: 'திட்டம் உருவாக்குகிறது…',
        description: 'எங்கள் பயிற்சி பெற்ற AI மாதிரி உங்கள் fitness சுயவிவரத்தை பகுப்பாய்வு செய்து — வயது, BMI, இலக்கு மற்றும் அனுபவம் — உங்களுக்கு சரியான workout பரிந்துரைக்கிறது.',
        recommended: 'பரிந்துரைக்கப்பட்ட Workout',
        confidence: 'மாதிரி நம்பிக்கை',
        workoutType: 'Workout வகை',
        generatedAt: 'உருவாக்கப்பட்டது',
        regenerate: 'மீண்டும் உருவாக்கு',
      },
      injury: {
        title: 'காயம் ஆபத்தை சோதிக்கவும்',
        description: 'உங்கள் உடற்பயிற்சி விவரங்கள் மற்றும் மூட்டு கோணங்களை உள்ளிட்டு காயம் ஆபத்தை மதிப்பிடவும்.',
        exercise: 'உடற்பயிற்சி',
        selectExercise: 'உடற்பயிற்சியை தேர்ந்தெடுக்கவும்…',
        kneeAngle: 'முழங்கால் கோணம்',
        hipAngle: 'இடுப்பு கோணம்',
        shoulderAngle: 'தோள்பட்டை கோணம்',
        backAngle: 'முதுகு கோணம்',
        duration: 'கால அளவு',
        minutesPerSession: 'நிமிடங்கள் ஒரு அமர்வுக்கு',
        medicalCondition: 'மருத்துவ நிலைமை',
        checkRisk: '🛡️ காயம் ஆபத்தை சோதிக்கவும்',
        analysing: 'ஆபத்தை பகுப்பாய்வு செய்கிறது…',
        riskLevel: 'காயம் ஆபத்து நிலை',
        lowRisk: 'குறைந்த ஆபத்து',
        mediumRisk: 'நடுத்தர ஆபத்து',
        highRisk: 'அதிக ஆபத்து',
        recommendation: 'பாதுகாப்பு பரிந்துரை',
        preventionTips: 'தடுப்பு குறிப்புகள்',
        assessedAt: 'மதிப்பிடப்பட்டது',
      },
      diet: {
        title: 'உங்கள் AI உணவு திட்டம்',
        generating: 'உருவாக்குகிறது…',
        calculating: 'BMI, BMR, macros மற்றும் உணவு அட்டவணையை கணக்கிடுகிறது',
        getDietPlan: 'AI உணவு திட்டம் பெறுக',
        description: 'உங்கள் fitness இலக்குகளின் அடிப்படையில் தனிப்பயனாக்கப்பட்ட ஊட்டச்சத்து திட்டத்தை பெறுங்கள்.',
        bmi: 'BMI',
        bmr: 'BMR',
        calories: 'கலோரிகள்',
        protein: 'புரதம்',
        carbs: 'கார்போஹைட்ரேட்',
        fat: 'கொழுப்பு',
        water: 'தண்ணீர்',
        sleep: 'தூக்கம்',
        perDay: 'ஒரு நாளுக்கு',
        perNight: 'ஒரு இரவுக்கு',
        mealPlan: 'உங்கள் உணவு திட்டம்',
        breakfast: '🌅 காலை உணவு',
        midMorning: '🍎 நடு காலை சிற்றுண்டி',
        lunch: '🍛 மதிய உணவு',
        eveningSnack: '🫖 மாலை சிற்றுண்டி',
        dinner: '🌙 இரவு உணவு',
      },
      progress: {
        title: 'முன்னேற்ற கண்காணிப்பு',
        logToday: '📝 இன்றைய முன்னேற்றத்தை பதிவு செய்க',
        weight: 'எடை (kg)',
        waterIntake: 'தண்ணீர் (L)',
        calories: 'கலோரிகள்',
        sleepHours: 'தூக்கம் (மணி)',
        workoutCompleted: 'Workout முடிந்தது',
        notes: 'குறிப்புகள்',
        optional: 'விருப்பமானது',
        saveProgress: '💾 முன்னேற்றத்தை சேமி',
        saving: 'சேமிக்கிறது…',
      },
      progressReport: {
        title: 'முன்னேற்ற அறிக்கை',
        subtitle: 'உங்கள் Fitness பயணம் ஒரு பார்வையில்',
        close: 'மூடு',
        loading: 'உங்கள் முன்னேற்றம் ஏற்றுகிறது…',
        noData: 'இன்னும் முன்னேற்றம் பதிவு செய்யவில்லை',
        noDataSubtitle: 'உடல் எடை, தூக்கம், தண்ணீர் மற்றும் Workout நிலை பதிவு செய்யத் தொடங்குங்கள்.',
        overview: 'சுருக்கம்',
        workoutsCompleted: 'முடிந்த Workouts',
        currentStreak: 'தொடர்ச்சியான நாட்கள்',
        daysLogged: 'பதிவு செய்த நாட்கள்',
        goalProgress: 'இலக்கு முன்னேற்றம்',
        days: 'நாட்கள்',
        sessions: 'sessions',
        bodyMetrics: 'உடல் அளவீடுகள்',
        currentWeight: 'தற்போதைய எடை',
        startingWeight: 'ஆரம்ப எடை',
        weightChange: 'எடை மாற்றம்',
        weightTrend: 'எடை போக்கு',
        dailyAverages: 'தினசரி சராசரிகள்',
        avgSleep: 'சராசரி தூக்கம்',
        avgWater: 'சராசரி தண்ணீர்',
        avgCalories: 'சராசரி கலோரிகள்',
        perNight: 'ஒரு இரவுக்கு',
        perDay: 'ஒரு நாளுக்கு',
        recentActivity: 'சமீபத்திய செயல்பாடு (கடைசி 10)',
        workoutDone: 'Workout ✅',
        noWorkoutLogged: 'ஓய்வு / Workout இல்லை',
        notes: 'குறிப்புகள்',
        kg: 'kg',
        notAvailable: '—',
      },
      restDay: {
        title: 'ஓய்வு நாள்',
        message: 'மீட்பு உங்கள் பயிற்சியின் பகுதி. உங்கள் {{day}} அனுபவியுங்கள்!',
        nextWorkout: 'அடுத்த workout: {{day}} ({{count}} நாள்)',
        nextWorkout_plural: 'அடுத்த workout: {{day}} ({{count}} நாட்கள்)',
      },
    },

    workout: {
      phases: {
        checkin: '🤖 AI Pre-Workout சோதனை',
        ready: '✅ தொடங்க தயார்',
        coaching: '🏋️ Workout Coach — நேரடி',
        summary: '🏆 Workout சுருக்கம்',
      },
      checkin: {
        greeting: 'வணக்கம் {{name}}! workout ஆரம்பிக்க தயாரா?',
        eatQuestion: 'கடைசியாக எப்போது சாப்பிட்டீர்கள்?',
        youSaid: 'நீங்கள் சொன்னது:',
        speakAnswer: 'பேசி பதில் சொல்லுங்கள்',
        listening: 'கேட்கிறேன்…',
        orChoose: 'அல்லது தேர்வு செய்யுங்கள்:',
        chooseAnswer: 'ஒரு பதிலை தேர்ந்தெடுங்கள்:',
        preparing: 'உங்கள் session தயாராகிறது…',
        answers: {
          min30: '30 நிமிடம் முன்பு',
          hour1: '1 மணி நேரம் முன்பு',
          hour2: '2 மணி நேரம் முன்பு',
          hour3: '3+ மணி நேரம் முன்பு',
        },
        micError: 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. கீழே உள்ள பொத்தான்களை பயன்படுத்தவும்.',
        micFail: 'மைக்ரோஃபோனை தொடங்க முடியவில்லை. கீழே உள்ள பொத்தான்களை பயன்படுத்தவும்.',
        noSpeech: 'உங்கள் குரலைக் கேட்க முடியவில்லை. மீண்டும் பேச முயற்சிக்கவும்.',
      },
      ready: {
        title: 'தொடங்க தயாராக இருக்கிறோம், {{name}}!',
        recentlyAte: 'நீங்கள் சமீபத்தில் சாப்பிட்டதால் மெதுவாக ஆரம்பிப்போம்.',
        letsGo: 'சூப்பர் — ஆரம்பிக்கலாம்!',
        todaysWorkout: 'இன்றைய Workout',
        standBack: 'கேமராவில் உங்கள் முழு உடலும் தெளிவாகத் தெரியும்படி நிற்கவும்.',
        startButton: '📷 கேமராவை இயக்கி தொடங்குங்கள்',
        howItWorks: 'இது எப்படி வேலை செய்கிறது',
        cameraDetects: '📷 கேமரா உங்கள் உடலை தானாக கண்டறியும்',
        correctPosture: '🟢 பச்சை = சரியான நிலை',
        incorrectPosture: '🔴 சிவப்பு = நிலையை சரிசெய்ய வேண்டும்',
        repsCounted: '🔢 ஒவ்வொரு இயக்கம் முடிந்ததும் Rep கணக்கிடப்படும்',
        setsTarget: '{{sets}} sets × {{reps}} reps',
        timeTarget: '{{sets}} sets × {{seconds}}s hold',
      },
      coaching: {
        loadingPose: 'AI pose detection ஏற்றப்படுகிறது…',
        exercise: 'உடற்பயிற்சி',
        set: 'Set',
        reps: 'Reps',
        time: 'நேரம்',
        good: 'சரி',
        fix: 'சரிசெய்',
        rest: 'ஓய்வு',
        restComplete: 'அடுத்த SET க்கு தயார்',
        endWorkout: '🏁 Workout முடிக்கவும்',
        cameraError: 'கேமரா கிடைக்கவில்லை. கேமரா அணுகலை அனுமதித்து மீண்டும் முயற்சிக்கவும்.',
      },
      form: {
        goodForm: 'சூப்பர்! சரியாக செய்கிறீர்கள்.',
        straightenBack: 'முதுகை நேராக வைத்துக்கொள்ளுங்கள்.',
        lowerHips: 'இன்னும் கொஞ்சம் கீழே செல்லுங்கள்.',
        kneeAlignment: 'முழங்கால்களை சரியான நிலையில் வைத்துக்கொள்ளுங்கள்.',
        chestUp: 'நெஞ்சை நிமிர்த்தி வைத்துக்கொள்ளுங்கள்.',
        noDetect: 'உங்கள் உடலை கண்டறிய முடியவில்லை — நிலையை சரிசெய்யுங்கள்.',
        getReady: 'தொடக்க நிலையில் நிற்கவும்.',
        repDone: 'ஒரு Rep முடிந்தது!',
        holdPosition: 'நிலையை வைத்திருங்கள்',
      },
      summary: {
        complete: 'Workout முடிந்தது!',
        paused: 'Workout இடைநிறுத்தப்பட்டது',
        totalExercises: 'உடற்பயிற்சிகள்',
        totalSets: 'மொத்த Sets',
        totalReps: 'மொத்த Reps',
        avgFormScore: 'சராசரி Form Score',
        duration: 'நேரம்',
        exercisesCompleted: 'முடிந்த உடற்பயிற்சிகள்',
        sets: 'sets',
        reps: 'reps',
        excellentWork: 'சிறந்த வேலை! தொடருங்கள்!',
        goodEffort: 'நல்ல முயற்சி! form-ஐ மேம்படுத்த கவனம் செலுத்துங்கள்.',
        keepGoing: 'தொடர்ந்து செல்லுங்கள்! நிலைத்தன்மை முக்கியம்.',
        disclaimer: 'இது ஒரு fitness உதவி கருவி, மருத்துவ கண்டறிதல் அமைப்பு அல்ல.',
        saveProgress: '💾 Progress-ல் சேமிக்கவும்',
        savedProgress: '✅ Progress-ல் சேமிக்கப்பட்டது',
        saving: 'சேமிக்கிறேன்…',
        close: 'மூடுக',
      },
    },

    profile: {
      title: 'உங்கள் சுயவிவரத்தை முடிக்கவும்',
      editTitle: 'சுயவிவரத்தை திருத்து',
      subtitle: 'உங்கள் fitness பயணத்தை தனிப்பயனாக்க எங்களுக்கு உதவுங்கள்',
      steps: {
        bodyMetrics: 'உடல் அளவீடுகள்',
        fitnessGoals: 'Fitness இலக்குகள்',
        preferences: 'விருப்பத்தேர்வுகள்',
      },
      fields: {
        age: 'வயது',
        agePlaceholder: 'எ.கா. 25',
        ageHint: '5 மற்றும் 120 இடையே இருக்க வேண்டும்',
        gender: 'பாலினம்',
        genderSelect: 'உங்கள் பாலினத்தை தேர்ந்தெடுக்கவும்',
        male: 'ஆண்',
        female: 'பெண்',
        other: 'மற்றவை',
        preferNotToSay: 'சொல்ல விரும்பவில்லை',
        height: 'உயரம் (cm)',
        heightPlaceholder: 'எ.கா. 170',
        heightHint: '50 மற்றும் 300 cm இடையே இருக்க வேண்டும்',
        weight: 'எடை (kg)',
        weightPlaceholder: 'எ.கா. 70',
        weightHint: '10 மற்றும் 500 kg இடையே இருக்க வேண்டும்',
        fitnessGoal: 'Fitness இலக்கு',
        goalSelect: 'உங்கள் முதன்மை இலக்கை தேர்ந்தெடுக்கவும்',
        weightLoss: 'Weight Loss',
        muscleGain: 'Muscle Gain',
        endurance: 'Endurance',
        flexibility: 'Flexibility',
        generalFitness: 'General Fitness',
        experience: 'அனுபவ நிலை',
        experienceSelect: 'உங்கள் அனுபவத்தை தேர்ந்தெடுக்கவும்',
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
        medicalConditions: 'மருத்துவ நிலைமைகள்',
        medicalPlaceholder: 'எ.கா. முதுகு வலி, முழங்கால் காயம்… (இல்லை என்றால் காலியாக விடவும்)',
        medicalHint: 'ஏற்கனவே உள்ள நிலைமைகளை மோசமாக்கக்கூடிய உடற்பயிற்சிகளை தவிர்க்க AI க்கு உதவுகிறது.',
        medicalMax: '{{count}}/500',
        preferredLanguage: 'விருப்ப மொழி',
        languageSelect: 'உங்கள் விருப்ப மொழியை தேர்ந்தெடுக்கவும்',
        tamil: 'தமிழ்',
        english: 'English',
        hindi: 'Hindi',
        telugu: 'Telugu',
        kannada: 'Kannada',
        malayalam: 'Malayalam',
        bengali: 'Bengali',
        marathi: 'Marathi',
      },
      bmi: {
        label: 'உங்கள் BMI',
        calculated: 'கணக்கிடப்பட்டது: {{value}}',
        category: 'வகை: {{category}}',
      },
      buttons: {
        next: 'அடுத்து',
        back: 'பின்',
        saveProfile: 'சுயவிவரத்தை சேமி',
        updating: 'புதுப்பிக்கிறது…',
        completeProfile: 'சுயவிவரத்தை முடிக்கவும்',
      },
      errors: {
        ageRequired: 'வயது தேவை',
        ageInvalid: 'வயது 5 மற்றும் 120 இடையே இருக்க வேண்டும்',
        genderRequired: 'தயவுசெய்து உங்கள் பாலினத்தை தேர்ந்தெடுக்கவும்',
        heightRequired: 'உயரம் தேவை',
        heightInvalid: 'உயரம் 50 மற்றும் 300 cm இடையே இருக்க வேண்டும்',
        weightRequired: 'எடை தேவை',
        weightInvalid: 'எடை 10 மற்றும் 500 kg இடையே இருக்க வேண்டும்',
        goalRequired: 'தயவுசெய்து fitness இலக்கை தேர்ந்தெடுக்கவும்',
        experienceRequired: 'தயவுசெய்து உங்கள் அனுபவ நிலையை தேர்ந்தெடுக்கவும்',
        languageRequired: 'தயவுசெய்து மொழியை தேர்ந்தெடுக்கவும்',
        medicalMax: 'அதிகபட்சம் 500 எழுத்துக்கள்',
      },
      success: {
        saved: 'சுயவிவரம் வெற்றிகரமாக சேமிக்கப்பட்டது!',
        updated: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
      },
    },

    days: {
      monday: 'திங்கள்',
      tuesday: 'செவ்வாய்',
      wednesday: 'புதன்',
      thursday: 'வியாழன்',
      friday: 'வெள்ளி',
      saturday: 'சனி',
      sunday: 'ஞாயிறு',
    },

    muscleGroups: {
      chest: 'Chest',
      back: 'Back',
      legs: 'Legs',
      shoulders: 'Shoulders',
      arms: 'Arms',
      fullBody: 'Full Body',
      legsCardio: 'Legs + Cardio',
      upperBody: 'Upper Body',
      hiit: 'HIIT',
      coreCardio: 'Core + Cardio',
    },

    exercises: {
      // Keep English names for exercises
    },
  },
}

/**
 * Get translations for a specific language
 * @param {string} language - 'English' | 'Tamil' | 'en' | 'ta'
 * @returns {object} - Translation object
 */
export function getTranslations(language) {
  if (!language) return TRANSLATIONS.en

  const langKey = language.toLowerCase()
  
  if (langKey === 'tamil' || langKey === 'ta') {
    return TRANSLATIONS.ta
  }
  
  return TRANSLATIONS.en
}

/**
 * Format medical condition for display
 * @param {string} condition - Raw condition from database (e.g., "backpain")
 * @param {string} language - User's preferred language
 * @returns {string} - Formatted condition (e.g., "Back pain")
 */
export function formatMedicalCondition(condition, language = 'en') {
  if (!condition || condition.trim() === '') {
    return language === 'ta' || language === 'Tamil' ? 'இல்லை' : 'None'
  }

  // Common patterns
  const formatted = condition
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
    .replace(/([a-z])(?=[A-Z])/g, '$1 ')  // Additional spacing
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return formatted
}

/**
 * Calculate BMI and get category
 * @param {number} heightCm - Height in centimeters
 * @param {number} weightKg - Weight in kilograms
 * @param {string} language - User's preferred language
 * @returns {object} - { value: "24.9", category: "Normal weight" }
 */
export function calculateBMI(heightCm, weightKg, language = 'en') {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null
  }

  const heightM = heightCm / 100
  const bmiValue = weightKg / (heightM * heightM)

  // Classify BEFORE rounding
  let category
  if (bmiValue < 18.5) {
    category = language === 'ta' || language === 'Tamil' 
      ? 'குறைவான எடை' 
      : 'Underweight'
  } else if (bmiValue < 25) {
    category = language === 'ta' || language === 'Tamil'
      ? 'சாதாரண எடை'
      : 'Normal weight'
  } else if (bmiValue < 30) {
    category = language === 'ta' || language === 'Tamil'
      ? 'அதிக எடை'
      : 'Overweight'
  } else {
    category = language === 'ta' || language === 'Tamil'
      ? 'மிக அதிக எடை'
      : 'Obese'
  }

  return {
    value: bmiValue.toFixed(1),
    category,
    rawValue: bmiValue,
  }
}

export default { getTranslations, formatMedicalCondition, calculateBMI }
