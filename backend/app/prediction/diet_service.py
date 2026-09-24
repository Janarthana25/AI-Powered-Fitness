"""
DietService
===========
Pure-logic service (no ML model file needed).

Computes personalised nutrition targets from the user's profile using
established formulas, then generates a full Indian meal plan.

Calculations performed:
  BMI      = weight_kg / (height_m ** 2)
  BMR      = Mifflin-St Jeor Formula
               Male   : (10 × w) + (6.25 × h) - (5 × a) + 5
               Female : (10 × w) + (6.25 × h) - (5 × a) - 161
               Other  : average of both
  TDEE     = BMR × activity multiplier (derived from experience_level)
  Calories = TDEE adjusted for goal:
               Weight Loss    → TDEE - 500  (safe deficit)
               Muscle Gain    → TDEE + 300  (lean bulk)
               Weight Gain    → TDEE + 500
               Endurance      → TDEE + 100
               General Fitness→ TDEE
               Flexibility    → TDEE - 200
  Protein  = 1.6 g / kg  (Weight Loss / General / Flexibility / Endurance)
             2.0 g / kg  (Muscle Gain / Weight Gain)
  Fat      = 25 % of target calories → g = (cal × 0.25) / 9
  Carbs    = remaining calories after protein + fat → g = remaining / 4
  Water    = 35 ml / kg body weight  (minimum 2 L)
  Sleep    = 7–9 h based on goal / experience

The Indian meal plan is selected from curated food tables keyed by
(goal, language).  Tamil names are provided for Tamil users.
"""

import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)

# ── Activity multipliers (PAL) keyed by experience_level ──────────────────────
_ACTIVITY = {
    "Beginner":     1.375,   # light exercise 1-3 days/week
    "Intermediate": 1.55,    # moderate exercise 3-5 days/week
    "Advanced":     1.725,   # hard exercise 6-7 days/week
    "default":      1.55,
}

# ── Calorie adjustments keyed by fitness_goal ─────────────────────────────────
_GOAL_DELTA = {
    "Weight Loss":     -500,
    "Muscle Gain":     +300,
    "Weight Gain":     +500,
    "Endurance":       +100,
    "General Fitness":    0,
    "Flexibility":     -200,
    "default":            0,
}

# ── Protein multiplier (g / kg bodyweight) ────────────────────────────────────
_PROTEIN_FACTOR = {
    "Weight Loss":     1.6,
    "Muscle Gain":     2.0,
    "Weight Gain":     2.0,
    "Endurance":       1.6,
    "General Fitness": 1.6,
    "Flexibility":     1.4,
    "default":         1.6,
}

# ── Sleep recommendations (hours) ─────────────────────────────────────────────
_SLEEP = {
    "Weight Loss":     8.0,
    "Muscle Gain":     8.5,
    "Weight Gain":     8.5,
    "Endurance":       9.0,
    "General Fitness": 7.5,
    "Flexibility":     7.5,
    "default":         8.0,
}

# ── Indian meal plan data ──────────────────────────────────────────────────────
# Structure: { goal_key: { "en": MealPlan, "ta": MealPlan } }
# MealPlan = { breakfast, mid_morning, lunch, evening_snack, dinner }
# goal_key covers Weight Loss / Muscle Gain / Weight Gain / Endurance /
#   General Fitness / Flexibility  (all others fall back to General Fitness)

