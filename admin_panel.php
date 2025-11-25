<?php
session_start();
$config = include __DIR__ . '/config.php';
if(!isset($_SESSION['admin_logged']) || !$_SESSION['admin_logged']){
  header('Location: admin.php'); exit;
}
$dataFile = $config['data_file'];
$data = file_exists($dataFile) ? json_decode(file_get_contents($dataFile), true) : ['holdings'=>[], 'logs'=>[]];
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Panel — Portfolio</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="container">
    <header><h1>Admin Panel</h1><a href="logout.php" class="btn-ghost">Logout</a></header>

    <main>
      <section class="card">
        <h2>Holdings</h2>
        <div id="adminApp"></div>
      </section>

      <section class="card">
        <h2>Daily Portfolio Tracking</h2>
        <div class="small">Log your daily portfolio value to track growth over time</div>
        <div id="adminLogs"></div>
        <div class="chart-container">
          <canvas id="portfolioChart"></canvas>
        </div>
      </section>

      <section class="card">
        <h2>Save / Export</h2>
        <div class="small">Save changes to server or export snapshots</div>
        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap"><button id="btnRefresh">🔄 Refresh from Server</button> <button id="btnSave">💾 Save to Server</button> <button id="btnExportJSON">📥 Export JSON</button> <button id="btnExportHTML">📄 Export HTML</button></div>
      </section>
    </main>

  </div>
  <script>const initialData = <?= json_encode($data, JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_HEX_AMP); ?>;</script>
  <script src="assets/js/app_admin.js"></script>
</body>
</html>
