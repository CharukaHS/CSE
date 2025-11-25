/* assets/js/app_admin.js
   Clean, modular admin UI script for editing & saving portfolio data.
   Requires Chart.js on the page if you want charts to render.
*/
(function () {
  'use strict';

  // ---- Config / state ----
  const appRoot = document.getElementById('adminApp');
  const logsRoot = document.getElementById('adminLogs');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnSave = document.getElementById('btnSave');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportHTML = document.getElementById('btnExportHTML');

  if (!appRoot || !logsRoot) {
    console.warn('Admin UI root elements not found. Aborting admin script.');
    return;
  }

  // initial data injected by server (admin_panel.php)
  let state = window.initialData && typeof window.initialData === 'object'
    ? JSON.parse(JSON.stringify(window.initialData))
    : { holdings: [], logs: [] };

  // Editing index used when updating an existing holding
  let editingIndex = -1;

  // Chart instance (if created)
  let portfolioChartInstance = null;

  // ---- Helpers ----
  function formatLKR(v) {
    return (Number(v) || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 });
  }

  function showMessage(text, type = 'success') {
    const div = document.createElement('div');
    div.className = type === 'error' ? 'error' : 'success';
    div.textContent = text;
    div.style.position = 'fixed';
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.top = '18px';
    div.style.zIndex = 9999;
    div.style.padding = '10px 14px';
    div.style.borderRadius = '8px';
    div.style.background = type === 'error' ? 'rgba(255,80,80,0.12)' : 'rgba(46,180,140,0.12)';
    div.style.color = type === 'error' ? '#ff9b9b' : '#bff0dd';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  function downloadFile(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function saveToServer() {
    if (!btnSave) return;
    try {
      btnSave.disabled = true;
      btnSave.textContent = 'Saving…';
      const res = await fetch('api/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        showMessage('✓ Portfolio saved successfully to server!');
      } else {
        const err = json.error || `Status ${res.status}`;
        showMessage(`Save failed: ${err}`, 'error');
      }
    } catch (err) {
      showMessage('Save failed: ' + (err.message || err), 'error');
      console.error(err);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Save';
    }
  }

  async function loadFromServer() {
    try {
      const res = await fetch('api/load.php');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state = data && typeof data === 'object' ? data : { holdings: [], logs: [] };
      editingIndex = -1;
      render();
      showMessage('✓ Data refreshed from server');
    } catch (err) {
      showMessage('Failed to load data: ' + (err.message || err), 'error');
      console.error(err);
    }
  }

  // ---- Chart rendering (defensive) ----
  function renderChart() {
    // Only if Chart.js loaded and there is a canvas with id 'portfolioChart'
    const canvas = document.getElementById('portfolioChart');
    if (!canvas || typeof Chart === 'undefined') {
      // destroy previous if Chart library removed
      if (portfolioChartInstance && typeof portfolioChartInstance.destroy === 'function') {
        portfolioChartInstance.destroy();
        portfolioChartInstance = null;
      }
      return;
    }

    const logs = Array.isArray(state.logs) ? state.logs.slice() : [];
    if (logs.length < 2) {
      if (portfolioChartInstance) {
        portfolioChartInstance.destroy();
        portfolioChartInstance = null;
      }
      return;
    }

    const labels = logs.map(l => l.date);
    const values = logs.map(l => Number(l.value) || 0);

    // Destroy old instance safely
    if (portfolioChartInstance && portfolioChartInstance.destroy) {
      try { portfolioChartInstance.destroy(); } catch (e) { /* ignore */ }
      portfolioChartInstance = null;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 300);
    gradient.addColorStop(0, 'rgba(212, 165, 116, 0.35)');
    gradient.addColorStop(1, 'rgba(212, 165, 116, 0.05)');

    portfolioChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value (LKR)',
          data: values,
          borderColor: '#d4a574',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#d4a574'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cfeff0' } }
        },
        scales: {
          y: {
            ticks: {
              color: '#8b8fa3',
              callback: v => 'LKR ' + Number(v).toLocaleString('en-LK', { maximumFractionDigits: 0 })
            },
            grid: { color: 'rgba(212, 165, 116, 0.06)' }
          },
          x: {
            ticks: { color: '#8b8fa3' },
            grid: { color: 'rgba(212, 165, 116, 0.02)' }
          }
        }
      }
    });
  }

  // ---- Render function (build UI + attach handlers) ----
  function render() {
    // Clear roots
    appRoot.innerHTML = '';
    logsRoot.innerHTML = '';

    // === Holdings table & editor ===
    const holdingsCard = document.createElement('div');
    holdingsCard.className = 'card';

    // table
    const tbl = document.createElement('table');
    tbl.className = 'holdings-table';
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Symbol</th><th>Qty</th><th>Avg Price</th><th>Market Price</th><th>Value</th><th>Notes</th><th style="width:140px">Actions</th>
        </tr>
      </thead>
    `;
    const tb = document.createElement('tbody');

    (state.holdings || []).forEach((h, i) => {
      const qty = Number(h.qty) || 0;
      const mp = Number(h.marketPrice) || 0;
      const val = qty * mp;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${(h.symbol||'').toUpperCase()}</td>
        <td>${qty}</td>
        <td>${formatLKR(h.avgPrice)}</td>
        <td>${formatLKR(h.marketPrice)}</td>
        <td>LKR ${formatLKR(val)}</td>
        <td>${h.notes || ''}</td>
        <td style="text-align:center">
          <button class="edit btn-small" data-i="${i}">Edit</button>
          <button class="del btn-small btn-danger" data-i="${i}">Delete</button>
        </td>
      `;
      tb.appendChild(tr);
    });

    tbl.appendChild(tb);
    holdingsCard.appendChild(tbl);

    // editor form
    const formWrap = document.createElement('div');
    formWrap.style.marginTop = '18px';
    formWrap.innerHTML = `
      <h3 style="margin:0 0 8px 0">Add / Update Holding</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="f_symbol" placeholder="Symbol (e.g., ABC)" style="width:110px;text-transform:uppercase" />
        <input id="f_qty" type="number" placeholder="Quantity" style="width:120px" />
        <input id="f_avg" type="number" step="0.01" placeholder="Avg Price" style="width:140px" />
        <input id="f_mp" type="number" step="0.01" placeholder="Market Price" style="width:140px" />
        <input id="f_notes" placeholder="Notes (optional)" style="flex:1;min-width:180px" />
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button id="f_add" style="flex:1">Add Holding</button>
        <button id="f_cancel" style="flex:1;display:none;background:transparent;border:1px solid var(--accent);color:var(--accent)">Cancel Edit</button>
      </div>
    `;
    holdingsCard.appendChild(formWrap);

    appRoot.appendChild(holdingsCard);

    // === Logs table & editor ===
    const logsCard = document.createElement('div');
    logsCard.className = 'card';
    logsCard.innerHTML = `
      <h3 style="margin:0 0 8px 0">Daily Log</h3>
      <div style="overflow:auto">
        <table class="logs-table">
          <thead><tr><th>Date</th><th>Portfolio Value</th><th style="width:100px">Actions</th></tr></thead>
          <tbody id="logsTbody"></tbody>
        </table>
      </div>
    `;
    logsRoot.appendChild(logsCard);

    const logsTbody = logsRoot.querySelector('#logsTbody');

    (state.logs || []).forEach((l, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.date}</td>
        <td>LKR ${formatLKR(l.value)}</td>
        <td style="text-align:center"><button class="del-log btn-small btn-danger" data-i="${i}">Delete</button></td>
      `;
      logsTbody.appendChild(tr);
    });

    // log add form
    const addLogWrap = document.createElement('div');
    addLogWrap.style.marginTop = '12px';
    addLogWrap.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input id="new-log-date" type="date" style="min-width:150px" />
        <input id="new-log-value" type="number" placeholder="Portfolio Value" step="0.01" style="min-width:150px" />
        <button id="add-log-btn">Log Today</button>
      </div>
    `;
    logsRoot.appendChild(addLogWrap);

    // default today's date
    const today = new Date().toISOString().split('T')[0];
    const newLogDateInput = document.getElementById('new-log-date');
    if (newLogDateInput) newLogDateInput.value = today;

    // ---- Attach event handlers (delegation where suitable) ----

    // holdings: edit/delete delegation
    tb.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const idx = parseInt(btn.dataset.i, 10);
      if (btn.classList.contains('del')) {
        if (!Number.isFinite(idx)) return;
        if (!confirm('Delete this holding?')) return;
        state.holdings.splice(idx, 1);
        showMessage('Holding deleted');
        render();
      }
      if (btn.classList.contains('edit')) {
        if (!Number.isFinite(idx)) return;
        editingIndex = idx;
        const h = state.holdings[idx];
        document.getElementById('f_symbol').value = h.symbol || '';
        document.getElementById('f_qty').value = h.qty || '';
        document.getElementById('f_avg').value = h.avgPrice || '';
        document.getElementById('f_mp').value = h.marketPrice || '';
        document.getElementById('f_notes').value = h.notes || '';
        const addBtn = document.getElementById('f_add');
        const cancelBtn = document.getElementById('f_cancel');
        if (addBtn) addBtn.textContent = 'Update Holding';
        if (cancelBtn) cancelBtn.style.display = 'block';
        document.getElementById('f_symbol').focus();
      }
    });

    // add/update holding
    const addBtn = document.getElementById('f_add');
    const cancelBtn = document.getElementById('f_cancel');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const sym = (document.getElementById('f_symbol').value || '').toUpperCase().trim();
        const qty = Number(document.getElementById('f_qty').value) || 0;
        const avg = Number(document.getElementById('f_avg').value) || 0;
        const mp = Number(document.getElementById('f_mp').value) || 0;
        const notes = document.getElementById('f_notes').value || '';

        if (!sym || !qty) {
          showMessage('Symbol and quantity are required', 'error');
          return;
        }

        if (editingIndex >= 0) {
          state.holdings[editingIndex] = { symbol: sym, qty, avgPrice: avg, marketPrice: mp, notes };
          editingIndex = -1;
          showMessage('Holding updated');
        } else {
          const existing = state.holdings.findIndex(h => h.symbol === sym);
          if (existing >= 0) {
            state.holdings[existing] = { symbol: sym, qty, avgPrice: avg, marketPrice: mp, notes };
            showMessage('Holding updated');
          } else {
            state.holdings.push({ symbol: sym, qty, avgPrice: avg, marketPrice: mp, notes });
            showMessage('Holding added');
          }
        }

        // clear form
        ['f_symbol', 'f_qty', 'f_avg', 'f_mp', 'f_notes'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        if (addBtn) addBtn.textContent = 'Add Holding';
        if (cancelBtn) cancelBtn.style.display = 'none';

        render();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingIndex = -1;
        ['f_symbol', 'f_qty', 'f_avg', 'f_mp', 'f_notes'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        if (addBtn) addBtn.textContent = 'Add Holding';
        cancelBtn.style.display = 'none';
      });
    }

    // logs delete delegation
    if (logsTbody) {
      logsTbody.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        const idx = parseInt(btn.dataset.i, 10);
        if (btn.classList.contains('del-log')) {
          if (!Number.isFinite(idx)) return;
          if (!confirm('Delete this log entry?')) return;
          state.logs.splice(idx, 1);
          showMessage('Log entry deleted');
          render();
        }
      });
    }

    // add/update log
    const addLogBtn = document.getElementById('add-log-btn');
    if (addLogBtn) {
      addLogBtn.addEventListener('click', () => {
        const date = (document.getElementById('new-log-date').value || '').trim();
        const value = Number(document.getElementById('new-log-value').value) || 0;
        if (!date || !value) {
          showMessage('Date and value are required', 'error');
          return;
        }
        const idx = state.logs.findIndex(l => l.date === date);
        if (idx >= 0) {
          state.logs[idx].value = value;
          showMessage('Log updated for ' + date);
        } else {
          state.logs.push({ date, value });
          state.logs.sort((a, b) => new Date(a.date) - new Date(b.date));
          showMessage('Daily portfolio logged');
        }
        // reset inputs
        document.getElementById('new-log-date').value = today;
        document.getElementById('new-log-value').value = '';
        render();
      });
    }

    // ===== Buttons that live outside render area (save/export) =====
    if (btnRefresh) {
      btnRefresh.onclick = loadFromServer;
    }
    if (btnSave) {
      btnSave.onclick = saveToServer;
    }
    if (btnExportJSON) {
      btnExportJSON.onclick = () => {
        downloadFile('portfolio_export.json', JSON.stringify(state, null, 2), 'application/json');
      };
    }
    if (btnExportHTML) {
      btnExportHTML.onclick = () => {
        const snapshot = `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Portfolio Snapshot</title><link rel="stylesheet" href="assets/css/style.css"></head>
<body>
${document.querySelector('.container') ? document.querySelector('.container').outerHTML : '<div>Snapshot</div>'}
</body></html>`;
        downloadFile('portfolio_snapshot.html', snapshot, 'text/html');
      };
    }

    // Finally render chart (if canvas exists)
    renderChart();
  } // end of render()

  // Initialize: load fresh data from server on page load
  loadFromServer();

  // Expose for debug (optional)
  window.__adminState = state;
})();
