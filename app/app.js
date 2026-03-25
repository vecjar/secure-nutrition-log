const API_BASE_URL = 'https://snlog-dev-func-01-bedydfafhvd3efdh.australiaeast-01.azurewebsites.net/api';

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
const goalsForm = document.getElementById('goalsForm');
const customFoodForm = document.getElementById('customFoodForm');

const formMessage = document.getElementById('formMessage');
const goalsMessage = document.getElementById('goalsMessage');
const customFoodsMessage = document.getElementById('customFoodsMessage');

const loadEntriesBtn = document.getElementById('loadEntriesBtn');
const loadSavedFoodBtn = document.getElementById('loadSavedFoodBtn');

const manualModeBtn = document.getElementById('manualModeBtn');
const savedModeBtn = document.getElementById('savedModeBtn');
const savedFoodSelectorSection = document.getElementById('savedFoodSelectorSection');
const savedFoodSelect = document.getElementById('savedFoodSelect');
const deleteCustomFoodBtn = document.getElementById('deleteCustomFoodBtn');

const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const todayBtn = document.getElementById('todayBtn');
const selectedDateInput = document.getElementById('selectedDate');

const entriesMessage = document.getElementById('entriesMessage');
const entriesList = document.getElementById('entriesList');

const userInfo = document.getElementById('userInfo');
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

let currentUser = null;
let currentGoals = { ...DEFAULT_GOALS };
let customFoodsCache = [];
let currentSelectedDate = getTodayDateString();

entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser?.userId) {
    formMessage.textContent = 'Please sign in before saving entries.';
    return;
  }

  setFormLoadingState(true);
  formMessage.textContent = 'Saving entry...';

  const payload = {
    userId: currentUser.userId,
    date: currentSelectedDate,
    mealType: document.getElementById('mealType').value,
    foodName: document.getElementById('foodName').value,
    calories: Number(document.getElementById('calories').value),
    protein: document.getElementById('protein').value ? Number(document.getElementById('protein').value) : null,
    carbs: document.getElementById('carbs').value ? Number(document.getElementById('carbs').value) : null,
    fats: document.getElementById('fats').value ? Number(document.getElementById('fats').value) : null,
    notes: document.getElementById('notes').value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/createEntry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      formMessage.textContent = data.error || 'Failed to save entry.';
      return;
    }

    formMessage.textContent = `Saved: ${data.entry.foodName} for ${currentSelectedDate}`;
    entryForm.reset();
    await loadEntriesForSelectedDate();
  } catch (error) {
    console.error(error);
    formMessage.textContent = 'Could not save entry. Please try again.';
  } finally {
    setFormLoadingState(false);
  }
});

goalsForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser?.userId) {
    goalsMessage.textContent = 'Please sign in before saving goals.';
    return;
  }

  goalsMessage.textContent = 'Saving goals...';

  const payload = {
    userId: currentUser.userId,
    calories: Number(document.getElementById('goalCalories').value) || DEFAULT_GOALS.calories,
    protein: Number(document.getElementById('goalProtein').value) || DEFAULT_GOALS.protein,
    carbs: Number(document.getElementById('goalCarbs').value) || DEFAULT_GOALS.carbs,
    fats: Number(document.getElementById('goalFats').value) || DEFAULT_GOALS.fats
  };

  try {
    const response = await fetch(`${API_BASE_URL}/saveGoals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      goalsMessage.textContent = data.error || 'Failed to save goals.';
      return;
    }

    currentGoals = {
      ...currentGoals,
      calories: payload.calories,
      protein: payload.protein,
      carbs: payload.carbs,
      fats: payload.fats
    };

    renderGoalLabels();
    await loadEntriesForSelectedDate();
    goalsMessage.textContent = 'Goals saved successfully.';
  } catch (error) {
    console.error(error);
    goalsMessage.textContent = 'Could not save goals.';
  }
});

customFoodForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser?.userId) {
    customFoodsMessage.textContent = 'Please sign in before saving custom foods.';
    return;
  }

  customFoodsMessage.textContent = 'Saving custom food...';

  const payload = {
    userId: currentUser.userId,
    foodName: document.getElementById('customFoodName').value,
    calories: Number(document.getElementById('customFoodCalories').value),
    protein: Number(document.getElementById('customFoodProtein').value) || 0,
    carbs: Number(document.getElementById('customFoodCarbs').value) || 0,
    fats: Number(document.getElementById('customFoodFats').value) || 0,
    notes: document.getElementById('customFoodNotes').value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/createCustomFood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      customFoodsMessage.textContent = data.error || 'Failed to save custom food.';
      return;
    }

    customFoodForm.reset();
    customFoodsMessage.textContent = `Saved custom food: ${data.food.foodName}`;
    await loadCustomFoods();
  } catch (error) {
    console.error(error);
    customFoodsMessage.textContent = 'Could not save custom food.';
  }
});

loadEntriesBtn.addEventListener('click', loadEntriesForSelectedDate);

manualModeBtn.addEventListener('click', () => setEntryMode('manual'));
savedModeBtn.addEventListener('click', () => setEntryMode('saved'));

loadSavedFoodBtn.addEventListener('click', () => {
  const selectedFoodId = savedFoodSelect.value;
  if (!selectedFoodId) {
    formMessage.textContent = 'Please choose a saved food first.';
    return;
  }

  const selectedFood = customFoodsCache.find(food => food.id === selectedFoodId);
  if (!selectedFood) {
    formMessage.textContent = 'Saved food could not be found.';
    return;
  }

  applyCustomFoodToEntryForm(selectedFood);
});

deleteCustomFoodBtn.addEventListener('click', async () => {
  const selectedFoodId = savedFoodSelect.value;
  if (!selectedFoodId) {
    formMessage.textContent = 'Please choose a saved food to delete.';
    return;
  }

  const selectedFood = customFoodsCache.find(food => food.id === selectedFoodId);
  if (!selectedFood) {
    formMessage.textContent = 'Saved food could not be found.';
    return;
  }

  const confirmed = window.confirm(`Delete saved food "${selectedFood.foodName}"?`);
  if (!confirmed) return;

  await deleteCustomFood(selectedFood.id, selectedFood.partitionKey);
});

prevDayBtn.addEventListener('click', async () => {
  currentSelectedDate = shiftDateString(currentSelectedDate, -1);
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

nextDayBtn.addEventListener('click', async () => {
  currentSelectedDate = shiftDateString(currentSelectedDate, 1);
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

todayBtn.addEventListener('click', async () => {
  currentSelectedDate = getTodayDateString();
  syncSelectedDateInput();
  await loadEntriesForSelectedDate();
});

selectedDateInput.addEventListener('change', async (event) => {
  if (!event.target.value) return;
  currentSelectedDate = event.target.value;
  await loadEntriesForSelectedDate();
});

entriesList.addEventListener('click', async (event) => {
  if (event.target.classList.contains('delete-btn')) {
    const entryId = event.target.getAttribute('data-entry-id');
    const partitionKey = event.target.getAttribute('data-partition-key');

    if (!entryId || !partitionKey) return;

    const confirmed = window.confirm('Delete this entry?');
    if (!confirmed) return;

    await deleteEntry(entryId, partitionKey);
  }
});

async function loadEntriesForSelectedDate() {
  if (!currentUser?.userId) {
    entriesMessage.textContent = 'Please sign in to load your entries.';
    entriesList.innerHTML = '';
    resetSummary();
    renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
    hideSpinner();
    return;
  }

  entriesMessage.textContent = 'Loading entries...';
  entriesList.innerHTML = '';
  showSpinner();
  setLoadButtonLoadingState(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/getTodayEntries?userId=${encodeURIComponent(currentUser.userId)}&date=${encodeURIComponent(currentSelectedDate)}`
    );
    const data = await response.json();

    if (!response.ok) {
      entriesMessage.textContent = data.error || 'Failed to load entries.';
      return;
    }

    entriesMessage.textContent = `Found ${data.count} entr${data.count === 1 ? 'y' : 'ies'} for ${data.date}.`;

    const sortedEntries = sortEntriesByMealOrder(data.entries);
    const totals = calculateTotals(sortedEntries);

    updateSummaryFromTotals(totals, sortedEntries.length);
    renderMacroChart(totals, data.date);

    if (sortedEntries.length === 0) {
      entriesList.innerHTML = `
        <li class="rounded-2xl border border-dashed border-green-200 bg-green-50/60 p-4 text-sm text-slate-600">
          No entries yet for ${formatDateForDisplay(data.date)}.
        </li>
      `;
      return;
    }

    renderEntriesGroupedByMeal(sortedEntries);
  } catch (error) {
    console.error(error);
    entriesMessage.textContent = 'Could not load entries for the selected day.';
  } finally {
    hideSpinner();
    setLoadButtonLoadingState(false);
  }
}

