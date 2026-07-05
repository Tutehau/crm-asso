const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const importBtn = document.getElementById('import-btn');

(async () => {
  const user = await requireAuth();
  if (!user) return;
  renderLayout('import-export', user.username);
})();

exportBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/export');
    const data = await res.json();
    if (!data.length) { showToast('Aucun contact à exporter', 'error'); return; }
    const headers = ['nom','prenom','telephone','email','adresse','dateNaissance','statut','tags','notes'];
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const rows = data.map(c => headers.map(h => escapeCSV(c[h])));
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(row => csv += row.join(',') + '\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast('Export réussi', 'success');
  } catch { showToast('Erreur export', 'error'); }
});

importBtn.addEventListener('click', async () => {
  const file = importFile.files[0];
  if (!file) { showToast('Sélectionnez un fichier CSV', 'error'); return; }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      if (results.errors.length) { showToast('Erreur de parsing', 'error'); return; }
      const contactsData = results.data.filter(row => row.nom && row.prenom && row.telephone);
      if (!contactsData.length) { showToast('Aucune donnée valide (nom, prenom, tel requis)', 'error'); return; }
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: contactsData })
        });
        if (!res.ok) throw new Error();
        const result = await res.json();
        showToast(result.message, 'success');
        importFile.value = '';
      } catch { showToast('Erreur import', 'error'); }
    }
  });
});
