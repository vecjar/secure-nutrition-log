const profileForm = document.getElementById("profileForm");
const calculateTargetsBtn = document.getElementById("calculateTargetsBtn");
const profileMessage = document.getElementById("profileMessage");

const fields = {
  age: document.getElementById("age"),
  sex: document.getElementById("sex"),
  heightCm: document.getElementById("heightCm"),
  weightKg: document.getElementById("weightKg"),
  activityLevel: document.getElementById("activityLevel"),
  goal: document.getElementById("goal"),
  targetWeightKg: document.getElementById("targetWeightKg"),
  weeklyGoalRate: document.getElementById("weeklyGoalRate"),

  suggestedCalories: document.getElementById("suggestedCalories"),
  suggestedProtein: document.getElementById("suggestedProtein"),
  suggestedCarbs: document.getElementById("suggestedCarbs"),
  suggestedFat: document.getElementById("suggestedFat"),

  useCustomTargets: document.getElementById("useCustomTargets"),
  targetCalories: document.getElementById("targetCalories"),
  targetProtein: document.getElementById("targetProtein"),
  targetCarbs: document.getElementById("targetCarbs"),
  targetFat: document.getElementById("targetFat")
};

let currentCalculatedTargets = null;

function setMessage(message, isError = false) {
  profileMessage.textContent = message;
  profileMessage.style.color = isError ? "red" : "green";
}

function toggleCustomTargetInputs() {
  const disabled = !fields.useCustomTargets.checked;

  fields.targetCalories.disabled = disabled;
  fields.targetProtein.disabled = disabled;
  fields.targetCarbs.disabled = disabled;
  fields.targetFat.disabled = disabled;
}

function populateTargets(targets) {
  fields.suggestedCalories.value = targets.calories ?? "";
  fields.suggestedProtein.value = targets.protein ?? "";
  fields.suggestedCarbs.value = targets.carbs ?? "";
  fields.suggestedFat.value = targets.fat ?? "";

  if (!fields.useCustomTargets.checked) {
    fields.targetCalories.value = targets.calories ?? "";
    fields.targetProtein.value = targets.protein ?? "";
    fields.targetCarbs.value = targets.carbs ?? "";
    fields.targetFat.value = targets.fat ?? "";
  }
}

function populateForm(profile) {
  if (!profile) return;

  fields.age.value = profile.age ?? "";
  fields.sex.value = profile.sex ?? "";
  fields.heightCm.value = profile.heightCm ?? "";
  fields.weightKg.value = profile.weightKg ?? "";
  fields.activityLevel.value = profile.activityLevel ?? "";
  fields.goal.value = profile.goal ?? "";
  fields.targetWeightKg.value = profile.targetWeightKg ?? "";
  fields.weeklyGoalRate.value = profile.weeklyGoalRate ?? "";
  fields.useCustomTargets.checked = !!profile.useCustomTargets;

  if (profile.calculatedTargets) {
    currentCalculatedTargets = profile.calculatedTargets;
    populateTargets(profile.calculatedTargets);
  }

  const finalTargets = profile.useCustomTargets
    ? profile.customTargets
    : profile.calculatedTargets;

  if (finalTargets) {
    fields.targetCalories.value = finalTargets.calories ?? "";
    fields.targetProtein.value = finalTargets.protein ?? "";
    fields.targetCarbs.value = finalTargets.carbs ?? "";
    fields.targetFat.value = finalTargets.fat ?? "";
  }

  toggleCustomTargetInputs();
}

async function loadNutritionProfile() {
  try {
    setMessage("Loading profile...");

    const response = await fetch("/api/getNutritionProfile");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load profile: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.profile) {
      populateForm(data.profile);
      setMessage("Profile loaded.");
    } else {
      setMessage("No saved profile found yet.");
      toggleCustomTargetInputs();
    }
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Could not load profile.", true);
  }
}

function getCalculationPayload() {
  return {
    age: Number(fields.age.value),
    sex: fields.sex.value,
    heightCm: Number(fields.heightCm.value),
    weightKg: Number(fields.weightKg.value),
    activityLevel: fields.activityLevel.value,
    goal: fields.goal.value,
    targetWeightKg: fields.targetWeightKg.value ? Number(fields.targetWeightKg.value) : null,
    weeklyGoalRate: fields.weeklyGoalRate.value ? Number(fields.weeklyGoalRate.value) : null
  };
}

async function calculateTargets() {
  try {
    const payload = getCalculationPayload();

    if (!payload.age || !payload.sex || !payload.heightCm || !payload.weightKg || !payload.activityLevel || !payload.goal) {
      setMessage("Please complete all required fields before calculating.", true);
      return;
    }

    setMessage("Calculating targets...");

    const response = await fetch("/api/calculateNutritionTargets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to calculate targets: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    currentCalculatedTargets = data.targets;

    populateTargets(currentCalculatedTargets);
    setMessage("Suggested targets calculated.");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Could not calculate targets.", true);
  }
}

function getSavePayload() {
  return {
    age: Number(fields.age.value),
    sex: fields.sex.value,
    heightCm: Number(fields.heightCm.value),
    weightKg: Number(fields.weightKg.value),
    activityLevel: fields.activityLevel.value,
    goal: fields.goal.value,
    targetWeightKg: fields.targetWeightKg.value ? Number(fields.targetWeightKg.value) : null,
    weeklyGoalRate: fields.weeklyGoalRate.value ? Number(fields.weeklyGoalRate.value) : null,
    calculatedTargets: currentCalculatedTargets,
    customTargets: {
      calories: Number(fields.targetCalories.value || 0),
      protein: Number(fields.targetProtein.value || 0),
      carbs: Number(fields.targetCarbs.value || 0),
      fat: Number(fields.targetFat.value || 0)
    },
    useCustomTargets: fields.useCustomTargets.checked
  };
}

async function saveNutritionProfile(event) {
  event.preventDefault();

  try {
    const payload = getSavePayload();

    if (!payload.age || !payload.sex || !payload.heightCm || !payload.weightKg || !payload.activityLevel || !payload.goal) {
      setMessage("Please complete all required profile fields.", true);
      return;
    }

    const activeTargets = payload.useCustomTargets
      ? payload.customTargets
      : payload.calculatedTargets;

    if (
      !activeTargets ||
      !activeTargets.calories ||
      !activeTargets.protein ||
      !activeTargets.carbs ||
      !activeTargets.fat
    ) {
      setMessage("Please calculate targets or enter manual targets before saving.", true);
      return;
    }

    setMessage("Saving profile...");

    const response = await fetch("/api/saveNutritionProfile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save profile: ${response.status} - ${errorText}`);
    }

    setMessage("Profile saved successfully.");
  } catch (error) {
    console.error(error);
    setMessage(error.message || "Could not save profile.", true);
  }
}

fields.useCustomTargets.addEventListener("change", () => {
  if (!fields.useCustomTargets.checked && currentCalculatedTargets) {
    fields.targetCalories.value = currentCalculatedTargets.calories ?? "";
    fields.targetProtein.value = currentCalculatedTargets.protein ?? "";
    fields.targetCarbs.value = currentCalculatedTargets.carbs ?? "";
    fields.targetFat.value = currentCalculatedTargets.fat ?? "";
  }

  toggleCustomTargetInputs();
});

calculateTargetsBtn.addEventListener("click", calculateTargets);
profileForm.addEventListener("submit", saveNutritionProfile);
document.addEventListener("DOMContentLoaded", loadNutritionProfile);