_MEALS = {
    "Weight Loss": {
        "en": {
            "breakfast":      "Oats porridge with skimmed milk, 1 boiled egg, green tea",
            "mid_morning":    "1 small apple or guava, handful of roasted chana",
            "lunch":          "2 small bajra rotis, palak dal, cucumber raita, salad",
            "evening_snack":  "Sprouts chaat with lemon, buttermilk (chaas)",
            "dinner":         "Moong dal khichdi with ghee, steamed vegetables, thin soup",
        },
        "ta": {
            "breakfast":      "ஓட்ஸ் கஞ்சி (கொழுப்பு நீக்கிய பால்), 1 வேக வைத்த முட்டை, பச்சை தேயிலை",
            "mid_morning":    "1 சிறிய ஆப்பிள் அல்லது கொய்யா, வறுத்த கொண்டைக்கடலை",
            "lunch":          "2 சிறிய பஜ்ரா ரொட்டி, பாலக் பருப்பு, வெள்ளரி ரைதா, சாலட்",
            "evening_snack":  "முளைகட்டிய கொண்டைக்கடலை சாட், மோர்",
            "dinner":         "பாசிப்பயறு கிச்சடி நெய்யுடன், வேக வைத்த காய்கறிகள், மெல்லிய சூப்",
        },
    },
    "Muscle Gain": {
        "en": {
            "breakfast":      "Paneer bhurji with 3 whole-wheat rotis, 1 glass full-fat milk, banana",
            "mid_morning":    "Greek yoghurt with nuts and seeds (almonds, walnuts), 1 fruit",
            "lunch":          "Brown rice, rajma curry, chicken/tofu tikka, mixed vegetable sabzi",
            "evening_snack":  "Peanut butter on whole-wheat toast, 1 glass milk",
            "dinner":         "Dal makhani, 3 rotis, sautéed spinach with garlic, curd",
        },
        "ta": {
            "breakfast":      "பன்னீர் புர்ஜி மூன்று கோதுமை ரொட்டியுடன், 1 கிளாஸ் முழு பால், வாழைப்பழம்",
            "mid_morning":    "கிரேக்க தயிர் பாதாம் வால்நட்டுடன், 1 பழம்",
            "lunch":          "பழுப்பு அரிசி, ராஜ்மா கறி, கோழி / தோஃபு திக்கா, கலவை காய்கறி",
            "evening_snack":  "நிலக்கடலை வெண்ணெய் கோதுமை ரொட்டியில், 1 கிளாஸ் பால்",
            "dinner":         "தால் மக்கனி, 3 ரொட்டி, வெள்ளைப்பூண்டுடன் வதக்கிய கீரை, தயிர்",
        },
    },
    "Weight Gain": {
        "en": {
            "breakfast":      "4 idlis with sambar and coconut chutney, banana milkshake, handful of dry fruits",
            "mid_morning":    "Dates and almond smoothie, whole-wheat bread with peanut butter",
            "lunch":          "White rice, chole, aloo gobi sabzi, papad, curd, ghee",
            "evening_snack":  "Sweet potato chaat, lassi",
            "dinner":         "Butter chicken / paneer butter masala, 3 naan, dal tadka, kheer",
        },
        "ta": {
            "breakfast":      "4 இட்லி சாம்பாரும் தேங்காய் சட்னியுடன், வாழைப்பழ மில்க்ஷேக், உலர் பழங்கள்",
            "mid_morning":    "பேரீச்சம்பழம் பாதாம் ஸ்மூத்தி, கோதுமை ரொட்டி நிலக்கடலை வெண்ணெயுடன்",
            "lunch":          "வெள்ளை அரிசி, சோளா, உருளை முட்டைக்கோஸ் சபழி, பப்பட்,தயிர், நெய்",
            "evening_snack":  "சர்க்கரை வள்ளிக்கிழங்கு சாட், லஸ்ஸி",
            "dinner":         "பட்டர் சிக்கன் / பன்னீர் பட்டர் மசாலா, 3 நான், தால் தட்கா, கீர்",
        },
    },
    "Endurance": {
        "en": {
            "breakfast":      "Banana oat smoothie, 2 multigrain rotis with peanut butter, 1 boiled egg",
            "mid_morning":    "Dates and coconut water, handful of trail mix",
            "lunch":          "Brown rice with rajma, chicken curry (lean), beetroot salad",
            "evening_snack":  "Banana with almond butter, energy bar",
            "dinner":         "Quinoa khichdi, grilled fish / paneer, stir-fried vegetables",
        },
        "ta": {
            "breakfast":      "வாழைப்பழம் ஓட்ஸ் ஸ்மூத்தி, 2 மல்டிகிரேன் ரொட்டி நிலக்கடலை வெண்ணெயுடன், 1 வேக வைத்த முட்டை",
            "mid_morning":    "பேரீச்சம்பழம் தேங்காய் தண்ணீர், கலவை கொட்டைகள்",
            "lunch":          "பழுப்பு அரிசி ராஜ்மாவுடன், கோழி கறி (மெலிந்த), பீட்ரூட் சாலட்",
            "evening_snack":  "வாழைப்பழம் பாதாம் வெண்ணெயுடன், எனர்ஜி பார்",
            "dinner":         "கினோவா கிச்சடி, கிரில் மீன் / பன்னீர், வதக்கிய காய்கறிகள்",
        },
    },
    "Flexibility": {
        "en": {
            "breakfast":      "Moong dal chilla with mint chutney, 1 glass warm turmeric milk",
            "mid_morning":    "Papaya slices, handful of flaxseeds",
            "lunch":          "Jowar roti, mixed vegetable curry, cucumber salad, thin buttermilk",
            "evening_snack":  "Herbal green tea, handful of walnuts",
            "dinner":         "Vegetable daliya, steamed broccoli and carrots, warm lemon water",
        },
        "ta": {
            "breakfast":      "பாசிப்பயறு சீலா புதினா சட்னியுடன், 1 கிளாஸ் சூடான மஞ்சள் பால்",
            "mid_morning":    "பப்பாளி துண்டுகள், ஆளி விதைகள்",
            "lunch":          "ஜோவார் ரொட்டி, கலவை காய்கறி கறி, வெள்ளரி சாலட், மோர்",
            "evening_snack":  "மூலிகை பச்சை தேயிலை, வால்நட்",
            "dinner":         "காய்கறி தாலியா, ஆவியில் வேக வைத்த பிரோக்கோலி கேரட், சூடான எலுமிச்சை தண்ணீர்",
        },
    },
    "General Fitness": {
        "en": {
            "breakfast":      "2 whole-wheat rotis with vegetable upma, 1 glass milk, seasonal fruit",
            "mid_morning":    "Coconut water, roasted makhana (fox nuts)",
            "lunch":          "Rice, sambhar, mixed vegetable sabzi, curd, salad",
            "evening_snack":  "Masala chai, whole-wheat biscuits or roasted chana",
            "dinner":         "2 rotis, dal fry, palak sabzi, curd",
        },
        "ta": {
            "breakfast":      "2 கோதுமை ரொட்டி காய்கறி உப்மாவுடன், 1 கிளாஸ் பால், பருவகால பழம்",
            "mid_morning":    "தேங்காய் தண்ணீர், வறுத்த மக்கானா",
            "lunch":          "சாதம், சாம்பார், கலவை காய்கறி சபழி, தயிர், சாலட்",
            "evening_snack":  "மசாலா தேயிலை, கோதுமை பிஸ்கட் அல்லது வறுத்த கொண்டைக்கடலை",
            "dinner":         "2 ரொட்டி, தால் ஃப்ரை, பாலக் சபழி, தயிர்",
        },
    },
}

