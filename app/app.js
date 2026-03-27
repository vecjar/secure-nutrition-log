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

const userInfo = document.getElementById('userInfo');
const userRolesInfo = document.getElementById('userRolesInfo');
const userAvatar = document.getElementById('userAvatar');
const accountHeading = document.getElementById('accountHeading');
const adminDashboardBtn = document.getElementById('adminDashboardBtn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const editProfileBtn = document.getElementById('editProfileBtn');

// ==========================
// STATE
// ==========================

let currentUser = null;
let customFoodsCache = [];
let currentSelectedDate = getTodayDateString();

// ==========================
// STARTUP OVERLAY
// ==========================

function hideStartupOverlay() {
  const overlay = document.getElementById('startupOverlay');
  if (!overlay) return;

  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';

  setTimeout(() => {
    overlay.remove();
  }, 500);
}

// ==========================
// INIT
// ==========================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    setupMealButtons();
    setupModal();
    setWorkspaceTab('meal');

    await loadUser();
  } catch (error) {
    console.error('Startup error:', error);
  } finally {
    const hasSeenStartup = sessionStorage.getItem('hasSeenStartup');

    if (!hasSeenStartup) {
      sessionStorage.setItem('hasSeenStartup', 'true');
      setTimeout(() => {
        hideStartupOverlay();
      }, 1200);
    } else {
      hideStartupOverlay();
    }
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    hideStartupOverlay();
  }, 2500);
});

// ==========================
// MODAL LOGIC
// ==========================

function openMealModal(mealType = null) {
  if (!mealModal) return;

  mealModal.classList.remove('hidden');

  if (mealType) {
    const mealSelect = document.getElementById('mealType');
    if (mealSelect) {
      mealSelect.value = mealType;
    }

    if (mealModalTitle) {
      mealModalTitle.textContent = `Add ${MEAL_LABELS[mealType]}`;
    }
  } else {
    if (mealModalTitle) {
      mealModalTitle.textContent = 'Add Meal';
    }
  }
}

function closeMealModal() {
  if (!mealModal) return;
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
      setWorkspaceTab('meal');
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

  addMealTabSection?.classList.toggle('hidden', !isMeal);
  saveCustomTabSection?.classList.toggle('hidden', isMeal);

  if (addMealTabBtn) {
    addMealTabBtn.className = isMeal
      ? 'rounded-2xl bg-green-600 px-4 py-2.5 text-white text-sm font-semibold shadow hover:bg-green-700 transition'
      : 'rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition';
  }

  if (saveCustomTabBtn) {
    saveCustomTabBtn.className = isMeal
      ? 'rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 text-sm font-medium shadow-sm hover:bg-slate-50 transition'
      : 'rounded-2xl bg-lime-600 px-4 py-2.5 text-white text-sm font-semibold shadow hover:bg-lime-700 transition';
  }
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

    const principal = Array.isArray(data) ? data[0]?.clientPrincipal : data?.clientPrincipal;

    if (!principal) {
      currentUser = null;

      if (userInfo) userInfo.textContent = 'Not signed in.';
      if (userRolesInfo) userRolesInfo.textContent = '';
      if (userAvatar) userAvatar.textContent = 'U';
      if (accountHeading) accountHeading.textContent = 'Your Account';

      adminDashboardBtn?.classList.add('hidden');
      signInBtn?.classList.remove('hidden');
      signOutBtn?.classList.add('hidden');
      editProfileBtn?.classList.add('hidden');

      entriesMessage.textContent = 'Please sign in to load your entries.';
      entriesList.innerHTML = '';
      populateSavedFoods();

      return;
    }

    const roles = Array.isArray(principal.userRoles) ? principal.userRoles : [];
    const email = principal.userDetails || '';

    currentUser = {
      id: principal.userId,
      email,
      roles
    };

    if (userInfo) userInfo.textContent = `Signed in as ${email}`;
    if (userRolesInfo) userRolesInfo.textContent = roles.length ? `Roles: ${roles.join(', ')}` : '';
    if (userAvatar) userAvatar.textContent = (email || 'U').charAt(0).toUpperCase();
    if (accountHeading) accountHeading.textContent = 'Your Account';

    signInBtn?.classList.add('hidden');
    signOutBtn?.classList.remove('hidden');
    editProfileBtn?.classList.remove('hidden');

    if (roles.includes('admin')) {
      adminDashboardBtn?.classList.remove('hidden');
    } else {
      adminDashboardBtn?.classList.add('hidden');
    }

    await loadEntries();
    await loadCustomFoods();
  } catch (err) {
    console.error('loadUser error:', err);

    if (userInfo) userInfo.textContent = 'Could not load user.';
    if (userRolesInfo) userRolesInfo.textContent = '';
  }
}

