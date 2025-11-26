<?php
header('Content-Type: application/json');

$dataFile = __DIR__ . '/../data/portfolio.json';

if (file_exists($dataFile)) {
    $json = file_get_contents($dataFile);
    echo $json;
} else {
    // Return default structure
    $default = [
        'cashBalance' => 50000,
        'initialDeposit' => 0,
        'showHoldingsPublic' => true,
        'holdings' => [
            [
                'symbol' => 'ABC',
                'qty' => 100,
                'avgPrice' => 50.00,
                'marketPrice' => 55.00,
                'notes' => 'Demo holding - Technology sector'
            ],
            [
                'symbol' => 'XYZ',
                'qty' => 200,
                'avgPrice' => 30.00,
                'marketPrice' => 28.00,
                'notes' => 'Demo holding - Finance sector'
            ]
        ],
        'logs' => [
            ['date' => '2025-11-20', 'value' => 15000],
            ['date' => '2025-11-21', 'value' => 15250],
            ['date' => '2025-11-22', 'value' => 15100],
            ['date' => '2025-11-23', 'value' => 15500],
            ['date' => '2025-11-24', 'value' => 15900],
            ['date' => '2025-11-25', 'value' => 16100]
        ]
    ];
    echo json_encode($default);
}
?>
