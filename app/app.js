const API_BASE_URL = '/api';

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 180,
  carbs: 220,
  fats: 70,
  entries: 6
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

const entryForm = document.getElementById('entryForm');
const customFoodForm = document.getElementById('customFoodForm');

const formMessage = document.getElementById('formMessage');
const customFoodsMessage = document.getElementById('customFoodsMessage');

const addMealTabBtn = document.getElementById('addMealTabBtn');
const searchFoodTabBtn = document.getElementById('searchFoodTabBtn');
const saveCustomTabBtn = document.getElementById('saveCustomTabBtn');

const addMealTabSection = document.getElementById('addMealTabSection');
const searchFoodTabSection = document.getElementById('searchFoodTabSection');
const saveCustomTabSection = document.getElementById('saveCustomTabSection');

const savedFoodTrigger = document.getElementById('savedFoodTrigger');
const savedFoodTriggerText = document.getElementById('savedFoodTriggerText');
const savedFoodDropdown = document.getElementById('savedFoodDropdown');
const deleteCustomFoodBtn = document.getElementById('deleteCustomFoodBtn');

const foodSearchInput = document.getElementById('foodSearchInput');
const foodSearchBtn = document.getElementById('foodSearchBtn');
const foodSearchResults = document.getElementById('foodSearchResults');
const foodSearchMessage = document.getElementById('foodSearchMessage');

const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const todayBtn = document.getElementById('todayBtn');
const selectedDateInput = document.getElementById('selectedDate');

const entriesMessage = document.getElementById('entriesMessage');
const entriesList = document.getElementById('entriesList');

const userInfo = document.getElementById('userInfo');
const userRolesInfo = document.getElementById('userRolesInfo');
const loadingSpinner = document.getElementById('loadingSpinner');

const summaryCalories = document.getElementById('summaryCalories');
const summaryProtein = document.getElementById('summaryProtein');
const summaryCarbs = document.getElementById('summaryCarbs');
const summaryFats = document.getElementById('summaryFats');
const summaryEntries = document.getElementById('summaryEntries');

const summaryCaloriesGoal = document.getElementById('summaryCaloriesGoal');
const summaryProteinGoal = document.getElementById('summaryProteinGoal');
const summaryCarbsGoal = document.getElementById('summaryCarbsGoal');
const summaryFatsGoal = document.getElementById('summaryFatsGoal');

const summaryCaloriesRemaining = document.getElementById('summaryCaloriesRemaining');
const summaryProteinRemaining = document.getElementById('summaryProteinRemaining');
const summaryCarbsRemaining = document.getElementById('summaryCarbsRemaining');
const summaryFatsRemaining = document.getElementById('summaryFatsRemaining');
const summaryEntriesHint = document.getElementById('summaryEntriesHint');

const progressCalories = document.getElementById('progressCalories');
const progressProtein = document.getElementById('progressProtein');
const progressCarbs = document.getElementById('progressCarbs');
const progressFats = document.getElementById('progressFats');
const progressEntries = document.getElementById('progressEntries');

const chartDateLabel = document.getElementById('chartDateLabel');
const chartCaloriesBar = document.getElementById('chartCaloriesBar');
const chartProteinBar = document.getElementById('chartProteinBar');
const chartCarbsBar = document.getElementById('chartCarbsBar');
const chartFatsBar = document.getElementById('chartFatsBar');
const chartCaloriesLabel = document.getElementById('chartCaloriesLabel');
const chartProteinLabel = document.getElementById('chartProteinLabel');
const chartCarbsLabel = document.getElementById('chartCarbsLabel');
const chartFatsLabel = document.getElementById('chartFatsLabel');

const chartCaloriesPercent = document.getElementById('chartCaloriesPercent');
const chartProteinPercent = document.getElementById('chartProteinPercent');
const chartCarbsPercent = document.getElementById('chartCarbsPercent');
const chartFatsPercent = document.getElementById('chartFatsPercent');

const adminDashboardBtn = document.getElementById('adminDashboardBtn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const userAvatar = document.getElementById('userAvatar');
const accountHeading = document.getElementById('accountHeading');

const focusHeadline = document.getElementById('focusHeadline');
const focusSubtext = document.getElementById('focusSubtext');
const focusCaloriesRemaining = document.getElementById('focusCaloriesRemaining');
const focusMealsLogged = document.getElementById('focusMealsLogged');

const savedFoodsCount = document.getElementById('savedFoodsCount');

const mealEntryModal = document.getElementById('mealEntryModal');
const mealEntryModalBackdrop = document.getElementById('mealEntryModalBackdrop');
const closeMealModalBtn = document.getElementById('closeMealModalBtn');
const mealModalHeading = document.getElementById('mealModalHeading');
const mealModalSubtext = document.getElementById('mealModalSubtext');

const profileSetupModal = document.getElementById('profileSetupModal');
const startProfileSetupBtn = document.getElementById('startProfileSetupBtn');

let currentUser = null;
let nutritionProfile = null;
let currentGoals = { ...DEFAULT_GOALS };
let customFoodsCache = [];
let currentSelectedDate = getTodayDateString();
let currentModalMealType = '';
const mealSectionState = { breakfast: true, lunch: true, dinner: true, snack: true };

startProfileSetupBtn?.addEventListener('click', () => {
  window.location.href = '/profile.html';
});

closeMealModalBtn?.addEventListener('click', closeMealEntryModal);
mealEntryModalBackdrop?.addEventListener('click', closeMealEntryModal);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mealEntryModal && !mealEntryModal.classList.contains('hidden')) {
    closeMealEntryModal();
  }
});

window.addEventListener('popstate', () => {
  if (mealEntryModal && !mealEntryModal.classList.contains('hidden')) {
    closeMealEntryModal(true);
  }
});

savedFoodTrigger?.addEventListener('click', (event) => {
  event.stopPropagation();
  savedFoodDropdown?.classList.toggle('hidden');
});

document.addEventListener('click', (event) => {
  if (!savedFoodTrigger || !savedFoodDropdown) return;

  const clickedInsideTrigger = savedFoodTrigger.contains(event.target);
  const clickedInsideDropdown = savedFoodDropdown.contains(event.target);

  if (!clickedInsideTrigger && !clickedInsideDropdown) {
    savedFoodDropdown.classList.add('hidden');
  }
});

entryForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    if (formMessage) formMessage.textContent = 'Please sign in before saving entries.';
    return;
  }

  setFormLoadingState(true);
  if (formMessage) formMessage.textContent = 'Saving entry...';

  const payload = {
    date: currentSelectedDate,
    mealType: document.getElementById('mealType')?.value,
    foodName: document.getElementById('foodName')?.value,
    calories: Number(document.getElementById('calories')?.value),
    protein: document.getElementById('protein')?.value ? Number(document.getElementById('protein').value) : null,
    carbs: document.getElementById('carbs')?.value ? Number(document.getElementById('carbs').value) : null,
    fats: document.getElementById('fats')?.value ? Number(document.getElementById('fats').value) : null,
    notes: document.getElementById('notes')?.value || ''
  };

  try {
    const response = await fetch(`${API_BASE_URL}/createEntry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (formMessage) formMessage.textContent = data.error || 'Failed to save entry.';
      return;
    }

    if (formMessage) formMessage.textContent = `Saved: ${data.entry.foodName} for ${currentSelectedDate}`;
    entryForm.reset();
    if (savedFoodTriggerText) savedFoodTriggerText.textContent = 'Choose a saved food';
    if (savedFoodDropdown) savedFoodDropdown.classList.add('hidden');
    await loadEntriesForSelectedDate();

    window.setTimeout(() => {
      closeMealEntryModal();
      if (formMessage) formMessage.textContent = '';
    }, 400);
  } catch (error) {
    console.error(error);
    if (formMessage) formMessage.textContent = 'Could not save entry. Please try again.';
  } finally {
    setFormLoadingState(false);
  }
});

customFoodForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser) {
    if (customFoodsMessage) customFoodsMessage.textContent = 'Please sign in before saving custom foods.';
    return;
  }

  if (customFoodsMessage) customFoodsMessage.textContent = 'Saving custom food...';

  const payload = {
    foodName: document.getElementById('customFoodName')?.value,
    calories: Number(document.getElementById('customFoodCalories')?.value),
    protein: Number(document.getElementById('customFoodProtein')?.value) || 0,
    carbs: Number(document.getElementById('customFoodCarbs')?.value) || 0,
    fats: Number(document.getElementById('customFoodFats')?.value) || 0,
    notes: document.getElementById('customFoodNotes')?.value || ''
  };

  try {
    const response = await fetch(`${API_BASE_URL}/createCustomFood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      if (customFoodsMessage) customFoodsMessage.textContent = data.error || 'Failed to save custom food.';
      return;
    }

    customFoodForm.reset();
    if (customFoodsMessage) customFoodsMessage.textContent = `Saved custom food: ${data.food.foodName}`;
    await loadCustomFoods();
    setWorkspaceTab('meal');
  } catch (error) {
    console.error(error);
    if (customFoodsMessage) customFoodsMessage.textContent = 'Could not save custom food.';
  }
});

addMealTabBtn?.addEventListener('click', () => setWorkspaceTab('meal'));
searchFoodTabBtn?.addEventListener('click', () => setWorkspaceTab('search'));
saveCustomTabBtn?.addEventListener('click', () => setWorkspaceTab('custom'));

deleteCustomFoodBtn?.addEventListener('click', async () => {
  const selectedFoodName = savedFoodTriggerText?.textContent?.trim();

  if (!selectedFoodName || selectedFoodName === 'Choose a saved food') {
    if (formMessage) formMessage.textContent = 'Please choose a saved food to delete.';
    return;
  }

  const selectedFood = customFoodsCache.find(food => food.foodName === selectedFoodName);
  if (!selectedFood) {
    if (formMessage) formMessage.textContent = 'Saved food could not be found.';
    return;
  }

  const confirmed = window.confirm(`Delete saved food "${selectedFood.foodName}"?`);
  if (!confirmed) return;

  await deleteCustomFood(selectedFood.id);
  if (savedFoodTriggerText) savedFoodTriggerText.textContent = 'Choose a saved food';
  if (savedFoodDropdown) savedFoodDropdown.classList.add('hidden');
});

foodSearchBtn?.addEventListener('click', async () => {
  await searchFoods();
});

foodSearchInput?.addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    await searchFoods();
  }
});

