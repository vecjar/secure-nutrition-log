async function loadAdmin() {
  const res = await fetch('/api/rolecheck/admin-data');
  const data = await res.json();

  if (!res.ok) {
    document.body.innerHTML = `<h1>Access Denied</h1>`;
    return;
  }

  document.getElementById('totalEntries').textContent = data.stats.totalEntries;
  document.getElementById('totalFoods').textContent = data.stats.totalCustomFoods;
  document.getElementById('totalGoals').textContent = data.stats.totalGoals;
  document.getElementById('totalUsers').textContent = data.stats.totalUsers;

  document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);

  // Meal chart
  new Chart(document.getElementById('mealChart'), {
    type: 'doughnut',
    data: {
      labels: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
      datasets: [{
        data: [
          data.stats.mealBreakdown.breakfast,
          data.stats.mealBreakdown.lunch,
          data.stats.mealBreakdown.dinner,
          data.stats.mealBreakdown.snack
        ]
      }]
    }
  });

  // System chart
  new Chart(document.getElementById('systemChart'), {
    type: 'bar',
    data: {
      labels: ['Entries', 'Foods', 'Goals', 'Users'],
      datasets: [{
        label: 'Counts',
        data: [
          data.stats.totalEntries,
          data.stats.totalCustomFoods,
          data.stats.totalGoals,
          data.stats.totalUsers
        ]
      }]
    }
  });
}

loadAdmin();