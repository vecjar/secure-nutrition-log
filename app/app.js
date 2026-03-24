const API_BASE_URL = 'https://snlog-dev-func-01-bedydfafhvd3efdh.australiaeast-01.azurewebsites.net/api';

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 180,
  carbs: 220,
  fats: 70,
  entries: 6
};

const entryForm = document.getElementById('entryForm');
const goalsForm = document.getElementById('goalsForm');
const customFoodForm = document.getElementById('customFoodForm');

const formMessage = document.getElementById('formMessage');
const goalsMessage = document.getElementById('goalsMessage');
const customFoodsMessage = document.getElementById('customFoodsMessage');

const loadEntriesBtn = document.getElementById('loadEntriesBtn');
const loadCustomFoodsBtn = document.getElementById('loadCustomFoodsBtn');
const loadSavedFoodBtn = document.getElementById('loadSavedFoodBtn');

const manualModeBtn = document.getElementById('manualModeBtn');
const savedModeBtn = document.getElementById('savedModeBtn');
const savedFoodSelectorSection = document.getElementById('savedFoodSelectorSection');
const savedFoodSelect = document.getElementById('savedFoodSelect');

const entriesMessage = document.getElementById('entriesMessage');
const entriesList = document.getElementById('entriesList');
const customFoodsList = document.getElementById('customFoodsList');

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

let currentUser = null;
let currentGoals = { ...DEFAULT_GOALS };
let customFoodsCache = [];

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

    formMessage.textContent = `Saved: ${data.entry.foodName}`;
    entryForm.reset();
    await loadTodayEntries();
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
    await loadTodayEntries();
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

loadEntriesBtn.addEventListener('click', loadTodayEntries);
loadCustomFoodsBtn.addEventListener('click', loadCustomFoods);

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

customFoodsList.addEventListener('click', async (event) => {
  if (event.target.classList.contains('use-food-btn')) {
    const foodId = event.target.getAttribute('data-food-id');
    const selectedFood = customFoodsCache.find(food => food.id === foodId);

    if (!selectedFood) return;

    applyCustomFoodToEntryForm(selectedFood);
    setEntryMode('manual');
    formMessage.textContent = `Loaded custom food: ${selectedFood.foodName}`;
  }

  if (event.target.classList.contains('delete-custom-food-btn')) {
    const foodId = event.target.getAttribute('data-food-id');
    const partitionKey = event.target.getAttribute('data-partition-key');

    if (!foodId || !partitionKey) return;

    const confirmed = window.confirm('Delete this custom food?');
    if (!confirmed) return;

    await deleteCustomFood(foodId, partitionKey);
  }
});

