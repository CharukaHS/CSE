<?php
// Returns the portfolio JSON
header('Content-Type: application/json');
$config = include __DIR__ . '/../config.php';
$file = $config['data_file'];
if(!file_exists($file)){
  echo json_encode(['holdings'=>[], 'logs'=>[]]);
  exit;
}
echo file_get_contents($file);
