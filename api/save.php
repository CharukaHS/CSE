<?php
header('Content-Type: application/json');

$dataFile = __DIR__ . '/../data/portfolio.json';

// Create data directory if not exists
$dataDir = dirname($dataFile);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Read request body
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

// Ensure required fields
if (!isset($input['holdings'])) $input['holdings'] = [];
if (!isset($input['logs'])) $input['logs'] = [];
if (!isset($input['cashBalance'])) $input['cashBalance'] = 0;
if (!isset($input['initialDeposit'])) $input['initialDeposit'] = 0;
if (!isset($input['showHoldingsPublic'])) $input['showHoldingsPublic'] = true;

// Save to file
$json = json_encode($input, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
$written = file_put_contents($dataFile, $json);

if ($written === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to save data']);
} else {
    http_response_code(200);
    echo json_encode(['ok' => true, 'message' => 'Data saved successfully']);
}
?>