async function loadTodayEntries() {
  if (!currentUser?.userId) {
    entriesMessage.textContent = 'Please sign in to load your entries.';
    entriesList.innerHTML = '';
    resetSummary();
    hideSpinner();
    return;
  }

  entriesMessage.textContent = 'Loading entries...';
  entriesList.innerHTML = '';
  showSpinner();
  setLoadButtonLoadingState(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/getTodayEntries?userId=${encodeURIComponent(currentUser.userId)}`
    );
    const data = await response.json();

    if (!response.ok) {
      entriesMessage.textContent = data.error || 'Failed to load entries.';
      return;
    }

    entriesMessage.textContent = `Found ${data.count} entr${data.count === 1 ? 'y' : 'ies'} for ${data.date}.`;

    if (data.entries.length === 0) {
      resetSummary();
      entriesList.innerHTML = `
        <li class="rounded-2xl border border-dashed border-green-200 bg-green-50/60 p-4 text-sm text-slate-600">
          No entries yet for today.
        </li>
      `;
      return;
    }

    updateSummary(data.entries);

    for (const entry of data.entries) {
      const li = document.createElement('li');
      li.className = 'bg-green-50 border border-green-100 rounded-2xl p-4 shadow-sm';

      li.innerHTML = `
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

      entriesList.appendChild(li);
    }
  } catch (error) {
    console.error(error);
    entriesMessage.textContent = 'Could not load today’s entries.';
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
    customFoodsList.innerHTML = '';
    populateSavedFoodsDropdown();
    customFoodsMessage.textContent = 'Please sign in to view custom foods.';
    return;
  }

  customFoodsMessage.textContent = 'Loading custom foods...';
  customFoodsList.innerHTML = '';

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
      customFoodsList.innerHTML = `
        <li class="rounded-2xl border border-dashed border-lime-200 bg-lime-50/60 p-4 text-sm text-slate-600">
          Save a custom food to reuse it later.
        </li>
      `;
      return;
    }

    customFoodsMessage.textContent = `Found ${data.foods.length} saved food${data.foods.length === 1 ? '' : 's'}.`;

    for (const food of data.foods) {
      const li = document.createElement('li');
      li.className = 'bg-lime-50 border border-lime-100 rounded-2xl p-4 shadow-sm';

      li.innerHTML = `
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p class="text-lg font-semibold text-lime-800">${food.foodName}</p>
            <p class="text-sm text-slate-500">${food.notes || 'No notes'}</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="use-food-btn inline-flex items-center justify-center rounded-xl bg-lime-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-lime-700 transition"
              data-food-id="${food.id}">
              Use Food
            </button>

            <button
              type="button"
              class="delete-custom-food-btn inline-flex items-center justify-center rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-600 transition"
              data-food-id="${food.id}"
              data-partition-key="${food.partitionKey}">
              Delete
            </button>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700 md:grid-cols-4">
          <div class="rounded-xl bg-white px-3 py-2 border border-lime-100">
            <span class="block text-xs text-slate-500">Calories</span>
            <span class="font-semibold">${food.calories}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-lime-100">
            <span class="block text-xs text-slate-500">Protein</span>
            <span class="font-semibold">${food.protein ?? '-'}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-lime-100">
            <span class="block text-xs text-slate-500">Carbs</span>
            <span class="font-semibold">${food.carbs ?? '-'}</span>
          </div>
          <div class="rounded-xl bg-white px-3 py-2 border border-lime-100">
            <span class="block text-xs text-slate-500">Fats</span>
            <span class="font-semibold">${food.fats ?? '-'}</span>
          </div>
        </div>
      `;

      customFoodsList.appendChild(li);
    }
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
    await loadTodayEntries();
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
      customFoodsMessage.textContent = data.error || 'Failed to delete custom food.';
      return;
    }

    customFoodsMessage.textContent = 'Custom food deleted successfully.';
    await loadCustomFoods();
  } catch (error) {
    console.error(error);
    customFoodsMessage.textContent = 'Could not delete custom food.';
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
      entriesList.innerHTML = '';
      customFoodsList.innerHTML = '';
      customFoodsCache = [];
      populateSavedFoodsDropdown();
      currentGoals = { ...DEFAULT_GOALS };
      populateGoalsForm();
      renderGoalLabels();
      resetSummary();
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
    await loadGoals();
    await loadCustomFoods();
    await loadTodayEntries();
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
    hideSpinner();
  }
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

function updateSummary(entries) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.calories += Number(entry.calories) || 0;
      acc.protein += Number(entry.protein) || 0;
      acc.carbs += Number(entry.carbs) || 0;
      acc.fats += Number(entry.fats) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  if (summaryCalories) summaryCalories.textContent = Math.round(totals.calories);
  if (summaryProtein) summaryProtein.textContent = `${roundToOne(totals.protein)}g`;
  if (summaryCarbs) summaryCarbs.textContent = `${roundToOne(totals.carbs)}g`;
  if (summaryFats) summaryFats.textContent = `${roundToOne(totals.fats)}g`;
  if (summaryEntries) summaryEntries.textContent = entries.length;

  setProgress(progressCalories, totals.calories, currentGoals.calories);
  setProgress(progressProtein, totals.protein, currentGoals.protein);
  setProgress(progressCarbs, totals.carbs, currentGoals.carbs);
  setProgress(progressFats, totals.fats, currentGoals.fats);
  setProgress(progressEntries, entries.length, DEFAULT_GOALS.entries);
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

function setProgress(element, value, goal) {
  if (!element) return;

  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  element.style.width = `${percentage}%`;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
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
    loadEntriesBtn.textContent = "Load Today's Entries";
  }
}

setEntryMode('manual');
loadUser();