// ==========================
// ENTRIES
// ==========================

entryForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    date: currentSelectedDate,
    mealType: document.getElementById('mealType')?.value,
    foodName: document.getElementById('foodName')?.value,
    calories: Number(document.getElementById('calories')?.value),
    protein: Number(document.getElementById('protein')?.value) || 0,
    carbs: Number(document.getElementById('carbs')?.value) || 0,
    fats: Number(document.getElementById('fats')?.value) || 0,
    notes: document.getElementById('notes')?.value || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/createEntry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to save entry');

    entryForm.reset();
    closeMealModal();
    await loadEntries();
  } catch (err) {
    console.error('createEntry error:', err);
  }
});

// ==========================
// LOAD ENTRIES
// ==========================

async function loadEntries() {
  try {
    if (!entriesMessage || !entriesList) return;

    entriesMessage.textContent = 'Loading...';

    const res = await fetch(`${API_BASE_URL}/getTodayEntries?date=${currentSelectedDate}`);
    const data = await res.json();

    const entries = Array.isArray(data.entries) ? data.entries : [];
    const sortedEntries = sortEntriesByMealOrder(entries);

    renderEntries(sortedEntries);
    entriesMessage.textContent = `${data.count ?? entries.length} entries`;
  } catch (err) {
    console.error('loadEntries error:', err);
    if (entriesMessage) entriesMessage.textContent = 'Could not load entries.';
  }
}

// ==========================
// RENDER ENTRIES
// ==========================

function renderEntries(entries) {
  if (!entriesList) return;

  entriesList.innerHTML = '';

  for (const meal of MEAL_ORDER) {
    const mealEntries = entries.filter(e => (e.mealType || '').toLowerCase() === meal);

    const section = document.createElement('div');
    section.className = 'rounded-3xl border border-slate-200 bg-slate-50/60 p-4 space-y-3';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between gap-3';
    header.innerHTML = `
      <h3 class="text-lg font-bold text-slate-800">${MEAL_LABELS[meal]}</h3>
      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        data-inline-add-meal="${meal}"
      >
        +
      </button>
    `;
    section.appendChild(header);

    if (mealEntries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-400';
      empty.textContent = 'No entries';
      section.appendChild(empty);
    }

    mealEntries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-white border border-slate-200 rounded-2xl shadow-sm';

      card.innerHTML = `
        <div class="flex justify-between gap-4">
          <div class="min-w-0">
            <p class="font-semibold text-slate-800 break-words">${entry.foodName}</p>
            <p class="text-sm text-slate-500 mt-1">${entry.calories} cal</p>
            <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>Protein: ${Number(entry.protein || 0)}g</span>
              <span>Carbs: ${Number(entry.carbs || 0)}g</span>
              <span>Fats: ${Number(entry.fats || 0)}g</span>
            </div>
            ${entry.notes ? `<p class="text-sm text-slate-500 mt-2">${entry.notes}</p>` : ''}
          </div>
        </div>
      `;

      section.appendChild(card);
    });

    entriesList.appendChild(section);
  }

  document.querySelectorAll('[data-inline-add-meal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mealType = btn.getAttribute('data-inline-add-meal');
      setWorkspaceTab('meal');
      openMealModal(mealType);
    });
  });
}

