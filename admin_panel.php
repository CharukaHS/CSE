<?php
session_start();

// Check if admin is logged in
if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
    header('Location: admin.php');
    exit;
}

// Load portfolio data
$dataFile = __DIR__ . '/data/portfolio.json';
$data = ['holdings' => [], 'logs' => [], 'cashBalance' => 0];

if (file_exists($dataFile)) {
    $json = file_get_contents($dataFile);
    $data = json_decode($json, true) ?: $data;
}

// Ensure cashBalance field exists
if (!isset($data['cashBalance'])) {
    $data['cashBalance'] = 0;
}

// Ensure initialDeposit field exists
if (!isset($data['initialDeposit'])) {
    $data['initialDeposit'] = 0;
}

// Ensure showHoldingsPublic field exists
if (!isset($data['showHoldingsPublic'])) {
    $data['showHoldingsPublic'] = true;
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Panel — Portfolio</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="layout-wrapper">
    <!-- Admin Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">Admin Panel</div>
        <div class="sidebar-subtitle">Portfolio Management</div>
      </div>

      <!-- Account Summary Table in Sidebar -->
      <div class="sidebar-summary">
        <div class="summary-label">Account Summary</div>
        <table class="sidebar-table">
          <tbody>
            <tr>
              <td class="label">Initial Deposit</td>
              <td class="value" id="adminSummaryInitialDeposit">—</td>
            </tr>
            <tr>
              <td class="label">Current Portfolio</td>
              <td class="value" id="adminSummaryCurrentPortfolio">—</td>
            </tr>
            <tr>
              <td class="label">Cash Balance</td>
              <td class="value" id="adminSummaryCashBalance">—</td>
            </tr>
            <tr class="highlight-row">
              <td class="label">Total Value</td>
              <td class="value" id="adminSummaryTotalValue">—</td>
            </tr>
            <tr class="highlight-row">
              <td class="label">Total Gain</td>
              <td class="value" id="adminSummaryTotalGain">—</td>
            </tr>
            <tr class="highlight-row">
              <td class="label">Return %</td>
              <td class="value" id="adminSummaryReturnPct">—</td>
            </tr>
            <tr>
              <td class="label">Category</td>
              <td class="value" id="adminSummaryCategory">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px">
        <button id="btnSave" style="width:100%">💾 Save Changes</button>
        <button id="btnRefresh" class="btn-ghost" style="width:100%">🔄 Refresh Data</button>
        <a href="index.html" class="btn-ghost" style="display:block;text-align:center;text-decoration:none;padding:10px">📊 View Public Page</a>
        <a href="logout.php" class="btn-ghost" style="display:block;text-align:center;text-decoration:none;padding:10px">🚪 Logout</a>
      </div>
    </aside>

    <!-- Main Admin Content -->
    <div class="main-content">
      <div class="container">
        <header>
          <div>
            <h1>Portfolio Administration</h1>
            <p class="lead">Manage holdings, cash balance, and daily tracking</p>
          </div>
        </header>

        <main>
          <!-- Initial Deposit Management -->
          <section class="card">
            <h2>💾 Initial Deposit</h2>
            <div class="small mb-2">Set your starting investment amount</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
              <div style="flex:1;min-width:200px">
                <label style="display:block;margin-bottom:8px;color:var(--muted);font-size:13px">Initial Deposit (LKR)</label>
                <input id="initialDepositInput" type="number" step="0.01" placeholder="Enter initial deposit amount" />
              </div>
              <button id="updateInitialDepositBtn">Set Initial Deposit</button>
            </div>
          </section>

          <!-- Cash Balance Management -->
          <section class="card">
            <h2>💰 Cash Balance Management</h2>
            <div class="small mb-2">Update available cash balance</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
              <div style="flex:1;min-width:200px">
                <label style="display:block;margin-bottom:8px;color:var(--muted);font-size:13px">Cash Balance (LKR)</label>
                <input id="cashBalanceInput" type="number" step="0.01" placeholder="Enter cash balance" />
              </div>
              <button id="updateCashBtn">Update Cash Balance</button>
            </div>
          </section>

          <!-- Public Visibility Settings -->
          <section class="card">
            <h2>👁️ Public Visibility Settings</h2>
            <div class="small mb-2">Control what information is visible on the public page</div>
            <div style="display:flex;align-items:center;gap:16px;padding:16px;background:rgba(212, 165, 116, 0.05);border-radius:8px;border:1px solid rgba(212, 165, 116, 0.15)">
              <label style="display:flex;align-items:center;gap:12px;cursor:pointer;flex:1">
                <input type="checkbox" id="showHoldingsCheckbox" style="width:auto;cursor:pointer;transform:scale(1.3)" />
                <span style="font-size:15px;font-weight:500">Show Holdings Table on Public Page</span>
              </label>
              <span id="holdingsVisibilityStatus" class="badge" style="padding:6px 16px"></span>
            </div>
            <div class="small" style="margin-top:12px;padding:12px;background:rgba(139, 143, 163, 0.08);border-radius:6px">
              ℹ️ When disabled, the holdings table will be hidden from the public page, but all calculations (portfolio value, gains, etc.) will continue to work normally.
            </div>
          </section>

          <!-- Holdings Management -->
          <section class="card">
            <h2>📈 Holdings Management</h2>
            <div id="adminApp"></div>
          </section>

          <!-- Daily Portfolio Tracking -->
          <section class="card">
            <h2>📊 Daily Portfolio Tracking</h2>
            <div class="small mb-2">Log daily portfolio values to track growth over time</div>
            <div id="adminLogs"></div>
            <div class="chart-container">
              <canvas id="portfolioChart"></canvas>
            </div>
          </section>

          <!-- Export Options -->
          <section class="card">
            <h2>📥 Export & Backup</h2>
            <div class="small mb-2">Download portfolio data and create backups</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button id="btnExportJSON">📥 Export JSON</button>
              <button id="btnExportHTML">📄 Export HTML Snapshot</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>

  <script>const initialData = <?= json_encode($data, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP); ?>;</script>
  <script src="assets/js/app_admin.js"></script>
</body>
</html>
