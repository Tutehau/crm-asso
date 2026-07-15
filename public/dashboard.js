let chartInstance = null;

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('dashboard', user.username, user.role);
  loadDashboard();
})();

async function loadDashboard() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error();
    const stats = await res.json();
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-members').textContent = stats.statusCount['Membre'] || 0;
    document.getElementById('stat-volunteers').textContent = stats.statusCount['Bénévole'] || 0;
    document.getElementById('stat-board').textContent = stats.statusCount['Bureau'] || 0;

    const ctx = document.getElementById('statusChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.statusCount),
        datasets: [{
          data: Object.values(stats.statusCount),
          backgroundColor: ['#0e7490', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';
    stats.recent.forEach(c => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = `${c.prenom} ${c.nom}`;
      const small = document.createElement('small');
      small.textContent = new Date(c.createdAt).toLocaleDateString();
      li.appendChild(span);
      li.appendChild(small);
      recentList.appendChild(li);
    });
  } catch (err) {
    console.error('Dashboard error', err);
  }
}