prevDayBtn?.addEventListener('click', async () => {
  currentSelectedDate = shiftDateString(currentSelectedDate, -1);
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

nextDayBtn?.addEventListener('click', async () => {
  currentSelectedDate = shiftDateString(currentSelectedDate, 1);
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

todayBtn?.addEventListener('click', async () => {
  currentSelectedDate = getTodayDateString();
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

selectedDateInput?.addEventListener('change', async (event) => {
  if (!event.target.value) return;
  currentSelectedDate = event.target.value;
  await loadEntriesForSelectedDate();
});

entriesList?.addEventListener('click', async (event) => {
  const deleteButton = event.target.closest('.delete-btn');
  if (deleteButton) {
    const entryId = deleteButton.getAttribute('data-entry-id');
    if (!entryId) return;

    const confirmed = window.confirm('Delete this entry?');
    if (!confirmed) return;

    await deleteEntry(entryId);
    return;
  }

  const addButton = event.target.closest('[data-add-meal-type]');
  if (addButton) {
    openMealEntryModal(addButton.getAttribute('data-add-meal-type'));
    return;
  }

  const toggleButton = event.target.closest('[data-toggle-meal-type]');
  if (toggleButton) {
    const mealType = toggleButton.getAttribute('data-toggle-meal-type');
    if (!mealType) return;
    mealSectionState[mealType] = !mealSectionState[mealType];
    await loadEntriesForSelectedDate();
  }
});

async function fetchNutritionProfile() {
  const response = await fetch(`${API_BASE_URL}/getNutritionProfile`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch nutrition profile: ${response.status} - ${errorText}`);
  }

  return response.json();
}

function isProfileComplete(profile) {
  if (!profile) return false;

  const hasCoreFields =
    profile.displayName &&
    profile.age &&
    profile.sex &&
    profile.heightCm &&
    profile.weightKg &&
    profile.activityLevel &&
    profile.goal;

  const activeTargets = profile.useCustomTargets
    ? profile.customTargets
    : profile.calculatedTargets;

  const hasTargets =
    activeTargets &&
    activeTargets.calories &&
    activeTargets.protein &&
    activeTargets.carbs &&
    activeTargets.fat;

  return !!(hasCoreFields && hasTargets);
}

function getActiveProfileTargets(profile) {
  if (!profile) return null;

  return profile.useCustomTargets
    ? profile.customTargets
    : profile.calculatedTargets;
}

function getFriendlyName() {
  return nutritionProfile?.displayName || 'there';
}

function showProfileSetupModal() {
  profileSetupModal?.classList.remove('hidden');
}

function hideProfileSetupModal() {
  profileSetupModal?.classList.add('hidden');
}

async function initializeNutritionProfile() {
  try {
    const result = await fetchNutritionProfile();
    nutritionProfile = result.profile ?? null;

    if (!isProfileComplete(nutritionProfile)) {
      showProfileSetupModal();
      return false;
    }

    hideProfileSetupModal();

    const targets = getActiveProfileTargets(nutritionProfile);

    if (targets) {
      currentGoals = {
        ...DEFAULT_GOALS,
        calories: Number(targets.calories) || DEFAULT_GOALS.calories,
        protein: Number(targets.protein) || DEFAULT_GOALS.protein,
        carbs: Number(targets.carbs) || DEFAULT_GOALS.carbs,
        fats: Number(targets.fat) || DEFAULT_GOALS.fats
      };
    } else {
      currentGoals = { ...DEFAULT_GOALS };
    }

    renderGoalLabels();
    updatePersonalizedCopy();
    return true;
  } catch (error) {
    console.error('Failed to initialize nutrition profile', error);
    currentGoals = { ...DEFAULT_GOALS };
    renderGoalLabels();
    updatePersonalizedCopy();
    return true;
  }
}

async function loadEntriesForSelectedDate() {
  if (!currentUser) {
    if (entriesMessage) entriesMessage.textContent = 'Please sign in to load your entries.';
    if (entriesList) entriesList.innerHTML = '';
    resetSummary();
    renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
    updateTodayFocus({ calories: 0, protein: 0, carbs: 0, fats: 0 }, 0);
    hideSpinner();
    return;
  }

  if (entriesMessage) entriesMessage.textContent = 'Loading entries...';
  if (entriesList) entriesList.innerHTML = '';
  showSpinner();

  try {
    const response = await fetch(
      `${API_BASE_URL}/getTodayEntries?date=${encodeURIComponent(currentSelectedDate)}`
    );
    const data = await response.json();

    if (!response.ok) {
      if (entriesMessage) entriesMessage.textContent = data.error || 'Failed to load entries.';
      return;
    }

    if (entriesMessage) {
      entriesMessage.textContent = `Found ${data.count} entr${data.count === 1 ? 'y' : 'ies'} for ${data.date}.`;
    }

    const sortedEntries = sortEntriesByMealOrder(data.entries);
    const totals = calculateTotals(sortedEntries);

    updateSummaryFromTotals(totals, sortedEntries.length);
    renderMacroChart(totals, data.date);
    updateTodayFocus(totals, sortedEntries.length);

    renderEntriesGroupedByMeal(sortedEntries);
  } catch (error) {
    console.error(error);
    if (entriesMessage) entriesMessage.textContent = 'Could not load entries for the selected day.';
  } finally {
    hideSpinner();
  }
}

async function loadCustomFoods() {
  if (!currentUser) {
    customFoodsCache = [];
    populateSavedFoodsDropdown();
    if (customFoodsMessage) customFoodsMessage.textContent = 'Please sign in to view custom foods.';
    updateSavedFoodsSummary();
    return;
  }

  if (customFoodsMessage) customFoodsMessage.textContent = 'Loading custom foods...';

  try {
    const response = await fetch(`${API_BASE_URL}/getCustomFoods`);
    const data = await response.json();

    if (!response.ok) {
      if (customFoodsMessage) customFoodsMessage.textContent = data.error || 'Failed to load custom foods.';
      return;
    }

    customFoodsCache = data.foods;
    populateSavedFoodsDropdown();
    updateSavedFoodsSummary();

    if (data.foods.length === 0) {
      if (customFoodsMessage) customFoodsMessage.textContent = 'No custom foods saved yet.';
      return;
    }

    if (customFoodsMessage) {
      customFoodsMessage.textContent = `Found ${data.foods.length} saved food${data.foods.length === 1 ? '' : 's'}.`;
    }
  } catch (error) {
    console.error(error);
    if (customFoodsMessage) customFoodsMessage.textContent = 'Could not load custom foods.';
  }
}

async function searchFoods() {
  const query = foodSearchInput?.value?.trim() || '';

  if (!query) {
    if (foodSearchMessage) foodSearchMessage.textContent = 'Enter a food to search.';
    if (foodSearchResults) foodSearchResults.innerHTML = '';
    return;
  }

  if (foodSearchMessage) foodSearchMessage.textContent = `Searching for "${query}"...`;
  if (foodSearchResults) foodSearchResults.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE_URL}/searchFood?query=${encodeURIComponent(query)}`);
    const rawText = await response.text();

    let data = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      console.error('Failed to parse searchFood response:', parseError, rawText);
    }

    if (!response.ok) {
      if (foodSearchMessage) {
        foodSearchMessage.textContent =
          data.error || `Search failed (${response.status}). Check Azure function logs.`;
      }
      return;
    }

    if (foodSearchMessage) {
      foodSearchMessage.textContent = `Found ${data.count} result${data.count === 1 ? '' : 's'} for "${query}".`;
    }

    renderFoodSearchResults(data.results || []);
  } catch (error) {
    console.error(error);
    if (foodSearchMessage) {
      foodSearchMessage.textContent = 'Could not search foods right now.';
    }
  }
}

function getFoodEmoji(food) {
  const text = `${food.foodName || ''} ${food.brandName || ''} ${food.dataType || ''}`.toLowerCase();

  if (text.includes('apple')) return '🍎';
  if (text.includes('banana')) return '🍌';
  if (text.includes('orange')) return '🍊';
  if (text.includes('lemon')) return '🍋';
  if (text.includes('grape')) return '🍇';
  if (text.includes('berry') || text.includes('strawberry') || text.includes('blueberry')) return '🫐';
  if (text.includes('pineapple')) return '🍍';
  if (text.includes('avocado')) return '🥑';
  if (text.includes('peach')) return '🍑';
  if (text.includes('pear')) return '🍐';
  if (text.includes('melon') || text.includes('watermelon')) return '🍉';

  if (text.includes('broccoli') || text.includes('lettuce') || text.includes('salad') || text.includes('cabbage')) return '🥬';
  if (text.includes('carrot')) return '🥕';
  if (text.includes('corn')) return '🌽';
  if (text.includes('potato') || text.includes('chips') || text.includes('fries')) return '🥔';
  if (text.includes('tomato')) return '🍅';
  if (text.includes('pepper')) return '🫑';
  if (text.includes('cucumber')) return '🥒';
  if (text.includes('mushroom')) return '🍄';

  if (text.includes('bread') || text.includes('toast') || text.includes('bagel')) return '🍞';
  if (text.includes('rice')) return '🍚';
  if (text.includes('pasta') || text.includes('spaghetti') || text.includes('noodle')) return '🍝';
  if (text.includes('oat') || text.includes('granola') || text.includes('cereal')) return '🥣';

  if (text.includes('chicken')) return '🍗';
  if (text.includes('beef') || text.includes('steak') || text.includes('burger')) return '🥩';
  if (text.includes('fish') || text.includes('salmon') || text.includes('tuna')) return '🐟';
  if (text.includes('egg')) return '🥚';
  if (text.includes('tofu')) return '🧈';
  if (text.includes('bean') || text.includes('lentil') || text.includes('chickpea')) return '🫘';

  if (text.includes('milk')) return '🥛';
  if (text.includes('juice')) return '🧃';
  if (text.includes('coffee')) return '☕';
  if (text.includes('tea')) return '🍵';
  if (text.includes('soda') || text.includes('cola') || text.includes('soft drink')) return '🥤';

  if (text.includes('cookie') || text.includes('biscuit')) return '🍪';
  if (text.includes('cake') || text.includes('muffin') || text.includes('brownie')) return '🧁';
  if (text.includes('chocolate')) return '🍫';
  if (text.includes('ice cream')) return '🍨';
  if (text.includes('candy') || text.includes('lolly')) return '🍬';

  if (text.includes('pizza')) return '🍕';
  if (text.includes('sandwich')) return '🥪';
  if (text.includes('soup')) return '🍲';
  if (text.includes('taco')) return '🌮';
  if (text.includes('burrito')) return '🌯';

  return '🍽️';
}

function renderFoodSearchResults(results) {
  if (!foodSearchResults) return;

  if (!results.length) {
    foodSearchResults.innerHTML = `
      <div class="text-sm text-slate-500">No results found.</div>
    `;
    return;
  }

  foodSearchResults.innerHTML = results.map((food, index) => `
    <button
      type="button"
      class="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-md transition"
      data-search-result-index="${index}"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-2xl">${getFoodEmoji(food)}</span>
          <div class="min-w-0">
            <h3 class="text-xl font-semibold text-slate-800 leading-tight break-words">
              ${escapeHtml(food.foodName || 'Food result')}
            </h3>
            <div class="mt-2 flex flex-wrap gap-2">
              ${food.serving ? `<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">${escapeHtml(food.serving)}</span>` : ''}
              ${food.dataType ? `<span class="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">${escapeHtml(food.dataType)}</span>` : ''}
              ${food.brandName ? `<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700">${escapeHtml(food.brandName)}</span>` : ''}
            </div>
          </div>
        </div>

        <span class="text-sm font-semibold text-blue-600 whitespace-nowrap">Tap to use</span>
      </div>

      <div class="mt-5">
        <p class="text-xs uppercase tracking-wide text-slate-400">Calories</p>
        <p class="mt-1 text-4xl font-bold text-slate-800">
          ${formatMacroValue(food.calories)}
          <span class="text-lg font-medium text-slate-500">kcal</span>
        </p>
      </div>

      <div class="mt-5 grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-slate-50 px-4 py-3 text-center">
          <p class="text-xs uppercase tracking-wide text-slate-400">Protein</p>
          <p class="mt-1 text-2xl font-semibold text-slate-700">${formatMacroValue(food.protein)}g</p>
        </div>

        <div class="rounded-2xl bg-amber-50 px-4 py-3 text-center">
          <p class="text-xs uppercase tracking-wide text-slate-400">Carbs</p>
          <p class="mt-1 text-2xl font-semibold text-amber-700">${formatMacroValue(food.carbs)}g</p>
        </div>

        <div class="rounded-2xl bg-rose-50 px-4 py-3 text-center">
          <p class="text-xs uppercase tracking-wide text-slate-400">Fats</p>
          <p class="mt-1 text-2xl font-semibold text-rose-700">${formatMacroValue(food.fats)}g</p>
        </div>
      </div>
    </button>
  `).join('');

  document.querySelectorAll('[data-search-result-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.getAttribute('data-search-result-index'));
      const selectedFood = results[index];
      if (!selectedFood) return;
      applyFoodSearchResultToEntryForm(selectedFood);
    });
  });
}

function applyFoodSearchResultToEntryForm(food) {
  const foodName = document.getElementById('foodName');
  const calories = document.getElementById('calories');
  const protein = document.getElementById('protein');
  const carbs = document.getElementById('carbs');
  const fats = document.getElementById('fats');
  const notes = document.getElementById('notes');

  if (foodName) foodName.value = food.foodName || '';
  if (calories) calories.value = food.calories ?? '';
  if (protein) protein.value = food.protein ?? '';
  if (carbs) carbs.value = food.carbs ?? '';
  if (fats) fats.value = food.fats ?? '';

  if (notes) {
    const serving = food.serving ? `USDA serving: ${food.serving}` : '';
    const dataType = food.dataType ? `Type: ${food.dataType}` : '';
    const brand = food.brandName ? `Brand: ${food.brandName}` : '';
    const noteParts = [serving, dataType, brand].filter(Boolean);
    notes.value = noteParts.join(' | ');
  }

  if (formMessage) formMessage.textContent = `Loaded USDA food: ${food.foodName}`;
  setWorkspaceTab('meal');
}

async function deleteEntry(entryId) {
  showSpinner();

  try {
    const response = await fetch(
      `${API_BASE_URL}/deleteEntry?entryId=${encodeURIComponent(entryId)}`,
      { method: 'DELETE' }
    );

    const data = await response.json();

    if (!response.ok) {
      if (entriesMessage) entriesMessage.textContent = data.error || 'Failed to delete entry.';
      return;
    }

    if (entriesMessage) entriesMessage.textContent = 'Entry deleted successfully.';
    await loadEntriesForSelectedDate();
  } catch (error) {
    console.error(error);
    if (entriesMessage) entriesMessage.textContent = 'Could not delete entry.';
  } finally {
    hideSpinner();
  }
}

async function deleteCustomFood(foodId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/deleteCustomFood?foodId=${encodeURIComponent(foodId)}`,
      { method: 'DELETE' }
    );

    const data = await response.json();

    if (!response.ok) {
      if (formMessage) formMessage.textContent = data.error || 'Failed to delete saved food.';
      return;
    }

    if (formMessage) formMessage.textContent = 'Saved food deleted successfully.';
    await loadCustomFoods();

    const foodName = document.getElementById('foodName');
    const calories = document.getElementById('calories');
    const protein = document.getElementById('protein');
    const carbs = document.getElementById('carbs');
    const fats = document.getElementById('fats');
    const notes = document.getElementById('notes');

    if (foodName) foodName.value = '';
    if (calories) calories.value = '';
    if (protein) protein.value = '';
    if (carbs) carbs.value = '';
    if (fats) fats.value = '';
    if (notes) notes.value = '';

    if (savedFoodTriggerText) savedFoodTriggerText.textContent = 'Choose a saved food';
    if (savedFoodDropdown) savedFoodDropdown.classList.add('hidden');
  } catch (error) {
    console.error(error);
    if (formMessage) formMessage.textContent = 'Could not delete saved food.';
  }
}

async function loadUser() {
  if (!userInfo) return;

  try {
    const response = await fetch('/.auth/me');
    const data = await response.json();
    const clientPrincipal = Array.isArray(data) ? data[0]?.clientPrincipal : data?.clientPrincipal;

    if (!clientPrincipal) {
      currentUser = null;
      nutritionProfile = null;
      userInfo.textContent = 'Not signed in.';
      if (userRolesInfo) userRolesInfo.textContent = '';
      if (accountHeading) accountHeading.textContent = 'Your Account';
      if (userAvatar) userAvatar.textContent = 'U';
      adminDashboardBtn?.classList.add('hidden');
      signInBtn?.classList.remove('hidden');
      signOutBtn?.classList.add('hidden');
      editProfileBtn?.classList.add('hidden');
      hideProfileSetupModal();

      if (formMessage) formMessage.textContent = 'Please sign in to save entries.';
      if (entriesMessage) entriesMessage.textContent = 'Please sign in to load your entries.';
      if (customFoodsMessage) customFoodsMessage.textContent = 'Please sign in to use custom foods.';
      if (foodSearchMessage) foodSearchMessage.textContent = 'Please sign in to search foods.';

      customFoodsCache = [];
      populateSavedFoodsDropdown();
      updateSavedFoodsSummary();

      currentGoals = { ...DEFAULT_GOALS };
      renderGoalLabels();
      resetSummary();
      renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
      updateTodayFocus({ calories: 0, protein: 0, carbs: 0, fats: 0 }, 0);
      updatePersonalizedCopy();
      hideSpinner();
      return;
    }

    const userRoles = Array.isArray(clientPrincipal.userRoles) ? [...clientPrincipal.userRoles] : [];
    const userDetails = clientPrincipal.userDetails || '';

    if (userDetails.toLowerCase() === 'vecjar@gmail.com' && !userRoles.includes('admin')) {
      userRoles.push('admin');
    }

    currentUser = {
      userId: clientPrincipal.userId || null,
      userDetails,
      roles: userRoles
    };

    userInfo.textContent = `Signed in as ${clientPrincipal.userDetails}`;
    if (userRolesInfo) userRolesInfo.textContent = `Roles: ${userRoles.join(', ')}`;
    if (userAvatar) userAvatar.textContent = (clientPrincipal.userDetails || 'U').charAt(0).toUpperCase();

    signInBtn?.classList.add('hidden');
    signOutBtn?.classList.remove('hidden');
    editProfileBtn?.classList.remove('hidden');

    if (userRoles.includes('admin')) {
      adminDashboardBtn?.classList.remove('hidden');
    } else {
      adminDashboardBtn?.classList.add('hidden');
    }

    syncSelectedDateInput();

    const canContinue = await initializeNutritionProfile();
    if (!canContinue) return;

    await loadCustomFoods();
    await loadEntriesForSelectedDate();
  } catch (error) {
    console.error(error);
    currentUser = null;
    nutritionProfile = null;
    userInfo.textContent = 'User info could not be loaded.';
    if (userRolesInfo) userRolesInfo.textContent = '';
    if (accountHeading) accountHeading.textContent = 'Your Account';
    if (userAvatar) userAvatar.textContent = 'U';
    adminDashboardBtn?.classList.add('hidden');
    signInBtn?.classList.remove('hidden');
    signOutBtn?.classList.add('hidden');
    editProfileBtn?.classList.add('hidden');

    customFoodsCache = [];
    populateSavedFoodsDropdown();
    updateSavedFoodsSummary();

    currentGoals = { ...DEFAULT_GOALS };
    renderGoalLabels();
    resetSummary();
    renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
    updateTodayFocus({ calories: 0, protein: 0, carbs: 0, fats: 0 }, 0);
    updatePersonalizedCopy();
    hideSpinner();
  }
}

function updatePersonalizedCopy() {
  const name = getFriendlyName();

  if (accountHeading) {
    accountHeading.textContent = nutritionProfile?.displayName
      ? `${name}'s Account`
      : 'Your Account';
  }

  if (!nutritionProfile?.displayName) {
    if (focusHeadline) focusHeadline.textContent = 'Ready to log your day';
    if (focusSubtext) focusSubtext.textContent = 'Start by adding your first meal and tracking your progress.';
    return;
  }

  if (focusHeadline && (!summaryEntries || Number(summaryEntries.textContent) === 0)) {
    focusHeadline.textContent = `Welcome back, ${name}`;
    if (focusSubtext) {
      focusSubtext.textContent = `${name}, start by adding your first meal and tracking your progress today.`;
    }
  }
}

function updateTodayFocus(totals, entryCount) {
  const name = getFriendlyName();
  const caloriesRemaining = Math.max(
    0,
    Math.round((currentGoals.calories || 0) - (totals.calories || 0))
  );

  if (focusCaloriesRemaining) {
    focusCaloriesRemaining.textContent = caloriesRemaining;
  }

  if (focusMealsLogged) {
    focusMealsLogged.textContent = entryCount;
  }

  if (!focusHeadline || !focusSubtext) return;

  if (entryCount === 0) {
    focusHeadline.textContent = nutritionProfile?.displayName
      ? `Welcome back, ${name}`
      : 'Ready to log your day';

    focusSubtext.textContent = nutritionProfile?.displayName
      ? `${name}, start by adding your first meal and tracking your progress today.`
      : 'Start by adding your first meal and tracking your progress.';

    return;
  }

  const caloriesUsed = totals.calories || 0;
  const calorieGoal = currentGoals.calories || 0;
  const progressRatio = calorieGoal > 0 ? caloriesUsed / calorieGoal : 0;

  if (progressRatio < 0.4) {
    focusHeadline.textContent = `Nice start, ${name}`;
    focusSubtext.textContent = 'You are building momentum. Keep logging meals to stay on track.';
  } else if (progressRatio < 0.85) {
    focusHeadline.textContent = `${name}, you are on track`;
    focusSubtext.textContent = 'Your daily intake is progressing well for the selected day.';
  } else if (progressRatio <= 1.05) {
    focusHeadline.textContent = `Great job, ${name}`;
    focusSubtext.textContent = 'You are right around your calorie goal. Nice balanced progress today.';
  } else {
    focusHeadline.textContent = `${name}, you are over target today`;
    focusSubtext.textContent = 'Still useful data — review your meals and adjust the rest of the day if needed.';
  }
}

function updateSavedFoodsSummary() {
  if (savedFoodsCount) {
    savedFoodsCount.textContent = customFoodsCache.length;
  }
}

function setWorkspaceTab(tab) {
  const isMealTab = tab === 'meal';
  const isSearchTab = tab === 'search';
  const isCustomTab = tab === 'custom';

  if (addMealTabSection) addMealTabSection.classList.toggle('hidden', !isMealTab);
  if (searchFoodTabSection) searchFoodTabSection.classList.toggle('hidden', !isSearchTab);
  if (saveCustomTabSection) saveCustomTabSection.classList.toggle('hidden', !isCustomTab);

  if (addMealTabBtn) {
    addMealTabBtn.className = isMealTab
      ? 'rounded-xl bg-green-600 px-5 py-2.5 text-white text-sm font-medium shadow hover:bg-green-700 transition'
      : 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition';
  }

  if (searchFoodTabBtn) {
    searchFoodTabBtn.className = isSearchTab
      ? 'rounded-xl bg-blue-600 px-5 py-2.5 text-white text-sm font-medium shadow hover:bg-blue-700 transition'
      : 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition';
  }

  if (saveCustomTabBtn) {
    saveCustomTabBtn.className = isCustomTab
      ? 'rounded-xl bg-lime-600 px-5 py-2.5 text-white text-sm font-medium shadow hover:bg-lime-700 transition'
      : 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition';
  }
}

function openMealEntryModal(mealType = '') {
  currentModalMealType = mealType || '';

  if (mealType && mealSectionState[mealType] === false) {
    mealSectionState[mealType] = true;
  }

  const mealTypeSelect = document.getElementById('mealType');

  if (mealType) {
    const mealLabel = MEAL_LABELS[mealType] || 'Meal';

    if (mealModalHeading) mealModalHeading.textContent = `Add ${mealLabel}`;
    if (mealModalSubtext) {
      mealModalSubtext.textContent = `Log a ${mealLabel.toLowerCase()} entry for ${formatDateForDisplay(currentSelectedDate)}.`;
    }

    if (mealTypeSelect) mealTypeSelect.value = mealType;
  } else {
    if (mealModalHeading) mealModalHeading.textContent = 'Add Meal';
    if (mealModalSubtext) {
      mealModalSubtext.textContent = 'Log a meal fast or reuse one of your saved foods.';
    }
  }

  setWorkspaceTab('meal');

  mealEntryModal?.classList.remove('hidden');
  document.body.classList.add('modal-open');

  if (!history.state || history.state.modal !== 'meal') {
    history.pushState({ modal: 'meal' }, '');
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function closeMealEntryModal(skipHistoryBack = false) {
  mealEntryModal?.classList.add('hidden');
  document.body.classList.remove('modal-open');
  currentModalMealType = '';

  if (formMessage) formMessage.textContent = '';
  if (customFoodsMessage) customFoodsMessage.textContent = '';
  if (foodSearchMessage) foodSearchMessage.textContent = '';
  if (foodSearchResults) foodSearchResults.innerHTML = '';
  if (foodSearchInput) foodSearchInput.value = '';

  entryForm?.reset();
  if (savedFoodTriggerText) savedFoodTriggerText.textContent = 'Choose a saved food';
  if (savedFoodDropdown) savedFoodDropdown.classList.add('hidden');

  if (!skipHistoryBack && history.state && history.state.modal === 'meal') {
    history.back();
  }
}

function sortEntriesByMealOrder(entries) {
  return [...entries].sort((a, b) => {
    const mealIndexA = MEAL_ORDER.indexOf((a.mealType || '').toLowerCase());
    const mealIndexB = MEAL_ORDER.indexOf((b.mealType || '').toLowerCase());

    const safeIndexA = mealIndexA === -1 ? 999 : mealIndexA;
    const safeIndexB = mealIndexB === -1 ? 999 : mealIndexB;

    if (safeIndexA !== safeIndexB) {
      return safeIndexA - safeIndexB;
    }

    const createdAtA = a.createdAt || '';
    const createdAtB = b.createdAt || '';
    return createdAtB.localeCompare(createdAtA);
  });
}

function renderEntriesGroupedByMeal(entries) {
  if (!entriesList) return;

  entriesList.innerHTML = '';

  const mealStyles = {
    breakfast: {
      badge: 'bg-blue-100 text-blue-700',
      sectionBorder: 'border-blue-100',
      headerBg: 'bg-blue-50',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      entryAccent: 'border-blue-300'
    },
    lunch: {
      badge: 'bg-emerald-100 text-emerald-700',
      sectionBorder: 'border-emerald-100',
      headerBg: 'bg-emerald-50',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      entryAccent: 'border-emerald-300'
    },
    dinner: {
      badge: 'bg-amber-100 text-amber-700',
      sectionBorder: 'border-amber-100',
      headerBg: 'bg-amber-50',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      entryAccent: 'border-amber-300'
    },
    snack: {
      badge: 'bg-rose-100 text-rose-700',
      sectionBorder: 'border-rose-100',
      headerBg: 'bg-rose-50',
      button: 'bg-rose-600 hover:bg-rose-700 text-white',
      entryAccent: 'border-rose-300'
    }
  };

  for (const mealType of MEAL_ORDER) {
    const mealEntries = entries.filter(
      (entry) => (entry.mealType || '').toLowerCase() === mealType
    );

    const style = mealStyles[mealType] || {
      badge: 'bg-slate-100 text-slate-700',
      sectionBorder: 'border-slate-200',
      headerBg: 'bg-slate-50',
      button: 'bg-slate-700 hover:bg-slate-800 text-white',
      entryAccent: 'border-slate-300'
    };

    const isExpanded = mealSectionState[mealType] !== false;
    const countLabel = `${mealEntries.length} entr${mealEntries.length === 1 ? 'y' : 'ies'}`;

    const sectionLi = document.createElement('li');
    sectionLi.className = 'mb-5 sm:mb-6';

    const entriesMarkup = mealEntries.length
      ? mealEntries.map((entry, index) => `
          ${renderEntryCard(entry, style.entryAccent)}
          ${index < mealEntries.length - 1 ? '<div class="mx-4 sm:mx-5 border-t border-slate-100"></div>' : ''}
        `).join('')
      : `
        <div class="px-4 sm:px-5 py-4 sm:py-5 text-sm text-slate-500">
          No ${MEAL_LABELS[mealType].toLowerCase()} entries yet for ${formatDateForDisplay(currentSelectedDate)}.
        </div>
      `;

    sectionLi.innerHTML = `
      <div class="rounded-2xl bg-white border-2 border-slate-300 shadow-sm p-4 sm:p-5">
        <div class="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between px-4 sm:px-5 py-4 ${style.headerBg} rounded-xl">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              data-toggle-meal-type="${mealType}"
              class="inline-flex h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition"
              aria-expanded="${isExpanded}">
              <span class="text-base sm:text-lg font-semibold">${isExpanded ? '−' : '+'}</span>
            </button>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.badge}">
                  ${MEAL_LABELS[mealType]}
                </span>
                <span class="text-sm font-medium text-slate-600">${countLabel}</span>
              </div>
              ${
                mealEntries.length === 0
                  ? `<p class="mt-1 text-sm text-slate-500">No ${MEAL_LABELS[mealType].toLowerCase()} logged yet.</p>`
                  : ''
              }
            </div>
          </div>

          <button
            type="button"
            data-add-meal-type="${mealType}"
            class="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold shadow ${style.button} transition w-full md:w-auto">
            + Add ${MEAL_LABELS[mealType]}
          </button>
        </div>

        <div class="${isExpanded ? 'block' : 'hidden'} mt-3" data-meal-panel="${mealType}">
          ${entriesMarkup}
        </div>
      </div>
    `;

    entriesList.appendChild(sectionLi);
  }
}

function renderEntryCard(entry, accentClass = 'border-slate-300') {
  const detailsParts = [];

  if (entry.notes && String(entry.notes).trim() !== '') {
    detailsParts.push(
      ...String(entry.notes)
        .split('|')
        .map(part => part.trim())
        .filter(Boolean)
    );
  }

  const firstDetail = detailsParts.length ? detailsParts[0] : '';
  const macroParts = [];

  if (entry.protein !== null && entry.protein !== undefined && entry.protein !== '') {
    macroParts.push(`Protein ${formatMacroValue(entry.protein)}g`);
  }

  if (entry.carbs !== null && entry.carbs !== undefined && entry.carbs !== '') {
    macroParts.push(`Carbs ${formatMacroValue(entry.carbs)}g`);
  }

  if (entry.fats !== null && entry.fats !== undefined && entry.fats !== '') {
    macroParts.push(`Fats ${formatMacroValue(entry.fats)}g`);
  }

  return `
    <div class="px-3 sm:px-5 py-3 sm:py-4">
      <div class="rounded-2xl border-2 ${accentClass} bg-white px-3 sm:px-4 py-3 sm:py-4">
        <div class="flex flex-col gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm sm:text-xl font-bold text-slate-800 break-words">
              ${escapeHtml(entry.foodName)}
            </p>

            <div class="mt-3">
              <p class="text-xs uppercase tracking-wide text-slate-400">Calories</p>
              <p class="mt-1 text-2xl sm:text-3xl font-bold text-slate-800 leading-none">
                ${escapeHtml(entry.calories)}
                <span class="text-sm sm:text-lg font-medium text-slate-500">kcal</span>
              </p>
            </div>

            ${
              macroParts.length
                ? `
                <div class="mt-3 flex flex-wrap gap-2">
                  ${macroParts.map(part => `
                    <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      ${escapeHtml(part)}
                    </span>
                  `).join('')}
                </div>
              `
                : ''
            }

            ${
              firstDetail
                ? `
                <p class="mt-3 text-xs sm:text-sm text-slate-500 break-words">
                  ${escapeHtml(firstDetail)}
                </p>
              `
                : ''
            }
          </div>

          <button
            type="button"
            class="delete-btn inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition self-start"
            data-entry-id="${entry.id}">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

function calculateTotals(entries) {
  return entries.reduce(
    (acc, entry) => {
      acc.calories += Number(entry.calories) || 0;
      acc.protein += Number(entry.protein) || 0;
      acc.carbs += Number(entry.carbs) || 0;
      acc.fats += Number(entry.fats) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function updateSummaryFromTotals(totals, entryCount) {
  if (summaryCalories) summaryCalories.textContent = Math.round(totals.calories);
  if (summaryProtein) summaryProtein.textContent = `${roundToOne(totals.protein)}g`;
  if (summaryCarbs) summaryCarbs.textContent = `${roundToOne(totals.carbs)}g`;
  if (summaryFats) summaryFats.textContent = `${roundToOne(totals.fats)}g`;
  if (summaryEntries) summaryEntries.textContent = entryCount;

  const caloriesRemaining = Math.max(0, Math.round((currentGoals.calories || 0) - (totals.calories || 0)));
  const proteinRemaining = Math.max(0, roundToOne((currentGoals.protein || 0) - (totals.protein || 0)));
  const carbsRemaining = Math.max(0, roundToOne((currentGoals.carbs || 0) - (totals.carbs || 0)));
  const fatsRemaining = Math.max(0, roundToOne((currentGoals.fats || 0) - (totals.fats || 0)));

  if (summaryCaloriesRemaining) summaryCaloriesRemaining.textContent = `Remaining: ${caloriesRemaining}`;
  if (summaryProteinRemaining) summaryProteinRemaining.textContent = `Remaining: ${proteinRemaining}g`;
  if (summaryCarbsRemaining) summaryCarbsRemaining.textContent = `Remaining: ${carbsRemaining}g`;
  if (summaryFatsRemaining) summaryFatsRemaining.textContent = `Remaining: ${fatsRemaining}g`;

  if (summaryEntriesHint) {
    if (entryCount === 0) {
      summaryEntriesHint.textContent = 'No meals logged yet';
    } else if (entryCount < 3) {
      summaryEntriesHint.textContent = 'A good start to the day';
    } else if (entryCount < 5) {
      summaryEntriesHint.textContent = 'Solid meal logging today';
    } else {
      summaryEntriesHint.textContent = 'Excellent tracking consistency';
    }
  }

  setProgress(progressCalories, totals.calories, currentGoals.calories);
  setProgress(progressProtein, totals.protein, currentGoals.protein);
  setProgress(progressCarbs, totals.carbs, currentGoals.carbs);
  setProgress(progressFats, totals.fats, currentGoals.fats);
  setProgress(progressEntries, entryCount, DEFAULT_GOALS.entries);
}

function renderMacroChart(totals, dateString) {
  if (chartDateLabel) chartDateLabel.textContent = formatDateForDisplay(dateString);

  const caloriesValue = Math.round(totals.calories || 0);
  const proteinValue = roundToOne(totals.protein || 0);
  const carbsValue = roundToOne(totals.carbs || 0);
  const fatsValue = roundToOne(totals.fats || 0);

  const caloriesPercent = currentGoals.calories > 0
    ? Math.round((caloriesValue / currentGoals.calories) * 100)
    : 0;
  const proteinPercent = currentGoals.protein > 0
    ? Math.round((proteinValue / currentGoals.protein) * 100)
    : 0;
  const carbsPercent = currentGoals.carbs > 0
    ? Math.round((carbsValue / currentGoals.carbs) * 100)
    : 0;
  const fatsPercent = currentGoals.fats > 0
    ? Math.round((fatsValue / currentGoals.fats) * 100)
    : 0;

  if (chartCaloriesLabel) chartCaloriesLabel.textContent = `${caloriesValue}`;
  if (chartProteinLabel) chartProteinLabel.textContent = `${proteinValue}g`;
  if (chartCarbsLabel) chartCarbsLabel.textContent = `${carbsValue}g`;
  if (chartFatsLabel) chartFatsLabel.textContent = `${fatsValue}g`;

  if (chartCaloriesPercent) chartCaloriesPercent.textContent = `${caloriesPercent}%`;
  if (chartProteinPercent) chartProteinPercent.textContent = `${proteinPercent}%`;
  if (chartCarbsPercent) chartCarbsPercent.textContent = `${carbsPercent}%`;
  if (chartFatsPercent) chartFatsPercent.textContent = `${fatsPercent}%`;

  setProgress(chartCaloriesBar, caloriesValue, currentGoals.calories);
  setProgress(chartProteinBar, proteinValue, currentGoals.protein);
  setProgress(chartCarbsBar, carbsValue, currentGoals.carbs);
  setProgress(chartFatsBar, fatsValue, currentGoals.fats);
}

function resetSummary() {
  if (summaryCalories) summaryCalories.textContent = '0';
  if (summaryProtein) summaryProtein.textContent = '0g';
  if (summaryCarbs) summaryCarbs.textContent = '0g';
  if (summaryFats) summaryFats.textContent = '0g';
  if (summaryEntries) summaryEntries.textContent = '0';
  if (summaryCaloriesRemaining) summaryCaloriesRemaining.textContent = `Remaining: ${currentGoals.calories}`;
  if (summaryProteinRemaining) summaryProteinRemaining.textContent = `Remaining: ${currentGoals.protein}g`;
  if (summaryCarbsRemaining) summaryCarbsRemaining.textContent = `Remaining: ${currentGoals.carbs}g`;
  if (summaryFatsRemaining) summaryFatsRemaining.textContent = `Remaining: ${currentGoals.fats}g`;
  if (summaryEntriesHint) summaryEntriesHint.textContent = 'No meals logged yet';

  setProgress(progressCalories, 0, currentGoals.calories);
  setProgress(progressProtein, 0, currentGoals.protein);
  setProgress(progressCarbs, 0, currentGoals.carbs);
  setProgress(progressFats, 0, currentGoals.fats);
  setProgress(progressEntries, 0, DEFAULT_GOALS.entries);
}

function renderGoalLabels() {
  if (summaryCaloriesGoal) summaryCaloriesGoal.textContent = `Goal: ${currentGoals.calories}`;
  if (summaryProteinGoal) summaryProteinGoal.textContent = `Goal: ${currentGoals.protein}g`;
  if (summaryCarbsGoal) summaryCarbsGoal.textContent = `Goal: ${currentGoals.carbs}g`;
  if (summaryFatsGoal) summaryFatsGoal.textContent = `Goal: ${currentGoals.fats}g`;
}

function populateSavedFoodsDropdown() {
  if (!savedFoodDropdown || !savedFoodTriggerText) return;

  if (!customFoodsCache.length) {
    savedFoodTriggerText.textContent = 'Choose a saved food';
    savedFoodDropdown.innerHTML = `
      <div class="p-4 text-sm text-slate-500">
        No saved foods yet
      </div>
    `;
    return;
  }

  savedFoodDropdown.innerHTML = customFoodsCache.map(food => `
    <button
      type="button"
      class="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition"
      data-food-id="${food.id}"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="font-medium text-slate-800 break-words">${escapeHtml(food.foodName)}</span>
        <span class="text-sm text-slate-500 shrink-0">${formatMacroValue(food.calories)} cal</span>
      </div>
    </button>
  `).join('');

  savedFoodDropdown.querySelectorAll('[data-food-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const foodId = button.getAttribute('data-food-id');
      const selectedFood = customFoodsCache.find(food => food.id === foodId);

      if (!selectedFood) {
        if (formMessage) formMessage.textContent = 'Saved food could not be found.';
        return;
      }

      applyCustomFoodToEntryForm(selectedFood);
      savedFoodTriggerText.textContent = selectedFood.foodName;
      savedFoodDropdown.classList.add('hidden');
    });
  });
}

function applyCustomFoodToEntryForm(food) {
  const foodName = document.getElementById('foodName');
  const calories = document.getElementById('calories');
  const protein = document.getElementById('protein');
  const carbs = document.getElementById('carbs');
  const fats = document.getElementById('fats');
  const notes = document.getElementById('notes');

  if (foodName) foodName.value = food.foodName || '';
  if (calories) calories.value = food.calories ?? '';
  if (protein) protein.value = food.protein ?? '';
  if (carbs) carbs.value = food.carbs ?? '';
  if (fats) fats.value = food.fats ?? '';
  if (notes) notes.value = food.notes || '';

  if (formMessage) formMessage.textContent = `Loaded custom food: ${food.foodName}`;
}

function formatMacroValue(value) {
  return value === null || value === undefined || value === '' ? '-' : roundToOne(Number(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setProgress(element, value, goal) {
  if (!element) return;

  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  element.style.width = `${percentage}%`;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function getTodayDateString() {
  const today = new Date();
  return `${today.getFullYear()}-${padNumber(today.getMonth() + 1)}-${padNumber(today.getDate())}`;
}

function shiftDateString(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function syncSelectedDateInput() {
  if (selectedDateInput) {
    selectedDateInput.value = currentSelectedDate;
  }
}

function formatDateForDisplay(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function showSpinner() {
  if (!loadingSpinner) return;
  loadingSpinner.classList.remove('hidden');
}

function hideSpinner() {
  if (!loadingSpinner) return;
  loadingSpinner.classList.add('hidden');
}

function setFormLoadingState(isLoading) {
  const submitButton = entryForm?.querySelector('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = isLoading;

  if (isLoading) {
    submitButton.classList.add('opacity-70', 'cursor-not-allowed');
    submitButton.textContent = 'Saving...';
  } else {
    submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    submitButton.textContent = currentModalMealType ? `Save ${MEAL_LABELS[currentModalMealType]}` : 'Save Meal Entry';
  }
}

function hideStartupOverlay() {
  const overlay = document.getElementById('startupOverlay');
  if (!overlay) return;

  overlay.classList.add('startup-overlay-hidden');

  setTimeout(() => {
    overlay.remove();
  }, 700);
}

async function initApp() {
  const navEntry = performance.getEntriesByType('navigation')[0];
  const isReload = navEntry && navEntry.type === 'reload';
  const hasSeenStartup = sessionStorage.getItem('hasSeenStartup');

  try {
    await loadUser();
  } catch (e) {
    console.error(e);
  } finally {
    if (!hasSeenStartup || isReload) {
      sessionStorage.setItem('hasSeenStartup', 'true');

      setTimeout(() => {
        hideStartupOverlay();
      }, 1500);
    } else {
      hideStartupOverlay();
    }
  }
}

initApp();
syncSelectedDateInput();
setWorkspaceTab('meal');
updateSavedFoodsSummary();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('Service worker registered');
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
}