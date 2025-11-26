/* Enhanced Admin Panel Script with Initial Deposit, Cash Balance, and Holdings Visibility Management */
(function () {
  'use strict';

  const appRoot = document.getElementById('adminApp');
  const logsRoot = document.getElementById('adminLogs');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnSave = document.getElementById('btnSave');
  const btnExportJSON = document.getElementById('btnExportJSON');
  const btnExportHTML = document.getElementById('btnExportHTML');
  const initialDepositInput = document.getElementById('initialDepositInput');
  const updateInitialDepositBtn = document.getElementById('updateInitialDepositBtn');
  const cashBalanceInput = document.getElementById('cashBalanceInput');
  const updateCashBtn = document.getElementById('updateCashBtn');
  const showHoldingsCheckbox = document.getElementById('showHoldingsCheckbox');
  const holdingsVisibilityStatus = document.getElementById('holdingsVisibilityStatus');

  if (!appRoot || !logsRoot) {
    console.warn('Admin UI root elements not found.');
    return;
  }

  let state = window.initialData && typeof window.initialData === 'object'
    ? JSON.parse(JSON.stringify(window.initialData))
    : { holdings: [], logs: [], cashBalance: 0, initialDeposit: 0, showHoldingsPublic: true };

  // Ensure fields exist
  if (typeof state.cashBalance === 'undefined') {
    state.cashBalance = 0;
  }
  if (typeof state.initialDeposit === 'undefined') {
    state.initialDeposit = 0;
  }
  if (typeof state.showHoldingsPublic === 'undefined') {
    state.showHoldingsPublic = true;
  }

  let editingIndex = -1;
  let portfolioChartInstance = null;

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
    div.style.padding = '12px 20px';
    div.style.borderRadius = '8px';
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

  function updateVisibilityStatus() {
    if (!holdingsVisibilityStatus) return;
    
    if (state.showHoldingsPublic) {
      holdingsVisibilityStatus.textContent = 'VISIBLE';
      holdingsVisibilityStatus.className = 'badge badge-success';
    } else {
      holdingsVisibilityStatus.textContent = 'HIDDEN';
      holdingsVisibilityStatus.className = 'badge badge-danger';
    }
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
        showMessage('✓ Portfolio saved successfully!');
        updateSidebarStats();
      } else {
        const err = json.error || `Status ${res.status}`;
        showMessage(`Save failed: ${err}`, 'error');
      }
    } catch (err) {
      showMessage('Save failed: ' + (err.message || err), 'error');
      console.error(err);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = '💾 Save Changes';
    }
  }

  async function loadFromServer() {
    try {
      const res = await fetch('api/load.php');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state = data && typeof data === 'object' ? data : { holdings: [], logs: [], cashBalance: 0, showHoldingsPublic: true };
      if (typeof state.cashBalance === 'undefined') {
        state.cashBalance = 0;
      }
      if (typeof state.showHoldingsPublic === 'undefined') {
        state.showHoldingsPublic = true;
      }
      editingIndex = -1;
      render();
      showMessage('✓ Data refreshed from server');
    } catch (err) {
      showMessage('Failed to load: ' + (err.message || err), 'error');
      console.error(err);
    }
  }

  function updateSidebarStats() {
    const holdings = state.holdings || [];
    const cashBalance = Number(state.cashBalance) || 0;
    
    let portfolioValue = 0;
    let totalCost = 0;
    
    holdings.forEach(h => {
      const mp = Number(h.marketPrice) || 0;
      const qty = Number(h.qty) || 0;
      const avg = Number(h.avgPrice) || 0;
      portfolioValue += mp * qty;
      totalCost += avg * qty;
    });

    // Use manual initial deposit if set, otherwise use calculated total cost
    const initialDeposit = state.initialDeposit > 0 ? state.initialDeposit : totalCost;
    const totalWealth = portfolioValue + cashBalance;
    const totalGain = totalWealth - initialDeposit;
    const returnPct = initialDeposit ? ((totalGain / initialDeposit) * 100) : 0;

    // Update Account Summary Table
    document.getElementById('adminSummaryInitialDeposit').textContent = 'LKR ' + formatLKR(initialDeposit);
    document.getElementById('adminSummaryCurrentPortfolio').textContent = 'LKR ' + formatLKR(portfolioValue);
    document.getElementById('adminSummaryCashBalance').textContent = 'LKR ' + formatLKR(cashBalance);
    document.getElementById('adminSummaryTotalValue').textContent = 'LKR ' + formatLKR(totalWealth);
    
    const gainEl = document.getElementById('adminSummaryTotalGain');
    gainEl.textContent = (totalGain >= 0 ? '+' : '') + formatLKR(totalGain) + ' LKR';
    gainEl.style.color = totalGain >= 0 ? '#2ecc71' : '#e74c3c';
    
    const returnEl = document.getElementById('adminSummaryReturnPct');
    returnEl.textContent = (returnPct >= 0 ? '+' : '') + returnPct.toFixed(2) + '%';
    returnEl.style.color = returnPct >= 0 ? '#2ecc71' : '#e74c3c';
    
    document.getElementById('adminSummaryCategory').textContent = 'Wealth / Assets / Equity';

    // Update input fields
    if (initialDepositInput) {
      initialDepositInput.value = state.initialDeposit || 0;
    }
    if (cashBalanceInput) {
      cashBalanceInput.value = cashBalance;
    }
    
    // Update visibility checkbox
    if (showHoldingsCheckbox) {
      showHoldingsCheckbox.checked = state.showHoldingsPublic;
    }
    updateVisibilityStatus();
  }

  function renderChart() {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas || typeof Chart === 'undefined') {
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

    if (portfolioChartInstance && portfolioChartInstance.destroy) {
      try { portfolioChartInstance.destroy(); } catch (e) { }
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
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#d4a574',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            labels: { 
              color: '#f5f7fa',
              font: { size: 14, weight: 'bold' }
            } 
          },
          tooltip: {
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            titleColor: '#d4a574',
            bodyColor: '#f5f7fa',
            borderColor: '#d4a574',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            ticks: {
              color: '#8b8fa3',
              callback: v => 'LKR ' + Number(v).toLocaleString('en-LK', { maximumFractionDigits: 0 })
            },
            grid: { color: 'rgba(212, 165, 116, 0.08)' }
          },
          x: {
            ticks: { color: '#8b8fa3' },
            grid: { color: 'rgba(212, 165, 116, 0.03)' }
          }
        }
      }
    });
  }

  function render() {
    appRoot.innerHTML = '';
    logsRoot.innerHTML = '';

    // Holdings table
    const tbl = document.createElement('table');
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Symbol</th><th>Qty</th><th>Avg Price</th><th>Market Price</th><th>Value</th><th>G/L</th><th>Notes</th><th style="width:160px">Actions</th>
        </tr>
      </thead>
    `;
    const tb = document.createElement('tbody');

    (state.holdings || []).forEach((h, i) => {
      const qty = Number(h.qty) || 0;
      const mp = Number(h.marketPrice) || 0;
      const avg = Number(h.avgPrice) || 0;
      const val = qty * mp;
      const gl = (mp - avg) * qty;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${(h.symbol||'').toUpperCase()}</strong></td>
        <td>${qty}</td>
        <td>LKR ${formatLKR(avg)}</td>
        <td>LKR ${formatLKR(mp)}</td>
        <td><strong>LKR ${formatLKR(val)}</strong></td>
        <td style="color:${gl >= 0 ? '#2ecc71' : '#e74c3c'}">${gl >= 0 ? '+' : ''}${formatLKR(gl)}</td>
        <td>${h.notes || '—'}</td>
        <td style="text-align:center">
          <button class="edit btn-small" data-i="${i}">Edit</button>
          <button class="del btn-small btn-danger" data-i="${i}">Delete</button>
        </td>
      `;
      tb.appendChild(tr);
    });

    if ((state.holdings || []).length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="8" style="text-align:center;color:var(--muted);padding:32px">No holdings yet. Add your first holding below.</td>';
      tb.appendChild(tr);
    }

    tbl.appendChild(tb);
    appRoot.appendChild(tbl);

    // Add/Edit form
    const formWrap = document.createElement('div');
    formWrap.style.marginTop = '24px';
    
    // Get current values if editing
    let currSymbol = '', currQty = '', currAvg = '', currMp = '', currNotes = '';
    if (editingIndex >= 0) {
      const h = state.holdings[editingIndex];
      currSymbol = h.symbol || '';
      currQty = h.qty || '';
      currAvg = h.avgPrice || '';
      currMp = h.marketPrice || '';
      currNotes = h.notes || '';
    }
    
    formWrap.innerHTML = `
      <h3 style="margin:0 0 12px 0">${editingIndex >= 0 ? 'Update' : 'Add'} Holding</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        <div>
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Symbol</label>
          <input id="f_symbol" placeholder="e.g., AAPL" style="text-transform:uppercase" value="${currSymbol}" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Quantity</label>
          <input id="f_qty" type="number" placeholder="100" value="${currQty}" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Avg Price</label>
          <input id="f_avg" type="number" step="0.01" placeholder="50.00" value="${currAvg}" />
        </div>
        <div>
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Market Price</label>
          <input id="f_mp" type="number" step="0.01" placeholder="55.00" value="${currMp}" />
        </div>
        <div style="grid-column:1/-1">
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Notes (optional)</label>
          <input id="f_notes" placeholder="Additional information" value="${currNotes}" />
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:12px">
        <button id="f_add" style="flex:1">${editingIndex >= 0 ? 'Update' : 'Add'} Holding</button>
        <button id="f_cancel" style="flex:1;display:${editingIndex >= 0 ? 'block' : 'none'}" class="btn-ghost">Cancel</button>
      </div>
    `;
    appRoot.appendChild(formWrap);

    // Event handlers for holdings
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
        render();
      }
    });

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
          showMessage('Symbol and quantity required', 'error');
          return;
        }

        if (editingIndex >= 0) {
          state.holdings[editingIndex] = { symbol: sym, qty, avgPrice: avg, marketPrice: mp, notes };
          editingIndex = -1;
          showMessage('Holding updated');
        } else {
          state.holdings.push({ symbol: sym, qty, avgPrice: avg, marketPrice: mp, notes });
          showMessage('Holding added');
        }

        ['f_symbol', 'f_qty', 'f_avg', 'f_mp', 'f_notes'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });

        render();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        editingIndex = -1;
        render();
      });
    }

    // Logs section
    const logsTable = document.createElement('table');
    logsTable.innerHTML = `
      <thead><tr><th>Date</th><th>Portfolio Value</th><th style="width:120px">Actions</th></tr></thead>
    `;
    const logsTb = document.createElement('tbody');

    (state.logs || []).forEach((l, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.date}</td>
        <td><strong>LKR ${formatLKR(l.value)}</strong></td>
        <td style="text-align:center">
          <button class="del-log btn-small btn-danger" data-i="${i}">Delete</button>
        </td>
      `;
      logsTb.appendChild(tr);
    });

    if ((state.logs || []).length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" style="text-align:center;color:var(--muted);padding:32px">No logs yet. Add your first log entry below.</td>';
      logsTb.appendChild(tr);
    }

    logsTable.appendChild(logsTb);
    logsRoot.appendChild(logsTable);

    // Add log form
    const logForm = document.createElement('div');
    logForm.style.marginTop = '20px';
    const today = new Date().toISOString().split('T')[0];
    logForm.innerHTML = `
      <h3 style="margin:0 0 12px 0">Add Daily Log Entry</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
        <div style="flex:1;min-width:150px">
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Date</label>
          <input id="new-log-date" type="date" value="${today}" />
        </div>
        <div style="flex:1;min-width:180px">
          <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:12px">Portfolio Value (LKR)</label>
          <input id="new-log-value" type="number" step="0.01" placeholder="e.g., 15000" />
        </div>
        <button id="add-log-btn">Log Entry</button>
      </div>
    `;
    logsRoot.appendChild(logForm);

    // Log handlers
    logsTb.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const idx = parseInt(btn.dataset.i, 10);
      
      if (btn.classList.contains('del-log')) {
        if (!Number.isFinite(idx)) return;
        if (!confirm('Delete this log?')) return;
        state.logs.splice(idx, 1);
        showMessage('Log deleted');
        render();
      }
    });

    const addLogBtn = document.getElementById('add-log-btn');
    if (addLogBtn) {
      addLogBtn.addEventListener('click', () => {
        const date = (document.getElementById('new-log-date').value || '').trim();
        const value = Number(document.getElementById('new-log-value').value) || 0;
        
        if (!date || !value) {
          showMessage('Date and value required', 'error');
          return;
        }
        
        const idx = state.logs.findIndex(l => l.date === date);
        if (idx >= 0) {
          state.logs[idx].value = value;
          showMessage('Log updated for ' + date);
        } else {
          state.logs.push({ date, value });
          state.logs.sort((a, b) => new Date(a.date) - new Date(b.date));
          showMessage('Daily log added');
        }
        
        document.getElementById('new-log-date').value = today;
        document.getElementById('new-log-value').value = '';
        render();
      });
    }

    updateSidebarStats();
    renderChart();
  }

  // Initial deposit handler
  if (updateInitialDepositBtn) {
    updateInitialDepositBtn.addEventListener('click', () => {
      const newDeposit = Number(initialDepositInput.value) || 0;
      if (newDeposit <= 0) {
        showMessage('Initial deposit must be greater than 0', 'error');
        return;
      }
      state.initialDeposit = newDeposit;
      showMessage('Initial deposit set to LKR ' + formatLKR(newDeposit));
      updateSidebarStats();
    });
  }

  // Cash balance handler
  if (updateCashBtn) {
    updateCashBtn.addEventListener('click', () => {
      const newBalance = Number(cashBalanceInput.value) || 0;
      state.cashBalance = newBalance;
      showMessage('Cash balance updated to LKR ' + formatLKR(newBalance));
      updateSidebarStats();
    });
  }

  // Holdings visibility toggle handler
  if (showHoldingsCheckbox) {
    showHoldingsCheckbox.addEventListener('change', (e) => {
      state.showHoldingsPublic = e.target.checked;
      updateVisibilityStatus();
      showMessage(
        state.showHoldingsPublic 
          ? 'Holdings table is now VISIBLE on public page' 
          : 'Holdings table is now HIDDEN on public page'
      );
    });
  }

  // Button handlers
  if (btnRefresh) btnRefresh.onclick = loadFromServer;
  if (btnSave) btnSave.onclick = saveToServer;
  
  if (btnExportJSON) {
    btnExportJSON.onclick = () => {
      downloadFile('portfolio_export.json', JSON.stringify(state, null, 2), 'application/json');
      showMessage('JSON exported successfully');
    };
  }
  
  if (btnExportHTML) {
    btnExportHTML.onclick = () => {
      const snapshot = `<!doctype html>
<html><head><meta charset="utf-8"><title>Portfolio Snapshot</title></head>
<body><h1>Portfolio Snapshot</h1><pre>${JSON.stringify(state, null, 2)}</pre></body></html>`;
      downloadFile('portfolio_snapshot.html', snapshot, 'text/html');
      showMessage('HTML snapshot exported');
    };
  }

  // Initialize
  loadFromServer();
  window.__adminState = state;
})();
