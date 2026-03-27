const adminDebugOutput = document.getElementById('adminDebugOutput');

const kpiMealsToday = document.getElementById('kpiMealsToday');
const kpiSavedFoods = document.getElementById('kpiSavedFoods');
const kpiProfilesCompleted = document.getElementById('kpiProfilesCompleted');
const kpiUsers = document.getElementById('kpiUsers');

const healthProfilesMissing = document.getElementById('healthProfilesMissing');
const healthEntriesMissingMacros = document.getElementById('healthEntriesMissingMacros');
const healthInactiveUsers = document.getElementById('healthInactiveUsers');

const userOverviewTable = document.getElementById('userOverviewTable');
const recentActivityList = document.getElementById('recentActivityList');

let mealBreakdownChartInstance = null;
let systemOverviewChartInstance = null;

async function loadAdminDashboard() {
  try {
    const response = await fetch('/api/rolecheck/admin-data');
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Admin API did not return valid JSON: ${text}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Failed to load admin data (${response.status})`);
    }

    adminDebugOutput.textContent = JSON.stringify(data, null, 2);

    const normalized = normalizeAdminData(data);

    renderKpis(normalized);
    renderHealth(normalized);
    renderUserTable(normalized.users);
    renderRecentActivity(normalized.activity);
    renderCharts(normalized);
  } catch (error) {
    console.error(error);
    adminDebugOutput.textContent = `Failed to load admin dashboard.\n\n${error.message}`;
    renderFallbackState(error.message);
  }
}

function normalizeAdminData(data) {
  const stats = data.stats || {};

  const users = Array.isArray(data.users) ? data.users : [];
  const activity = Array.isArray(data.recentActivity) ? data.recentActivity : [];
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const foods = Array.isArray(data.customFoods) ? data.customFoods : [];
  const profiles = Array.isArray(data.profiles) ? data.profiles : [];

  const totalEntries = Number(stats.totalEntries ?? entries.length ?? 0) || 0;
  const totalCustomFoods = Number(stats.totalCustomFoods ?? foods.length ?? 0) || 0;
  const totalGoals = Number(stats.totalGoals ?? profiles.length ?? 0) || 0;
  const totalUsers = Number(stats.totalUsers ?? users.length ?? 0) || 0;

  const profilesCompleted = calculateProfilesCompleted(users, profiles, totalGoals);
  const profilesMissing = Math.max(0, totalUsers - profilesCompleted);
  const entriesMissingMacros = calculateEntriesMissingMacros(entries, stats.entriesMissingMacros);
  const inactiveUsers = calculateInactiveUsers(users, totalUsers);

  const recordsTracked = Number(stats.mealsToday ?? totalEntries) || 0;

  return {
    raw: data,
    stats: {
      totalEntries,
      totalCustomFoods,
      totalGoals,
      totalUsers,
      recordsTracked,
      profilesCompleted,
      profilesMissing,
      entriesMissingMacros,
      inactiveUsers
    },
    users,
    activity,
    entries,
    foods,
    profiles
  };
}

function calculateProfilesCompleted(users, profiles, fallbackTotalGoals) {
  if (profiles.length > 0) return profiles.length;
  if (fallbackTotalGoals > 0) return fallbackTotalGoals;

  let completed = 0;
  for (const user of users) {
    if (user.profileComplete === true) completed += 1;
  }
  return completed;
}

function calculateEntriesMissingMacros(entries, fallbackValue) {
  if (fallbackValue !== undefined && fallbackValue !== null) {
    return Number(fallbackValue) || 0;
  }

  let count = 0;
  for (const entry of entries) {
    const missingProtein = entry.protein === null || entry.protein === undefined;
    const missingCarbs = entry.carbs === null || entry.carbs === undefined;
    const missingFats = entry.fats === null || entry.fats === undefined;

    if (missingProtein || missingCarbs || missingFats) {
      count += 1;
    }
  }
  return count;
}

function calculateInactiveUsers(users, fallbackTotalUsers) {
  if (!users.length) {
    return fallbackTotalUsers > 0 ? fallbackTotalUsers : 0;
  }

  let count = 0;
  for (const user of users) {
    if (!user.lastActive && !user.updatedAt) {
      count += 1;
    }
  }
  return count;
}

function renderKpis(data) {
  kpiMealsToday.textContent = data.stats.recordsTracked;
  kpiSavedFoods.textContent = data.stats.totalCustomFoods;
  kpiProfilesCompleted.textContent = data.stats.profilesCompleted;
  kpiUsers.textContent = data.stats.totalUsers;
}

function renderHealth(data) {
  healthProfilesMissing.textContent = data.stats.profilesMissing;
  healthEntriesMissingMacros.textContent = data.stats.entriesMissingMacros;
  healthInactiveUsers.textContent = data.stats.inactiveUsers;
}

function renderUserTable(users) {
  if (!users.length) {
    userOverviewTable.innerHTML = `
      <tr>
        <td colspan="5" class="py-4 text-slate-500">No detailed user data available yet from the admin API.</td>
      </tr>
    `;
    return;
  }

  userOverviewTable.innerHTML = users.map((user) => {
    const userLabel = user.userDetails || user.email || user.userId || 'Unknown user';
    const entriesCount = user.entriesCount ?? user.totalEntries ?? '-';
    const savedFoodsCount = user.savedFoodsCount ?? user.totalCustomFoods ?? '-';
    const profileComplete = user.profileComplete === true
      ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Complete</span>'
      : '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Missing</span>';
    const lastActive = formatAdminDate(user.lastActive || user.updatedAt);

    return `
      <tr class="align-top">
        <td class="py-4 pr-4 text-slate-800">${escapeHtml(userLabel)}</td>
        <td class="py-4 pr-4 text-slate-600">${escapeHtml(String(entriesCount))}</td>
        <td class="py-4 pr-4 text-slate-600">${escapeHtml(String(savedFoodsCount))}</td>
        <td class="py-4 pr-4">${profileComplete}</td>
        <td class="py-4 text-slate-600">${escapeHtml(lastActive)}</td>
      </tr>
    `;
  }).join('');
}

function renderRecentActivity(activity) {
  if (!activity.length) {
    recentActivityList.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        No recent activity data available yet from the admin API.
      </div>
    `;
    return;
  }

  recentActivityList.innerHTML = activity.map((item) => {
    const title = item.title || item.action || 'Activity';
    const subtitle = item.description || item.userDetails || item.userId || 'System event';
    const timestamp = formatAdminDate(item.timestamp || item.createdAt || item.updatedAt);

    return `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-slate-800">${escapeHtml(title)}</p>
            <p class="text-sm text-slate-500 mt-1">${escapeHtml(subtitle)}</p>
          </div>
          <span class="text-xs text-slate-400 whitespace-nowrap">${escapeHtml(timestamp)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderCharts(data) {
  renderUserStatusChart(data.stats);
  renderAdminSnapshotChart(data.stats);
}

function renderUserStatusChart(stats) {
  const ctx = document.getElementById('mealBreakdownChart');
  if (!ctx) return;

  if (mealBreakdownChartInstance) {
    mealBreakdownChartInstance.destroy();
  }

  mealBreakdownChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Profiles Complete', 'Profiles Missing', 'Active Users', 'Inactive Users'],
      datasets: [
        {
          data: [
            stats.profilesCompleted,
            stats.profilesMissing,
            Math.max(0, stats.totalUsers - stats.inactiveUsers),
            stats.inactiveUsers
          ],
          backgroundColor: [
            '#22c55e',
            '#f59e0b',
            '#3b82f6',
            '#ef4444'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '50%',
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
}

function renderAdminSnapshotChart(stats) {
  const ctx = document.getElementById('systemOverviewChart');
  if (!ctx) return;

  if (systemOverviewChartInstance) {
    systemOverviewChartInstance.destroy();
  }

  systemOverviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Users', 'Profiles Complete', 'Profiles Missing', 'Inactive Users'],
      datasets: [
        {
          label: 'Counts',
          data: [
            stats.totalUsers,
            stats.profilesCompleted,
            stats.profilesMissing,
            stats.inactiveUsers
          ],
          backgroundColor: [
            '#93c5fd',
            '#86efac',
            '#fde68a',
            '#fda4af'
          ],
          borderRadius: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function renderFallbackState(message) {
  kpiMealsToday.textContent = '0';
  kpiSavedFoods.textContent = '0';
  kpiProfilesCompleted.textContent = '0';
  kpiUsers.textContent = '0';

  healthProfilesMissing.textContent = '0';
  healthEntriesMissingMacros.textContent = '0';
  healthInactiveUsers.textContent = '0';

  userOverviewTable.innerHTML = `
    <tr>
      <td colspan="5" class="py-4 text-red-600">Failed to load user overview: ${escapeHtml(message)}</td>
    </tr>
  `;

  recentActivityList.innerHTML = `
    <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      Failed to load recent activity: ${escapeHtml(message)}
    </div>
  `;
}

function formatAdminDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

loadAdminDashboard();