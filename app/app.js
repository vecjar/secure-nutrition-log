const API_BASE_URL = 'http://localhost:7071/api';

const entryForm = document.getElementById('entryForm');
const formMessage = document.getElementById('formMessage');
const loadEntriesBtn = document.getElementById('loadEntriesBtn');
const entriesMessage = document.getElementById('entriesMessage');
const entriesList = document.getElementById('entriesList');
const userInfo = document.getElementById('userInfo');

entryForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  formMessage.textContent = 'Saving entry...';

  const payload = {
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
    formMessage.textContent = 'Request failed.';
  }
});

loadEntriesBtn.addEventListener('click', loadTodayEntries);

async function loadTodayEntries() {
  entriesMessage.textContent = 'Loading entries...';
  entriesList.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE_URL}/getTodayEntries`);
    const data = await response.json();

    if (!response.ok) {
      entriesMessage.textContent = data.error || 'Failed to load entries.';
      return;
    }

    entriesMessage.textContent = `Found ${data.count} entr${data.count === 1 ? 'y' : 'ies'} for ${data.date}.`;

    if (data.entries.length === 0) {
      entriesList.innerHTML = '<li>No entries yet for today.</li>';
      return;
    }

    for (const entry of data.entries) {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${entry.foodName}</strong> (${entry.mealType})
        <div class="meta">
          Calories: ${entry.calories} |
          Protein: ${entry.protein ?? '-'} |
          Carbs: ${entry.carbs ?? '-'} |
          Fats: ${entry.fats ?? '-'}
        </div>
        <div class="meta">Notes: ${entry.notes || '-'}</div>
      `;
      entriesList.appendChild(li);
    }
  } catch (error) {
    console.error(error);
    entriesMessage.textContent = 'Request failed.';
  }
}

async function loadUser() {
  if (!userInfo) return;

  try {
    const response = await fetch('/.auth/me');
    const data = await response.json();

    const clientPrincipal = data?.clientPrincipal;

    if (!clientPrincipal) {
      userInfo.textContent = 'Not signed in.';
      return;
    }

    userInfo.textContent = `Signed in as ${clientPrincipal.userDetails}`;
  } catch (error) {
    console.error(error);
    userInfo.textContent = 'User info only works after deployment to Azure Static Web Apps.';
  }
}

loadUser();