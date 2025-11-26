<?php
// Simple admin authentication
session_start();

// For demo: simple password check
$adminPassword = 'admin123'; // CHANGE THIS IN PRODUCTION

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['password']) && $_POST['password'] === $adminPassword) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: admin_panel.php');
        exit;
    } else {
        $error = 'Invalid password';
    }
}

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in']) {
    header('Location: admin_panel.php');
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin Login — Portfolio</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
  <div class="card" style="max-width:400px;width:100%;background:linear-gradient(135deg, var(--card) 0%, var(--card-light) 100%);padding:40px">
    <h1 style="text-align:center;margin-bottom:32px">Admin Login</h1>
    
    <?php if (isset($error)): ?>
    <div class="error" style="margin-bottom:20px"><?php echo htmlspecialchars($error); ?></div>
    <?php endif; ?>
    
    <form method="POST">
      <label style="display:block;margin-bottom:8px;color:var(--muted);font-size:13px">Admin Password</label>
      <input type="password" name="password" placeholder="Enter admin password" autofocus required />
      
      <button type="submit" style="width:100%;margin-top:20px">Login</button>
    </form>
    
    <p style="text-align:center;color:var(--muted);font-size:13px;margin-top:20px">
      <a href="index.html" style="color:var(--accent);text-decoration:none">← Back to Portfolio</a>
    </p>
  </div>
</body>
</html>
