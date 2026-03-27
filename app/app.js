const API_BASE_URL = '/api';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

// ==========================
// DOM ELEMENTS
// ==========================

const entryForm = document.getElementById('entryForm');
const customFoodForm = document.getElementById('customFoodForm');

const savedFoodSelect = document.getElementById('savedFoodSelect');
const deleteCustomFoodBtn = document.getElementById('deleteCustomFoodBtn');

const entriesList = document.getElementById('entriesList');
const entriesMessage = document.getElementById('entriesMessage');

const mealModal = document.getElementById('mealEntryModal');
const closeMealModalBtn = document.getElementById('closeMealModalBtn');
const mealModalTitle = document.getElementById('mealEntryModalTitle');

const addMealTabBtn = document.getElementById('addMealTabBtn');
const saveCustomTabBtn = document.getElementById('saveCustomTabBtn');
const addMealTabSection = document.getElementById('addMealTabSection');
const saveCustomTabSection = document.getElementById('saveCustomTabSection');

// ==========================
// STATE
// ==========================

let currentUser = null;
let customFoodsCache = [];
let currentSelectedDate = getTodayDateString();

// ==========================
// INIT
// ==========================

document.addEventListener('DOMContentLoaded', () => {
  setupMealButtons();
  setupModal();
  loadUser();
});

// ==========================
// MODAL LOGIC
// ==========================

function openMealModal(mealType = null) {
  mealModal.classList.remove('hidden');

  if (mealType) {
    const mealSelect = document.getElementById('mealType');
    mealSelect.value = mealType;

    mealModalTitle.textContent = `Add ${MEAL_LABELS[mealType]}`;
  } else {
    mealModalTitle.textContent = 'Add Meal';
  }
}

function closeMealModal() {
  mealModal.classList.add('hidden');
}

function setupModal() {
  closeMealModalBtn?.addEventListener('click', closeMealModal);

  mealModal?.addEventListener('click', (e) => {
    if (e.target === mealModal) {
      closeMealModal();
    }
  });
}

// ==========================
// MEAL BUTTONS
// ==========================

function setupMealButtons() {
  document.querySelectorAll('[data-open-meal-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mealType = btn.getAttribute('data-meal-type');
      openMealModal(mealType);
    });
  });

  document.getElementById('createCustomMealBtn')?.addEventListener('click', () => {
    openMealModal();
    setWorkspaceTab('custom');
  });
}

// ==========================
// TABS
// ==========================

function setWorkspaceTab(tab) {
  const isMeal = tab === 'meal';

  addMealTabSection.classList.toggle('hidden', !isMeal);
  saveCustomTabSection.classList.toggle('hidden', isMeal);
}

addMealTabBtn?.addEventListener('click', () => setWorkspaceTab('meal'));
saveCustomTabBtn?.addEventListener('click', () => setWorkspaceTab('custom'));

// ==========================
// USER AUTH
// ==========================

async function loadUser() {
  try {
    const res = await fetch('/.auth/me');
    const data = await res.json();

    const principal = data[0]?.clientPrincipal;

    if (!principal) return;

    currentUser = {
      id: principal.userId,
      email: principal.userDetails
    };

    await loadEntries();
    await loadCustomFoods();
  } catch (err) {
    console.error(err);
  }
}

// ==========================
// ENTRIES
// ==========================

entryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    date: currentSelectedDate,
    mealType: document.getElementById('mealType').value,
    foodName: document.getElementById('foodName').value,
    calories: Number(document.getElementById('calories').value),
    protein: Number(document.getElementById('protein').value) || 0,
    carbs: Number(document.getElementById('carbs').value) || 0,
    fats: Number(document.getElementById('fats').value) || 0,
    notes: document.getElementById('notes').value || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/createEntry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    entryForm.reset();
    closeMealModal();
    await loadEntries();
  } catch (err) {
    console.error(err);
  }
});

// ==========================
// LOAD ENTRIES
// ==========================

async function loadEntries() {
  try {
    entriesMessage.textContent = 'Loading...';

    const res = await fetch(`${API_BASE_URL}/getTodayEntries?date=${currentSelectedDate}`);
    const data = await res.json();

    renderEntries(data.entries || []);
    entriesMessage.textContent = `${data.count} entries`;
  } catch (err) {
    console.error(err);
  }
}

// ==========================
// RENDER ENTRIES
// ==========================

function renderEntries(entries) {
  entriesList.innerHTML = '';

  for (const meal of MEAL_ORDER) {
    const mealEntries = entries.filter(e => e.mealType === meal);

    const section = document.createElement('div');
    section.className = 'space-y-3';

    section.innerHTML = `
      <h3 class="text-lg font-bold">${MEAL_LABELS[meal]}</h3>
    `;

    if (mealEntries.length === 0) {
      section.innerHTML += `<p class="text-sm text-slate-400">No entries</p>`;
    }

    mealEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-white border rounded-xl';

      card.innerHTML = `
        <div class="flex justify-between">
          <div>
            <p class="font-semibold">${entry.foodName}</p>
            <p class="text-sm text-slate-500">${entry.calories} cal</p>
          </div>
          <button class="delete-btn text-red-500" data-id="${entry.id}">Delete</button>
        </div>
      `;

      section.appendChild(card);
    });

    entriesList.appendChild(section);
  }
}

// ==========================
// CUSTOM FOODS
// ==========================

customFoodForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    foodName: document.getElementById('customFoodName').value,
    calories: Number(document.getElementById('customFoodCalories').value),
    protein: Number(document.getElementById('customFoodProtein').value) || 0,
    carbs: Number(document.getElementById('customFoodCarbs').value) || 0,
    fats: Number(document.getElementById('customFoodFats').value) || 0,
    notes: document.getElementById('customFoodNotes').value || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/createCustomFood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error();

    customFoodForm.reset();
    await loadCustomFoods();
    setWorkspaceTab('meal');
  } catch (err) {
    console.error(err);
  }
});

// ==========================
// LOAD CUSTOM FOODS
// ==========================

async function loadCustomFoods() {
  try {
    const res = await fetch(`${API_BASE_URL}/getCustomFoods`);
    const data = await res.json();

    customFoodsCache = data.foods || [];

    populateSavedFoods();
  } catch (err) {
    console.error(err);
  }
}

function populateSavedFoods() {
  savedFoodSelect.innerHTML = '<option value="">Select food</option>';

  customFoodsCache.forEach(food => {
    const option = document.createElement('option');
    option.value = food.id;
    option.textContent = food.foodName;
    savedFoodSelect.appendChild(option);
  });
}

// ==========================
// HELPERS
// ==========================

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}