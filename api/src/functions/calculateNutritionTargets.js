const { app } = require("@azure/functions");

function calculateBMR({ weightKg, heightCm, age, sex }) {
  if (sex === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

function getActivityMultiplier(level) {
  switch (level) {
    case "sedentary": return 1.2;
    case "light": return 1.375;
    case "moderate": return 1.55;
    case "very": return 1.725;
    default: return 1.2;
  }
}

function adjustCaloriesForGoal(tdee, goal, weeklyRate) {
  if (goal === "fat_loss") {
    const deficit = (weeklyRate || 0.5) * 7700 / 7;
    return tdee - deficit;
  }

  if (goal === "muscle_gain") {
    const surplus = 300;
    return tdee + surplus;
  }

  return tdee;
}

function calculateMacros(calories, weightKg, goal) {
  const protein = weightKg * (goal === "muscle_gain" ? 2.2 : 2.0);
  const fat = weightKg * 0.8;

  const remainingCalories = calories - (protein * 4 + fat * 9);
  const carbs = remainingCalories / 4;

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
}

app.http("calculateNutritionTargets", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      const body = await req.json();

      const {
        weightKg,
        heightCm,
        age,
        sex,
        activityLevel,
        goal,
        weeklyGoalRate
      } = body;

      if (!weightKg || !heightCm || !age || !sex || !activityLevel || !goal) {
        return {
          status: 400,
          jsonBody: { error: "Missing required fields" }
        };
      }

      const bmr = calculateBMR({ weightKg, heightCm, age, sex });
      const tdee = bmr * getActivityMultiplier(activityLevel);
      const adjustedCalories = adjustCaloriesForGoal(tdee, goal, weeklyGoalRate);

      const macros = calculateMacros(adjustedCalories, weightKg, goal);

      return {
        status: 200,
        jsonBody: {
          targets: macros
        }
      };
    } catch (error) {
      context.log(error);

      return {
        status: 500,
        jsonBody: { error: "Failed to calculate targets" }
      };
    }
  }
});