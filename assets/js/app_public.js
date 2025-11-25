// Fetches api/load.php and renders public page
async function fetchData(){
  try{
    const res = await fetch('api/load.php');
    const data = await res.json();
    render(data);
  }catch(e){
    console.error(e);
  }
}

function formatLKR(v){
  return (Number(v)||0).toLocaleString('en-LK', {maximumFractionDigits:2});
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
          pointHoverRadius: 7
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
        }
      },
      scales: {
        y: {
          ticks: {
            color: '#8b8fa3',
            callback: function(value) {
              return 'LKR ' + value.toLocaleString('en-LK', {maximumFractionDigits: 0});
            }
          },
          grid: {
            color: 'rgba(212, 165, 116, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#8b8fa3'
          },
          grid: {
            color: 'rgba(212, 165, 116, 0.05)'
          }
        }
      }
    }
  });
}

function render(data){
  const holdings = data.holdings || [];
  const logs = data.logs || [];

  // totals
  let total = 0;
  let cost = 0;
  holdings.forEach(h=>{
    const m=Number(h.marketPrice)||0;
    const q=Number(h.qty)||0;
    const avg=Number(h.avgPrice)||0;
    total += m*q;
    cost += avg*q;
  });

  const sinceStart = cost? ((total - cost)/cost*100):0;

  // daily change from last two logs
  let daily = 0;
  if(logs.length>=2){
    const a=logs[logs.length-1].value;
    const b=logs[logs.length-2].value;
    daily = ((a-b)/b*100);
  }

  document.getElementById('totalValue').textContent = 'LKR ' + formatLKR(total);
  document.getElementById('dailyChange').textContent = (daily>=0?'+':'') + (daily?daily.toFixed(2):'0.00') + '%';
  document.getElementById('sinceStart').textContent = sinceStart? sinceStart.toFixed(2) + '%':'0.00%';

  // holdings table
  const tbody = document.querySelector('#holdingsTable tbody');
  tbody.innerHTML='';
  holdings.forEach(h=>{
    const m=Number(h.marketPrice)||0;
    const q=Number(h.qty)||0;
    const avg=Number(h.avgPrice)||0;
    const val=m*q;
    const pnl=(m-avg)*q;
    const pct=avg?((m-avg)/avg*100):0;
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${h.symbol}</td><td>${q}</td><td>${formatLKR(avg)}</td><td>${formatLKR(m)}</td><td>LKR ${formatLKR(val)}</td><td>${pnl>=0?'+':''}${formatLKR(pnl)} (${pct.toFixed(2)}%)</td><td>${h.notes||''}</td>`;
    tbody.appendChild(tr);
  });

  // logs
  const lt = document.querySelector('#logsTable tbody');
  lt.innerHTML='';
  logs.forEach(l=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${l.date}</td><td>LKR ${formatLKR(l.value)}</td>`;
    lt.appendChild(tr);
  });

  // Render chart
  renderChart(logs);
}

fetchData();