# Alias goals that don't have dedicated plans to the closest match
_GOAL_ALIAS = {
    "Weight Loss":     "Weight Loss",
    "Muscle Gain":     "Muscle Gain",
    "Weight Gain":     "Weight Gain",
    "Endurance":       "Endurance",
    "Flexibility":     "Flexibility",
    "General Fitness": "General Fitness",
    "default":         "General Fitness",
}


class DietService:
    """
    Stateless service — no model file, no startup loading required.
    Called directly per-request.

    Usage
    -----
    service = DietService()
    result  = service.calculate(profile_orm_object)
    """

    # ── BMR ───────────────────────────────────────────────────────────────────

    def _bmr(self, weight_kg: float, height_cm: float, age: int, gender: str) -> float:
        """
        Mifflin-St Jeor Equation.
        Returns BMR in kcal/day.
        """
        base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
        g = (gender or "").strip().lower()
        if g == "female":
            return base - 161.0
        if g == "male":
            return base + 5.0
        # Other / Prefer not to say → average
        return ((base + 5.0) + (base - 161.0)) / 2.0

    # ── Main calculation ──────────────────────────────────────────────────────

    def calculate(self, profile) -> dict:
        """
        Compute nutrition targets and build a meal plan from the user's profile.

        Parameters
        ----------
        profile : UserProfile ORM object

        Returns
        -------
        dict with all nutrition metrics and the structured meal plan.

        Raises
        ------
        ValueError  — missing or invalid profile fields
        """
        # ── Validate required fields ─────────────────────────────────────────
        missing = []
        if profile.age       is None: missing.append("age")
        if profile.gender    is None: missing.append("gender")
        if profile.height_cm is None: missing.append("height")
        if profile.weight_kg is None: missing.append("weight")
        if missing:
            raise ValueError(
                f"Profile is incomplete. Missing fields: {', '.join(missing)}."
            )

        age        = int(profile.age)
        weight     = float(profile.weight_kg)
        height     = float(profile.height_cm)
        gender     = str(profile.gender or "Other")
        goal       = str(profile.fitness_goal or "General Fitness")
        experience = str(profile.experience_level or "Beginner")
        language   = str(profile.preferred_language or "English")

        # ── BMI ───────────────────────────────────────────────────────────────
        height_m = height / 100.0
        bmi      = round(weight / (height_m ** 2), 1)

        bmi_category = (
            "Underweight" if bmi < 18.5 else
            "Normal"      if bmi < 25   else
            "Overweight"  if bmi < 30   else
            "Obese"
        )

        # ── BMR ───────────────────────────────────────────────────────────────
        bmr = round(self._bmr(weight, height, age, gender), 1)

        # ── TDEE → target calories ────────────────────────────────────────────
        pal   = _ACTIVITY.get(experience, _ACTIVITY["default"])
        tdee  = bmr * pal
        delta = _GOAL_DELTA.get(goal, _GOAL_DELTA["default"])
        target_calories = round(tdee + delta, 0)

        # Hard floor — never go below 1 200 kcal
        target_calories = max(target_calories, 1200.0)

        # ── Macros ────────────────────────────────────────────────────────────
        # Protein
        p_factor = _PROTEIN_FACTOR.get(goal, _PROTEIN_FACTOR["default"])
        protein_g = round(weight * p_factor, 1)

        # Fat (25 % of target calories)
        fat_g = round((target_calories * 0.25) / 9.0, 1)

        # Carbs: fill remaining calories
        cal_from_protein = protein_g * 4.0
        cal_from_fat     = fat_g    * 9.0
        remaining        = target_calories - cal_from_protein - cal_from_fat
        carbs_g          = round(max(remaining, 0) / 4.0, 1)

        # ── Water ─────────────────────────────────────────────────────────────
        water_ml   = round(max(weight * 35.0, 2000.0), 0)
        water_L    = round(water_ml / 1000.0, 1)

        # ── Sleep ─────────────────────────────────────────────────────────────
        sleep_hours = _SLEEP.get(goal, _SLEEP["default"])

        # ── Meal plan ─────────────────────────────────────────────────────────
        goal_key = _GOAL_ALIAS.get(goal, "General Fitness")
        lang_key = "ta" if language.lower() == "tamil" else "en"
        meals    = _MEALS[goal_key][lang_key]

        logger.info(
            "Diet calculated — user profile: age=%d gender=%s weight=%.1f height=%.1f "
            "goal=%s lang=%s | BMI=%.1f BMR=%.0f cal=%.0f",
            age, gender, weight, height, goal, language,
            bmi, bmr, target_calories,
        )

        return {
            # Metrics
            "bmi":              bmi,
            "bmi_category":     bmi_category,
            "bmr":              bmr,
            "daily_calories":   int(target_calories),
            "protein_g":        protein_g,
            "carbs_g":          carbs_g,
            "fat_g":            fat_g,
            "water_L":          water_L,
            "sleep_hours":      sleep_hours,
            # Meal plan
            "breakfast":        meals["breakfast"],
            "mid_morning":      meals["mid_morning"],
            "lunch":            meals["lunch"],
            "evening_snack":    meals["evening_snack"],
            "dinner":           meals["dinner"],
            # Meta
            "goal":             goal,
            "language":         language,
        }


# ── Module-level singleton ────────────────────────────────────────────────────
# Stateless — no loading step needed. Instantiated once to match the
# same pattern used by PredictionService and InjuryPredictionService.
diet_service = DietService()