async function loadGoals() {
  if (!currentUser?.userId) {
    currentGoals = { ...DEFAULT_GOALS };
    populateGoalsForm();
    renderGoalLabels();
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/getGoals?userId=${encodeURIComponent(currentUser.userId)}`
    );
    const data = await response.json();

    if (!response.ok || !data.goals) {
      currentGoals = { ...DEFAULT_GOALS };
    } else {
      currentGoals = {
        ...DEFAULT_GOALS,
        calories: Number(data.goals.calories) || DEFAULT_GOALS.calories,
        protein: Number(data.goals.protein) || DEFAULT_GOALS.protein,
        carbs: Number(data.goals.carbs) || DEFAULT_GOALS.carbs,
        fats: Number(data.goals.fats) || DEFAULT_GOALS.fats
      };
    }

    populateGoalsForm();
    renderGoalLabels();
  } catch (error) {
    console.error(error);
    currentGoals = { ...DEFAULT_GOALS };
    populateGoalsForm();
    renderGoalLabels();
  }
}

async function loadCustomFoods() {
  if (!currentUser?.userId) {
    customFoodsCache = [];
    populateSavedFoodsDropdown();
    customFoodsMessage.textContent = 'Please sign in to view custom foods.';
    return;
  }

  customFoodsMessage.textContent = 'Loading custom foods...';

  try {
    const response = await fetch(
      `${API_BASE_URL}/getCustomFoods?userId=${encodeURIComponent(currentUser.userId)}`
    );
    const data = await response.json();

    if (!response.ok) {
      customFoodsMessage.textContent = data.error || 'Failed to load custom foods.';
      return;
    }

    customFoodsCache = data.foods;
    populateSavedFoodsDropdown();

    if (data.foods.length === 0) {
      customFoodsMessage.textContent = 'No custom foods saved yet.';
      return;
    }

    customFoodsMessage.textContent = `Found ${data.foods.length} saved food${data.foods.length === 1 ? '' : 's'}.`;
  } catch (error) {
    console.error(error);
    customFoodsMessage.textContent = 'Could not load custom foods.';
  }
}

async function deleteEntry(entryId, partitionKey) {
  showSpinner();
  setLoadButtonLoadingState(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/deleteEntry?partitionKey=${encodeURIComponent(partitionKey)}&entryId=${encodeURIComponent(entryId)}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    if (!response.ok) {
      entriesMessage.textContent = data.error || 'Failed to delete entry.';
      return;
    }

    entriesMessage.textContent = 'Entry deleted successfully.';
    await loadEntriesForSelectedDate();
  } catch (error) {
    console.error(error);
    entriesMessage.textContent = 'Could not delete entry.';
  } finally {
    hideSpinner();
    setLoadButtonLoadingState(false);
  }
}

async function deleteCustomFood(foodId, partitionKey) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/deleteCustomFood?partitionKey=${encodeURIComponent(partitionKey)}&foodId=${encodeURIComponent(foodId)}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    if (!response.ok) {
      formMessage.textContent = data.error || 'Failed to delete saved food.';
      return;
    }

    formMessage.textContent = 'Saved food deleted successfully.';
    await loadCustomFoods();
  } catch (error) {
    console.error(error);
    formMessage.textContent = 'Could not delete saved food.';
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
      userInfo.textContent = 'Not signed in.';
      formMessage.textContent = 'Please sign in to save entries.';
      entriesMessage.textContent = 'Please sign in to load your entries.';
      customFoodsMessage.textContent = 'Please sign in to use custom foods.';
      goalsMessage.textContent = 'Please sign in to save goals.';
      customFoodsCache = [];
      populateSavedFoodsDropdown();
      currentGoals = { ...DEFAULT_GOALS };
      populateGoalsForm();
      renderGoalLabels();
      resetSummary();
      renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
      hideSpinner();
      return;
    }

    const resolvedUserId =
      clientPrincipal.userId ||
      clientPrincipal.userDetails;

    currentUser = {
      userId: resolvedUserId,
      userDetails: clientPrincipal.userDetails
    };

    userInfo.textContent = `Signed in as ${clientPrincipal.userDetails}`;
    syncSelectedDateInput();
    await loadGoals();
    await loadCustomFoods();
    await loadEntriesForSelectedDate();
  } catch (error) {
    console.error(error);
    currentUser = null;
    userInfo.textContent = 'User info could not be loaded.';
    customFoodsCache = [];
    populateSavedFoodsDropdown();
    currentGoals = { ...DEFAULT_GOALS };
    populateGoalsForm();
    renderGoalLabels();
    resetSummary();
    renderMacroChart({ calories: 0, protein: 0, carbs: 0, fats: 0 }, currentSelectedDate);
    hideSpinner();
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
    return createdAtA.localeCompare(createdAtB);
  });
}

function renderEntriesGroupedByMeal(entries) {
  entriesList.innerHTML = '';

  for (const mealType of MEAL_ORDER) {
    const mealEntries = entries.filter(entry => (entry.mealType || '').toLowerCase() === mealType);

    if (mealEntries.length === 0) {
      continue;
    }

    const sectionLi = document.createElement('li');
    sectionLi.className = 'space-y-3';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'flex items-center gap-3';
    sectionTitle.innerHTML = `
      <h3 class="text-xl font-semibold text-slate-800">${MEAL_LABELS[mealType]}</h3>
      <span class="text-sm text-slate-500">${mealEntries.length} entr${mealEntries.length === 1 ? 'y' : 'ies'}</span>
    `;

    sectionLi.appendChild(sectionTitle);

    const innerList = document.createElement('div');
    innerList.className = 'space-y-3';

    for (const entry of mealEntries) {
      const entryCard = document.createElement('div');
      entryCard.className = 'bg-green-50 border border-green-100 rounded-2xl p-4 shadow-sm';

      entryCard.innerHTML = `
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p class="text-lg font-semibold text-green-800">${entry.foodName}</p>
            <p class="text-sm text-slate-500 capitalize">${entry.mealType}</p>
          </div>

          <button
            type="button"
            class="delete-btn inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-600 transition"
            data-entry-id="${entry.id}"
            data-partition-key="${entry.partitionKey}">
            Delete
          </button>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700 md:grid-cols-4">
          <div class="rounded-xl bg-white px-3 py-2 border border-green-100">
            <span class="block text-xs text-slate-500">Calories</span>
            <span class="font-semibold">${entry.calories}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-green-100">
            <span class="block text-xs text-slate-500">Protein</span>
            <span class="font-semibold">${entry.protein ?? '-'}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-green-100">
            <span class="block text-xs text-slate-500">Carbs</span>
            <span class="font-semibold">${entry.carbs ?? '-'}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-green-100">
            <span class="block text-xs text-slate-500">Fats</span>
            <span class="font-semibold">${entry.fats ?? '-'}</span>
          </div>
        </div>

        <div class="mt-3 text-sm text-slate-600">
          <span class="font-medium text-slate-700">Notes:</span> ${entry.notes || '-'}
        </div>
      `;

      innerList.appendChild(entryCard);
    }

    sectionLi.appendChild(innerList);
    entriesList.appendChild(sectionLi);
  }
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

  setProgress(progressCalories, totals.calories, currentGoals.calories);
  setProgress(progressProtein, totals.protein, currentGoals.protein);
  setProgress(progressCarbs, totals.carbs, currentGoals.carbs);
  setProgress(progressFats, totals.fats, currentGoals.fats);
  setProgress(progressEntries, entryCount, DEFAULT_GOALS.entries);
}

function renderMacroChart(totals, dateString) {
  if (chartDateLabel) chartDateLabel.textContent = formatDateForDisplay(dateString);

  if (chartCaloriesLabel) chartCaloriesLabel.textContent = `${Math.round(totals.calories)}`;
  if (chartProteinLabel) chartProteinLabel.textContent = `${roundToOne(totals.protein)}g`;
  if (chartCarbsLabel) chartCarbsLabel.textContent = `${roundToOne(totals.carbs)}g`;
  if (chartFatsLabel) chartFatsLabel.textContent = `${roundToOne(totals.fats)}g`;

  setProgress(chartCaloriesBar, totals.calories, currentGoals.calories);
  setProgress(chartProteinBar, totals.protein, currentGoals.protein);
  setProgress(chartCarbsBar, totals.carbs, currentGoals.carbs);
  setProgress(chartFatsBar, totals.fats, currentGoals.fats);
}

function resetSummary() {
  if (summaryCalories) summaryCalories.textContent = '0';
  if (summaryProtein) summaryProtein.textContent = '0g';
  if (summaryCarbs) summaryCarbs.textContent = '0g';
  if (summaryFats) summaryFats.textContent = '0g';
  if (summaryEntries) summaryEntries.textContent = '0';

  setProgress(progressCalories, 0, currentGoals.calories);
  setProgress(progressProtein, 0, currentGoals.protein);
  setProgress(progressCarbs, 0, currentGoals.carbs);
  setProgress(progressFats, 0, currentGoals.fats);
  setProgress(progressEntries, 0, DEFAULT_GOALS.entries);
}

function populateGoalsForm() {
  document.getElementById('goalCalories').value = currentGoals.calories;
  document.getElementById('goalProtein').value = currentGoals.protein;
  document.getElementById('goalCarbs').value = currentGoals.carbs;
  document.getElementById('goalFats').value = currentGoals.fats;
}

function renderGoalLabels() {
  if (summaryCaloriesGoal) summaryCaloriesGoal.textContent = `Goal: ${currentGoals.calories}`;
  if (summaryProteinGoal) summaryProteinGoal.textContent = `Goal: ${currentGoals.protein}g`;
  if (summaryCarbsGoal) summaryCarbsGoal.textContent = `Goal: ${currentGoals.carbs}g`;
  if (summaryFatsGoal) summaryFatsGoal.textContent = `Goal: ${currentGoals.fats}g`;
}

function populateSavedFoodsDropdown() {
  if (!savedFoodSelect) return;

  savedFoodSelect.innerHTML = '<option value="">Select a saved food</option>';

  for (const food of customFoodsCache) {
    const option = document.createElement('option');
    option.value = food.id;
    option.textContent = `${food.foodName} (${food.calories} cal)`;
    savedFoodSelect.appendChild(option);
  }
}

function applyCustomFoodToEntryForm(food) {
  document.getElementById('foodName').value = food.foodName || '';
  document.getElementById('calories').value = food.calories ?? '';
  document.getElementById('protein').value = food.protein ?? '';
  document.getElementById('carbs').value = food.carbs ?? '';
  document.getElementById('fats').value = food.fats ?? '';
  document.getElementById('notes').value = food.notes || '';
  formMessage.textContent = `Loaded custom food: ${food.foodName}`;
}

function setEntryMode(mode) {
  const isSavedMode = mode === 'saved';

  if (savedFoodSelectorSection) {
    savedFoodSelectorSection.classList.toggle('hidden', !isSavedMode);
  }

  if (manualModeBtn) {
    manualModeBtn.className = isSavedMode
      ? 'rounded-xl border border-slate-300 px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-50 transition'
      : 'rounded-xl bg-green-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-green-700 transition';
  }

  if (savedModeBtn) {
    savedModeBtn.className = isSavedMode
      ? 'rounded-xl bg-lime-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-lime-700 transition'
      : 'rounded-xl border border-slate-300 px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-50 transition';
  }
}

function setProgress(element, value, goal) {
  if (!element) return;

  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  element.style.width = `${percentage}%`;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function shiftDateString(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function syncSelectedDateInput() {
  if (selectedDateInput) {
    selectedDateInput.value = currentSelectedDate;
  }
}

function formatDateForDisplay(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
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
    submitButton.textContent = 'Save Entry';
  }
}

function setLoadButtonLoadingState(isLoading) {
  if (!loadEntriesBtn) return;

  loadEntriesBtn.disabled = isLoading;

  if (isLoading) {
    loadEntriesBtn.classList.add('opacity-70', 'cursor-not-allowed');
    loadEntriesBtn.textContent = 'Loading...';
  } else {
    loadEntriesBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    loadEntriesBtn.textContent = 'Load Selected Day';
  }
}

syncSelectedDateInput();
setEntryMode('manual');
loadUser();