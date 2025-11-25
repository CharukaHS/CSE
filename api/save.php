<?php
// Simple save endpoint (admin only) — expects JSON payload
session_start();
if(!isset($_SESSION['admin_logged']) || !$_SESSION['admin_logged']){
  http_response_code(403);
  echo json_encode(['error'=>'unauth']);
  exit;
}
$config = include __DIR__ . '/../config.php';
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if($data === null){
  http_response_code(400);
  echo json_encode(['error'=>'invalid json']);
  exit;
}
file_put_contents($config['data_file'], json_encode($data, JSON_PRETTY_PRINT));
echo json_encode(['ok'=>true]);
