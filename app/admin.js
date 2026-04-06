const adminDebugOutput = document.getElementById('adminDebugOutput');

// NEW KPI ELEMENTS
const kpiTrackedUsers = document.getElementById('kpiTrackedUsers');
const kpiProfilesCompleted = document.getElementById('kpiProfilesCompleted');
const kpiInternalUsers = document.getElementById('kpiInternalUsers');
const kpiExternalUsers = document.getElementById('kpiExternalUsers');

// NEW HEALTH ELEMENTS
const healthUnknownUsers = document.getElementById('healthUnknownUsers');
const healthTotalSignIns = document.getElementById('healthTotalSignIns');
const healthInactiveUsers = document.getElementById('healthInactiveUsers');
const healthBlockedUsers = document.getElementById('healthBlockedUsers');

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

  return {
    raw: data,
    stats: {
      trackedUsers: Number(stats.trackedUsers ?? users.length ?? 0) || 0,
      profilesCompleted: Number(stats.profilesCompleted ?? 0) || 0,
      internalUsers: Number(stats.internalUsers ?? 0) || 0,
      externalUsers: Number(stats.externalUsers ?? 0) || 0,
      unknownUsers: Number(stats.unknownUsers ?? 0) || 0,
      totalSignIns: Number(stats.totalSignIns ?? 0) || 0,
      inactiveUsers: Number(stats.inactiveUsers ?? 0) || 0,
      blockedUsers: Number(stats.blockedUsers ?? 0) || 0
    },
    users,
    activity
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
  kpiTrackedUsers.textContent = data.stats.trackedUsers;
  kpiProfilesCompleted.textContent = data.stats.profilesCompleted;
  kpiInternalUsers.textContent = data.stats.internalUsers;
  kpiExternalUsers.textContent = data.stats.externalUsers;
}

function renderHealth(data) {
  healthUnknownUsers.textContent = data.stats.unknownUsers;
  healthTotalSignIns.textContent = data.stats.totalSignIns;
  healthInactiveUsers.textContent = data.stats.inactiveUsers;
  healthBlockedUsers.textContent = data.stats.blockedUsers;
}

function renderUserTable(users) {
  if (!users.length) {
    userOverviewTable.innerHTML = `
      <tr>
        <td colspan="6" class="py-4 text-slate-500">No user access data available yet from the admin API.</td>
      </tr>
    `;
    return;
  }

  userOverviewTable.innerHTML = users.map((user) => {
    const userLabel = user.userDetails || user.email || user.userId || 'Unknown user';
    const userType = (user.userType || 'unknown').toLowerCase();
    const loginCount = user.loginCount ?? 0;
    const profileComplete = user.profileComplete === true
      ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Complete</span>'
      : '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Missing</span>';

    const lastSeen = formatAdminDate(user.lastSeen || user.lastActive || user.updatedAt);
    const status = (user.status || 'active').toLowerCase();

    let userTypeBadge = '<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Unknown</span>';
    if (userType === 'internal') {
      userTypeBadge = '<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Internal</span>';
    } else if (userType === 'external') {
      userTypeBadge = '<span class="inline-flex items-center rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">External</span>';
    }

    let statusBadge = '<span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Active</span>';
    if (status === 'inactive') {
      statusBadge = '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">Inactive</span>';
    } else if (status === 'blocked') {
      statusBadge = '<span class="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">Blocked</span>';
    }

    const actionButton = status === 'blocked'
  ? `<button
       class="mt-2 inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 transition"
       onclick="updateUserStatus('${escapeHtml(user.userId)}', 'active', '${escapeHtml(user.userDetails || user.userId)}')"
     >
       Unblock
     </button>`
  : `<button
       class="mt-2 inline-flex items-center rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200 transition"
       onclick="updateUserStatus('${escapeHtml(user.userId)}', 'blocked', '${escapeHtml(user.userDetails || user.userId)}')"
     >
       Block
     </button>`;

    return `
      <tr class="align-top">
        <td class="py-4 pr-4 text-slate-800">${escapeHtml(userLabel)}</td>
        <td class="py-4 pr-4">${userTypeBadge}</td>
        <td class="py-4 pr-4 text-slate-600">${escapeHtml(String(loginCount))}</td>
        <td class="py-4 pr-4">${profileComplete}</td>
        <td class="py-4 pr-4 text-slate-600">${escapeHtml(lastSeen)}</td>
        <td class="py-4">
  <div class="flex flex-col items-start">
    ${statusBadge}
    ${actionButton}
  </div>
</td>
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
      labels: ['Internal Users', 'External Users', 'Unknown Users'],
      datasets: [
        {
          data: [
            stats.internalUsers,
            stats.externalUsers,
            stats.unknownUsers
          ],
          backgroundColor: [
            '#3b82f6',
            '#8b5cf6',
            '#94a3b8'
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
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
      labels: ['Tracked Users', 'Profiles Complete', 'Inactive Users', 'Total Sign-ins'],
      datasets: [
        {
          label: 'Counts',
          data: [
            stats.trackedUsers,
            stats.profilesCompleted,
            stats.inactiveUsers,
            stats.totalSignIns
          ],
          backgroundColor: [
            '#93c5fd',
            '#86efac',
            '#fca5a5',
            '#fcd34d'
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
  kpiTrackedUsers.textContent = '0';
  kpiProfilesCompleted.textContent = '0';
  kpiInternalUsers.textContent = '0';
  kpiExternalUsers.textContent = '0';

  healthUnknownUsers.textContent = '0';
  healthTotalSignIns.textContent = '0';
  healthInactiveUsers.textContent = '0';
  healthBlockedUsers.textContent = '0';

  userOverviewTable.innerHTML = `
  <tr>
    <td colspan="6" class="py-4 text-red-600">Failed to load user overview: ${escapeHtml(message)}</td>
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

async function updateUserStatus(userId, status, userDetails) {
  const actionLabel = status === 'blocked' ? 'block' : 'unblock';
  const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this user?`);

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch('/api/rolecheck/user-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        status,
        userDetails
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update user status.');
    }

    await loadAdminDashboard();
  } catch (error) {
    console.error(error);
    window.alert(error.message || 'Failed to update user status.');
  }
}

window.updateUserStatus = updateUserStatus;

loadAdminDashboard();