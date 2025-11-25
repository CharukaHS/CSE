<?php
// Simple admin login page
session_start();
$config = include __DIR__ . '/config.php';
$err = '';
if($_SERVER['REQUEST_METHOD'] === 'POST'){
  $pw = $_POST['password'] ?? '';
  if($pw === $config['admin_password']){
    $_SESSION['admin_logged'] = true;
    header('Location: admin_panel.php'); exit;
  } else {
    $err = 'Invalid password';
  }
}
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Login</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
  <div class="container small">
    <h2>Admin Login</h2>
    <?php if($err): ?><div class="error"><?=htmlspecialchars($err)?></div><?php endif; ?>
    <form method="post">
      <label>Password<br><input type="password" name="password" required></label>
      <div style="margin-top:12px"><button type="submit">Login</button></div>
    </form>
    <p style="margin-top:12px"><a href="index.html">Back to public page</a></p>
  </div>
</body>
</html>
