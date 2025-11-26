// Enhanced public portfolio script with sidebar stats and holdings visibility control
async function fetchData(){
  try{
    const res = await fetch('api/load.php');
    const data = await res.json();
    render(data);
  }catch(e){
    console.error('Failed to load portfolio data:', e);
    showError();
  }
}

function formatLKR(v){
  return (Number(v)||0).toLocaleString('en-LK', {maximumFractionDigits:2});
}

function showError(){
  const main = document.getElementById('app');
  if(main){
    main.innerHTML = '<div class="card error">Failed to load portfolio data. Please try again later.</div>';
  }
}

function renderChart(logs){
  if(logs.length < 2) return;

  const canvas = document.getElementById('publicPortfolioChart');
  if(!canvas) return;

  const dates = logs.map(l => l.date);
  const values = logs.map(l => Number(l.value)||0);

  // Destroy existing chart if any
  if(window.publicChartInstance){
    window.publicChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(212, 165, 116, 0.4)');
  gradient.addColorStop(1, 'rgba(212, 165, 116, 0.05)');

  window.publicChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Portfolio Value (LKR)',
          data: values,
          borderColor: '#d4a574',
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#d4a574',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#e8c499',
          pointHoverBorderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#f5f7fa',
            font: {size: 14, weight: 'bold'},
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          titleColor: '#d4a574',
          bodyColor: '#f5f7fa',
          borderColor: '#d4a574',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return 'LKR ' + context.parsed.y.toLocaleString('en-LK', {maximumFractionDigits: 2});
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            color: '#8b8fa3',
            font: {size: 12},
            callback: function(value) {
              return 'LKR ' + value.toLocaleString('en-LK', {maximumFractionDigits: 0});
            }
          },
          grid: {
            color: 'rgba(212, 165, 116, 0.1)',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            color: '#8b8fa3',
            font: {size: 12}
          },
          grid: {
            color: 'rgba(212, 165, 116, 0.05)',
            drawBorder: false
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function render(data){
  const holdings = data.holdings || [];
  const logs = data.logs || [];
  const showHoldings = data.showHoldingsPublic !== false; // Default to true if not set
  
  // Get cash balance and initial deposit from data
  const cashBalance = data.cashBalance || 0;
  const manualInitialDeposit = data.initialDeposit || 0;

  // Calculate totals
  let portfolioValue = 0;
  let totalCost = 0;
  
  holdings.forEach(h=>{
    const marketPrice = Number(h.marketPrice)||0;
    const qty = Number(h.qty)||0;
    const avgPrice = Number(h.avgPrice)||0;
    portfolioValue += marketPrice * qty;
    totalCost += avgPrice * qty;
  });

  const totalWealth = portfolioValue + cashBalance;
  
  // Use manual initial deposit if set, otherwise use calculated total cost
  const initialDeposit = manualInitialDeposit > 0 ? manualInitialDeposit : totalCost;
  const totalGain = totalWealth - initialDeposit;
  const returnPct = initialDeposit ? ((totalGain / initialDeposit) * 100) : 0;
  const sinceStartPct = totalCost ? ((portfolioValue - totalCost)/totalCost*100) : 0;

  // Daily change from last two logs
  let dailyChangePct = 0;
  let dailyChangeAbs = 0;
  if(logs.length >= 2){
    const latest = Number(logs[logs.length-1].value);
    const previous = Number(logs[logs.length-2].value);
    dailyChangeAbs = latest - previous;
    dailyChangePct = previous ? ((latest - previous)/previous*100) : 0;
  }

  // Update Account Summary Table
  document.getElementById('summaryInitialDeposit').textContent = 'LKR ' + formatLKR(initialDeposit);
  document.getElementById('summaryCurrentPortfolio').textContent = 'LKR ' + formatLKR(portfolioValue);
  document.getElementById('summaryCashBalance').textContent = 'LKR ' + formatLKR(cashBalance);
  document.getElementById('summaryTotalValue').textContent = 'LKR ' + formatLKR(totalWealth);
  
  const gainEl = document.getElementById('summaryTotalGain');
  gainEl.textContent = (totalGain >= 0 ? '+' : '') + formatLKR(totalGain) + ' LKR';
  gainEl.style.color = totalGain >= 0 ? '#2ecc71' : '#e74c3c';
  
  const returnEl = document.getElementById('summaryReturnPct');
  returnEl.textContent = (returnPct >= 0 ? '+' : '') + returnPct.toFixed(2) + '%';
  returnEl.style.color = returnPct >= 0 ? '#2ecc71' : '#e74c3c';
  
  document.getElementById('summaryCategory').textContent = 'Wealth / Assets / Equity';

  // Update main overview
  document.getElementById('totalValue').textContent = 'LKR ' + formatLKR(portfolioValue);
  
  const dailyChangeEl = document.getElementById('dailyChange');
  dailyChangeEl.textContent = (dailyChangePct >= 0 ? '+' : '') + dailyChangePct.toFixed(2) + '%';
  dailyChangeEl.style.color = dailyChangePct >= 0 ? '#2ecc71' : '#e74c3c';
  
  const sinceStartEl = document.getElementById('sinceStart');
  sinceStartEl.textContent = (sinceStartPct >= 0 ? '+' : '') + sinceStartPct.toFixed(2) + '%';
  sinceStartEl.style.color = sinceStartPct >= 0 ? '#2ecc71' : '#e74c3c';

  // Holdings section - show/hide based on admin setting
  const holdingsSection = document.querySelector('.card.holdings');
  if (holdingsSection) {
    if (showHoldings) {
      holdingsSection.style.display = 'block';
      
      // Holdings table
      const tbody = document.querySelector('#holdingsTable tbody');
      tbody.innerHTML = '';
      
      if(holdings.length === 0){
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="7" style="text-align:center;color:var(--muted);padding:32px">No holdings to display</td>';
        tbody.appendChild(tr);
      } else {
        holdings.forEach(h => {
          const marketPrice = Number(h.marketPrice)||0;
          const qty = Number(h.qty)||0;
          const avgPrice = Number(h.avgPrice)||0;
          const value = marketPrice * qty;
          const gainLoss = (marketPrice - avgPrice) * qty;
          const gainLossPct = avgPrice ? ((marketPrice - avgPrice)/avgPrice*100) : 0;
          
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${h.symbol}</strong></td>
            <td>${qty}</td>
            <td>LKR ${formatLKR(avgPrice)}</td>
            <td>LKR ${formatLKR(marketPrice)}</td>
            <td><strong>LKR ${formatLKR(value)}</strong></td>
            <td style="color:${gainLoss >= 0 ? '#2ecc71' : '#e74c3c'}">
              ${gainLoss >= 0 ? '+' : ''}${formatLKR(gainLoss)} 
              <span class="badge ${gainLoss >= 0 ? 'badge-success' : 'badge-danger'}">${gainLossPct.toFixed(2)}%</span>
            </td>
            <td>${h.notes || '—'}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    } else {
      // Hide the holdings section
      holdingsSection.style.display = 'none';
    }
  }

  // Logs table with change calculation
  const logsTbody = document.querySelector('#logsTable tbody');
  logsTbody.innerHTML = '';
  
  if(logs.length === 0){
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" style="text-align:center;color:var(--muted);padding:32px">No historical data available</td>';
    logsTbody.appendChild(tr);
  } else {
    logs.forEach((l, idx) => {
      const value = Number(l.value);
      let changeText = '—';
      let changeColor = 'var(--muted)';
      
      if(idx > 0){
        const prevValue = Number(logs[idx-1].value);
        const change = value - prevValue;
        const changePct = prevValue ? ((change/prevValue)*100) : 0;
        changeText = (change >= 0 ? '+' : '') + formatLKR(change) + ' (' + changePct.toFixed(2) + '%)';
        changeColor = change >= 0 ? '#2ecc71' : '#e74c3c';
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.date}</td>
        <td><strong>LKR ${formatLKR(value)}</strong></td>
        <td style="color:${changeColor}">${changeText}</td>
      `;
      logsTbody.appendChild(tr);
    });
  }

  // Render chart
  renderChart(logs);
}

// Initialize
fetchData();

// Auto-refresh disabled - Live Investment Dashboard is frozen to current state
// setInterval(fetchData, 300000);
