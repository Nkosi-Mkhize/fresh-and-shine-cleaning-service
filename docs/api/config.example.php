<?php

return [
    'db' => [
        'host' => 'localhost',
        'name' => 'your_xneelo_database_name',
        'user' => 'your_xneelo_database_user',
        'password' => 'your_xneelo_database_password',
        'charset' => 'utf8mb4',
    ],
    'app' => [
        'base_url' => 'https://freshandshinecleaningservice.co.za',
        'admin_email' => 'info@freshandshinecleaningservice.co.za',
        'admin_sms' => '+27769485673',
        'admin_token' => 'change-this-admin-token',
        'session_days' => 14,
    ],
    'payfast' => [
        'sandbox' => true,
        'merchant_id' => 'your_payfast_merchant_id',
        'merchant_key' => 'your_payfast_merchant_key',
        'passphrase' => '',
        'sandbox_url' => 'https://sandbox.payfast.co.za/eng/process',
        'live_url' => 'https://www.payfast.co.za/eng/process',
        'sandbox_validate_url' => 'https://sandbox.payfast.co.za/eng/query/validate',
        'live_validate_url' => 'https://www.payfast.co.za/eng/query/validate',
    ],
    'mail' => [
        'from' => 'info@freshandshinecleaningservice.co.za',
        'enabled' => true,
    ],
];