function sortEntriesByMealOrder(entries) {
  return [...entries].sort((a, b) => {
    const mealIndexA = MEAL_ORDER.indexOf((a.mealType || '').toLowerCase());
    const mealIndexB = MEAL_ORDER.indexOf((b.mealType || '').toLowerCase());

    const safeA = mealIndexA === -1 ? 999 : mealIndexA;
    const safeB = mealIndexB === -1 ? 999 : mealIndexB;

    if (safeA !== safeB) {
      return safeA - safeB;
    }

    const createdAtA = a.createdAt || '';
    const createdAtB = b.createdAt || '';
    return createdAtA.localeCompare(createdAtB);
  });
}

// ==========================
// CUSTOM FOODS
// ==========================

customFoodForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    foodName: document.getElementById('customFoodName')?.value,
    calories: Number(document.getElementById('customFoodCalories')?.value),
    protein: Number(document.getElementById('customFoodProtein')?.value) || 0,
    carbs: Number(document.getElementById('customFoodCarbs')?.value) || 0,
    fats: Number(document.getElementById('customFoodFats')?.value) || 0,
    notes: document.getElementById('customFoodNotes')?.value || ''
  };

  try {
    const res = await fetch(`${API_BASE_URL}/createCustomFood`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to save custom food');

    customFoodForm.reset();
    await loadCustomFoods();
    setWorkspaceTab('meal');
  } catch (err) {
    console.error('createCustomFood error:', err);
  }
});

// ==========================
// LOAD CUSTOM FOODS
// ==========================

async function loadCustomFoods() {
  try {
    const res = await fetch(`${API_BASE_URL}/getCustomFoods`);
    const data = await res.json();

    customFoodsCache = Array.isArray(data.foods) ? data.foods : [];
    populateSavedFoods();
  } catch (err) {
    console.error('loadCustomFoods error:', err);
    customFoodsCache = [];
    populateSavedFoods();
  }
}

function populateSavedFoods() {
  if (!savedFoodSelect) return;

  savedFoodSelect.innerHTML = '<option value="">Select food</option>';

  customFoodsCache.forEach(food => {
    const option = document.createElement('option');
    option.value = food.id;
    option.textContent = food.foodName;
    savedFoodSelect.appendChild(option);
  });
}

savedFoodSelect?.addEventListener('change', () => {
  const selectedFoodId = savedFoodSelect.value;
  if (!selectedFoodId) return;

  const selectedFood = customFoodsCache.find(food => food.id === selectedFoodId);
  if (!selectedFood) return;

  const foodName = document.getElementById('foodName');
  const calories = document.getElementById('calories');
  const protein = document.getElementById('protein');
  const carbs = document.getElementById('carbs');
  const fats = document.getElementById('fats');
  const notes = document.getElementById('notes');

  if (foodName) foodName.value = selectedFood.foodName || '';
  if (calories) calories.value = selectedFood.calories ?? '';
  if (protein) protein.value = selectedFood.protein ?? '';
  if (carbs) carbs.value = selectedFood.carbs ?? '';
  if (fats) fats.value = selectedFood.fats ?? '';
  if (notes) notes.value = selectedFood.notes || '';
});

deleteCustomFoodBtn?.addEventListener('click', async () => {
  const selectedFoodId = savedFoodSelect?.value;
  if (!selectedFoodId) return;

  const confirmed = window.confirm('Delete this saved food?');
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/deleteCustomFood?foodId=${encodeURIComponent(selectedFoodId)}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to delete custom food');

    await loadCustomFoods();
  } catch (err) {
    console.error('deleteCustomFood error:', err);
  }
});

// ==========================
// HELPERS
// ==========================

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}