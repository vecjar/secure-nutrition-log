const API_BASE_URL = 'https://snlog-dev-func-01-bedydfafhvd3efdh.australiaeast-01.azurewebsites.net/api';

const entryForm = document.getElementById('entryForm');
const formMessage = document.getElementById('formMessage');
const loadEntriesBtn = document.getElementById('loadEntriesBtn');
const entriesMessage = document.getElementById('entriesMessage');
const entriesList = document.getElementById('entriesList');
const userInfo = document.getElementById('userInfo');
const loadingSpinner = document.getElementById('loadingSpinner');
const summaryCalories = document.getElementById('summaryCalories');
const summaryProtein = document.getElementById('summaryProtein');
const summaryCarbs = document.getElementById('summaryCarbs');
const summaryFats = document.getElementById('summaryFats');
const summaryEntries = document.getElementById('summaryEntries');

let currentUser = null;

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

loadEntriesBtn.addEventListener('click', loadTodayEntries);

entriesList.addEventListener('click', async (event) => {
  if (event.target.classList.contains('delete-btn')) {
    const entryId = event.target.getAttribute('data-entry-id');
    const partitionKey = event.target.getAttribute('data-partition-key');

    console.log('Delete clicked:', { entryId, partitionKey });

    if (!entryId || !partitionKey) return;

    const confirmed = window.confirm('Delete this entry?');
    if (!confirmed) return;

    await deleteEntry(entryId, partitionKey);
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

async function loadUser() {
  if (!userInfo) return;

  try {
    const response = await fetch('/.auth/me');
    const data = await response.json();
    const clientPrincipal = data?.clientPrincipal;

    if (!clientPrincipal) {
      currentUser = null;
      userInfo.textContent = 'Not signed in.';
      formMessage.textContent = 'Please sign in to save entries.';
      entriesMessage.textContent = 'Please sign in to load your entries.';
      entriesList.innerHTML = '';
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

    console.log('Resolved current user:', currentUser);

    userInfo.textContent = `Signed in as ${clientPrincipal.userDetails}`;
    await loadTodayEntries();
  } catch (error) {
    console.error(error);
    currentUser = null;
    userInfo.textContent = 'User info could not be loaded.';
    resetSummary();
    hideSpinner();
  }
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
}

function resetSummary() {
  if (summaryCalories) summaryCalories.textContent = '0';
  if (summaryProtein) summaryProtein.textContent = '0g';
  if (summaryCarbs) summaryCarbs.textContent = '0g';
  if (summaryFats) summaryFats.textContent = '0g';
  if (summaryEntries) summaryEntries.textContent = '0';
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

loadUser();