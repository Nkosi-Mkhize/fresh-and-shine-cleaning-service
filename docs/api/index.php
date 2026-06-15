<?php

declare(strict_types=1);

ini_set('display_errors', '0');
date_default_timezone_set('Africa/Johannesburg');

const JSON_FLAGS = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $file = __DIR__ . '/config.php';
    if (!is_file($file)) {
        json_response(500, [
            'error' => 'Missing API configuration. Copy api/config.example.php to api/config.php and add your Xneelo database and PayFast credentials.',
        ]);
    }

    $config = require $file;
    return is_array($config) ? $config : [];
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = app_config()['db'] ?? [];
    $charset = $config['charset'] ?? 'utf8mb4';
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $config['host'] ?? 'localhost', $config['name'] ?? '', $charset);
    $pdo = new PDO($dsn, $config['user'] ?? '', $config['password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    ensure_schema($pdo);
    return $pdo;
}

function ensure_schema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $statements = [
        "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(40) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(60) NULL,
            company VARCHAR(190) NULL,
            newsletter TINYINT(1) NOT NULL DEFAULT 1,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS sessions (
            id VARCHAR(128) PRIMARY KEY,
            user_id VARCHAR(40) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX sessions_user_id (user_id),
            CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS bookings (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(40) NOT NULL UNIQUE,
            user_id VARCHAR(40) NULL,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL,
            service VARCHAR(160) NOT NULL,
            pricing_category VARCHAR(160) NOT NULL,
            price_option VARCHAR(160) NOT NULL,
            quantity INT UNSIGNED NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_unit VARCHAR(80) NULL,
            estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0,
            property_type VARCHAR(80) NOT NULL,
            rooms VARCHAR(40) NULL,
            city VARCHAR(160) NOT NULL,
            address VARCHAR(255) NULL,
            service_date DATE NOT NULL,
            service_time VARCHAR(20) NOT NULL,
            frequency VARCHAR(80) NULL,
            notes TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'Pending Payment',
            payment_method VARCHAR(80) NOT NULL DEFAULT 'PayFast',
            payment_status VARCHAR(80) NOT NULL DEFAULT 'Awaiting PayFast',
            payfast_payment_id VARCHAR(120) NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX bookings_user_id (user_id),
            INDEX bookings_reference (reference)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS quotes (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(40) NOT NULL UNIQUE,
            contact_name VARCHAR(160) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL,
            hotel_name VARCHAR(190) NULL,
            property_type VARCHAR(80) NULL,
            city VARCHAR(160) NULL,
            rooms VARCHAR(40) NULL,
            frequency VARCHAR(80) NULL,
            service VARCHAR(160) NOT NULL,
            pricing_category VARCHAR(160) NOT NULL,
            price_option VARCHAR(160) NOT NULL,
            quantity INT UNSIGNED NOT NULL DEFAULT 1,
            estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0,
            services LONGTEXT NULL,
            notes TEXT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'New',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS contacts (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(40) NOT NULL UNIQUE,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(190) NOT NULL,
            phone VARCHAR(60) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(40) NOT NULL DEFAULT 'New',
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS payments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_reference VARCHAR(40) NOT NULL,
            provider VARCHAR(40) NOT NULL DEFAULT 'PayFast',
            provider_payment_id VARCHAR(120) NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(80) NOT NULL,
            raw_payload LONGTEXT NULL,
            created_at DATETIME NOT NULL,
            INDEX payments_booking_reference (booking_reference)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS notifications (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            channel VARCHAR(40) NOT NULL,
            destination VARCHAR(190) NOT NULL,
            subject VARCHAR(190) NULL,
            body TEXT NOT NULL,
            status VARCHAR(40) NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS payfast_itn_logs (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_reference VARCHAR(40) NULL,
            valid_signature TINYINT(1) NOT NULL DEFAULT 0,
            valid_server TINYINT(1) NOT NULL DEFAULT 0,
            raw_payload LONGTEXT NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($statements as $sql) {
        $pdo->exec($sql);
    }
    $done = true;
}

function json_response(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_FLAGS);
    exit;
}

function text_response(int $status, string $text): never
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $text;
    exit;
}

function clean(mixed $value): string
{
    return trim((string)($value ?? ''));
}

function request_payload(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input') ?: '';
        $data = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($data)) {
            json_response(400, ['error' => 'Invalid JSON payload.']);
        }
        return $data;
    }
    return $_POST;
}

function require_fields(array $payload, array $fields): void
{
    $missing = [];
    foreach ($fields as $field) {
        if (clean($payload[$field] ?? '') === '') {
            $missing[] = $field;
        }
    }
    if ($missing) {
        json_response(400, ['error' => 'Missing required field: ' . implode(', ', $missing)]);
    }
}

function now_sql(): string
{
    return date('Y-m-d H:i:s');
}

function make_id(string $prefix): string
{
    return $prefix . bin2hex(random_bytes(8));
}

function make_reference(string $prefix, string $table): string
{
    $pdo = db();
    do {
        $reference = $prefix . '-' . strtoupper(bin2hex(random_bytes(3)));
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE reference = ?");
        $stmt->execute([$reference]);
    } while ((int)$stmt->fetchColumn() > 0);
    return $reference;
}

function current_user(): ?array
{
    $sessionId = $_COOKIE['fs_session'] ?? '';
    if ($sessionId === '') {
        return null;
    }

    $stmt = db()->prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ? LIMIT 1');
    $stmt->execute([$sessionId, now_sql()]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function public_user(?array $user): ?array
{
    if (!$user) {
        return null;
    }
    return [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'] ?? '',
        'company' => $user['company'] ?? '',
        'newsletter' => (bool)$user['newsletter'],
        'createdAt' => $user['created_at'],
    ];
}

function set_session_cookie(string $sessionId): void
{
    $days = (int)(app_config()['app']['session_days'] ?? 14);
    setcookie('fs_session', $sessionId, [
        'expires' => time() + ($days * 86400),
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function clear_session_cookie(): void
{
    setcookie('fs_session', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function pricing_selection(array $payload): array
{
    $pricingFile = dirname(__DIR__) . '/pricing.json';
    $pricing = json_decode(file_get_contents($pricingFile) ?: '', true);
    if (!is_array($pricing)) {
        json_response(500, ['error' => 'Pricing file could not be loaded.']);
    }

    $serviceName = clean($payload['service'] ?? '');
    $optionLabel = clean($payload['priceOption'] ?? '');
    foreach ($pricing['groups'] ?? [] as $group) {
        foreach ($group['services'] ?? [] as $service) {
            if (($service['name'] ?? '') !== $serviceName) {
                continue;
            }
            foreach ($service['options'] ?? [] as $option) {
                if (($option['label'] ?? '') === $optionLabel) {
                    $quantity = max(1, (int)($payload['quantity'] ?? 1));
                    $unitPrice = (float)$option['price'];
                    return [
                        'group' => $group['title'] ?? '',
                        'service' => $serviceName,
                        'option' => $optionLabel,
                        'quantity' => $quantity,
                        'unitPrice' => $unitPrice,
                        'unit' => $option['unit'] ?? '',
                        'total' => $unitPrice * $quantity,
                    ];
                }
            }
            json_response(400, ['error' => 'Selected price option is not available for this service.']);
        }
    }
    json_response(400, ['error' => 'Selected service is not available in the FreshAndShine pricelist.']);
}

function send_notification(string $channel, string $destination, string $subject, string $body): void
{
    $config = app_config();
    $status = 'queued';

    if ($channel === 'email' && ($config['mail']['enabled'] ?? true)) {
        $from = $config['mail']['from'] ?? ($config['app']['admin_email'] ?? $destination);
        $headers = "From: Fresh and Shine <{$from}>\r\nReply-To: {$from}\r\nContent-Type: text/plain; charset=UTF-8";
        $status = @mail($destination, $subject, $body, $headers) ? 'sent' : 'queued';
    }

    $stmt = db()->prepare('INSERT INTO notifications (channel, destination, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$channel, $destination, $subject, $body, $status, now_sql()]);
}

function notify_admin(string $subject, string $body): void
{
    $config = app_config()['app'] ?? [];
    send_notification('email', $config['admin_email'] ?? 'info@freshandshinecleaningservice.co.za', $subject, $body);
    send_notification('sms', $config['admin_sms'] ?? '+27769485673', $subject, $body);
}

function payfast_url(): string
{
    $payfast = app_config()['payfast'] ?? [];
    return ($payfast['sandbox'] ?? true) ? ($payfast['sandbox_url'] ?? '') : ($payfast['live_url'] ?? '');
}

function payfast_validate_url(): string
{
    $payfast = app_config()['payfast'] ?? [];
    return ($payfast['sandbox'] ?? true) ? ($payfast['sandbox_validate_url'] ?? '') : ($payfast['live_validate_url'] ?? '');
}

function payfast_signature(array $data): string
{
    $payfast = app_config()['payfast'] ?? [];
    unset($data['signature']);
    $pairs = [];
    foreach ($data as $key => $value) {
        if ($value === '' || $value === null) {
            continue;
        }
        $pairs[] = $key . '=' . urlencode(trim((string)$value));
    }
    $passphrase = clean($payfast['passphrase'] ?? '');
    if ($passphrase !== '') {
        $pairs[] = 'passphrase=' . urlencode($passphrase);
    }
    return md5(implode('&', $pairs));
}

function build_payfast_checkout(array $booking): array
{
    $config = app_config();
    $payfast = $config['payfast'] ?? [];
    $merchantId = clean($payfast['merchant_id'] ?? '');
    $merchantKey = clean($payfast['merchant_key'] ?? '');
    if ($merchantId === '' || $merchantKey === '' || strpos($merchantId, 'your_') === 0) {
        json_response(500, ['error' => 'PayFast credentials are not configured yet. Add them in api/config.php.']);
    }

    $baseUrl = rtrim($config['app']['base_url'] ?? '', '/');
    $reference = $booking['reference'];
    $fields = [
        'merchant_id' => $merchantId,
        'merchant_key' => $merchantKey,
        'return_url' => $baseUrl . '/payment-success.html?reference=' . urlencode($reference),
        'cancel_url' => $baseUrl . '/payment-cancelled.html?reference=' . urlencode($reference),
        'notify_url' => $baseUrl . '/api/payfast/itn',
        'name_first' => $booking['name'],
        'email_address' => $booking['email'],
        'cell_number' => preg_replace('/\D+/', '', $booking['phone']),
        'm_payment_id' => $reference,
        'amount' => number_format((float)$booking['estimated_total'], 2, '.', ''),
        'item_name' => 'FreshAndShine booking ' . $reference,
        'item_description' => $booking['service'] . ' - ' . $booking['price_option'],
        'custom_str1' => $reference,
        'custom_str2' => $booking['service'],
        'custom_str3' => $booking['property_type'],
        'email_confirmation' => '1',
        'confirmation_address' => $config['app']['admin_email'] ?? 'info@freshandshinecleaningservice.co.za',
    ];
    $fields['signature'] = payfast_signature($fields);

    return [
        'action' => payfast_url(),
        'fields' => $fields,
    ];
}

function validate_payfast_with_server(array $data): bool
{
    if (!function_exists('curl_init')) {
        return false;
    }
    $validateUrl = payfast_validate_url();
    if ($validateUrl === '') {
        return false;
    }
    $post = $data;
    unset($post['signature']);
    $ch = curl_init($validateUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => false,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($post),
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return trim((string)$response) === 'VALID';
}

function handle_register(): void
{
    $payload = request_payload();
    require_fields($payload, ['name', 'email', 'password']);
    if (strlen((string)$payload['password']) < 8) {
        json_response(400, ['error' => 'Password must be at least 8 characters.']);
    }

    $pdo = db();
    $id = make_id('usr_');
    try {
        $stmt = $pdo->prepare('INSERT INTO users (id, name, email, phone, company, newsletter, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            clean($payload['name']),
            strtolower(clean($payload['email'])),
            clean($payload['phone'] ?? ''),
            clean($payload['company'] ?? ''),
            1,
            password_hash((string)$payload['password'], PASSWORD_DEFAULT),
            now_sql(),
            now_sql(),
        ]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23000') {
            json_response(409, ['error' => 'An account already exists for this email address.']);
        }
        throw $error;
    }

    $sessionId = bin2hex(random_bytes(32));
    $stmt = $pdo->prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$sessionId, $id, date('Y-m-d H:i:s', time() + 86400 * 14), now_sql()]);
    set_session_cookie($sessionId);
    json_response(201, ['message' => 'Account created.', 'user' => public_user(current_user())]);
}

function handle_login(): void
{
    $payload = request_payload();
    require_fields($payload, ['email', 'password']);
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([strtolower(clean($payload['email']))]);
    $user = $stmt->fetch();
    if (!$user || !password_verify((string)$payload['password'], $user['password_hash'])) {
        json_response(401, ['error' => 'Invalid email or password.']);
    }

    $sessionId = bin2hex(random_bytes(32));
    $stmt = db()->prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$sessionId, $user['id'], date('Y-m-d H:i:s', time() + 86400 * 14), now_sql()]);
    set_session_cookie($sessionId);
    json_response(200, ['message' => 'Logged in.', 'user' => public_user($user)]);
}

function handle_booking(): void
{
    $payload = request_payload();
    require_fields($payload, ['name', 'email', 'phone', 'service', 'priceOption', 'propertyType', 'city', 'date', 'time']);
    $pricing = pricing_selection($payload);
    $user = current_user();
    $reference = make_reference('FSB', 'bookings');
    $pdo = db();
    $stmt = $pdo->prepare('INSERT INTO bookings
        (reference, user_id, name, email, phone, service, pricing_category, price_option, quantity, unit_price, price_unit, estimated_total, property_type, rooms, city, address, service_date, service_time, frequency, notes, status, payment_method, payment_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $reference,
        $user['id'] ?? null,
        clean($payload['name']),
        strtolower(clean($payload['email'])),
        clean($payload['phone']),
        $pricing['service'],
        $pricing['group'],
        $pricing['option'],
        $pricing['quantity'],
        $pricing['unitPrice'],
        $pricing['unit'],
        $pricing['total'],
        clean($payload['propertyType']),
        clean($payload['rooms'] ?? ''),
        clean($payload['city']),
        clean($payload['address'] ?? ''),
        clean($payload['date']),
        clean($payload['time']),
        clean($payload['frequency'] ?? ''),
        clean($payload['notes'] ?? ''),
        'Pending Payment',
        'PayFast',
        'Awaiting PayFast',
        now_sql(),
        now_sql(),
    ]);

    $booking = $pdo->query('SELECT * FROM bookings WHERE id = ' . (int)$pdo->lastInsertId())->fetch();
    notify_admin(
        'New FreshAndShine booking pending payment: ' . $reference,
        "Reference: {$reference}\nClient: {$booking['name']}\nEmail: {$booking['email']}\nPhone: {$booking['phone']}\nService: {$booking['service']} / {$booking['price_option']}\nAmount: R" . number_format((float)$booking['estimated_total'], 2) . "\nDate: {$booking['service_date']} {$booking['service_time']}\nCity: {$booking['city']}\nPayment: Awaiting PayFast"
    );

    json_response(201, [
        'message' => 'Booking created. Redirecting to secure PayFast checkout.',
        'booking' => [
            'reference' => $reference,
            'estimatedTotal' => (float)$booking['estimated_total'],
            'paymentStatus' => $booking['payment_status'],
        ],
        'payfast' => build_payfast_checkout($booking),
    ]);
}

function handle_quote(): void
{
    $payload = request_payload();
    require_fields($payload, ['contactName', 'email', 'phone', 'service', 'priceOption']);
    $pricing = pricing_selection($payload);
    $reference = make_reference('FSQ', 'quotes');
    $services = $payload['services'] ?? [];
    if (!is_array($services)) {
        $services = [$services];
    }

    $stmt = db()->prepare('INSERT INTO quotes
        (reference, contact_name, email, phone, hotel_name, property_type, city, rooms, frequency, service, pricing_category, price_option, quantity, estimated_total, services, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $reference,
        clean($payload['contactName']),
        strtolower(clean($payload['email'])),
        clean($payload['phone']),
        clean($payload['hotelName'] ?? ''),
        clean($payload['propertyType'] ?? ''),
        clean($payload['city'] ?? ''),
        clean($payload['rooms'] ?? ''),
        clean($payload['frequency'] ?? ''),
        $pricing['service'],
        $pricing['group'],
        $pricing['option'],
        $pricing['quantity'],
        $pricing['total'],
        json_encode(array_values($services), JSON_FLAGS),
        clean($payload['notes'] ?? ''),
        'New',
        now_sql(),
        now_sql(),
    ]);

    notify_admin(
        'New FreshAndShine quote request: ' . $reference,
        "Reference: {$reference}\nClient: " . clean($payload['contactName']) . "\nEmail: " . clean($payload['email']) . "\nPhone: " . clean($payload['phone']) . "\nService: {$pricing['service']} / {$pricing['option']}\nEstimate: R" . number_format($pricing['total'], 2)
    );

    json_response(201, [
        'message' => 'Quote request received. Fresh and Shine will contact you shortly.',
        'quote' => [
            'reference' => $reference,
            'estimatedTotal' => $pricing['total'],
        ],
    ]);
}

function handle_contact(): void
{
    $payload = request_payload();
    require_fields($payload, ['name', 'email', 'phone', 'message']);
    $reference = make_reference('FSC', 'contacts');
    $stmt = db()->prepare('INSERT INTO contacts (reference, name, email, phone, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$reference, clean($payload['name']), strtolower(clean($payload['email'])), clean($payload['phone']), clean($payload['message']), 'New', now_sql()]);

    notify_admin(
        'New FreshAndShine contact message: ' . $reference,
        "Reference: {$reference}\nName: " . clean($payload['name']) . "\nEmail: " . clean($payload['email']) . "\nPhone: " . clean($payload['phone']) . "\nMessage:\n" . clean($payload['message'])
    );

    json_response(201, ['message' => 'Message received. Fresh and Shine will contact you shortly.', 'reference' => $reference]);
}

function handle_payfast_itn(): void
{
    $payload = $_POST;
    $reference = clean($payload['m_payment_id'] ?? $payload['custom_str1'] ?? '');
    $validSignature = isset($payload['signature']) && hash_equals(strtolower((string)$payload['signature']), payfast_signature($payload));
    $validServer = $validSignature ? validate_payfast_with_server($payload) : false;

    $stmt = db()->prepare('INSERT INTO payfast_itn_logs (booking_reference, valid_signature, valid_server, raw_payload, created_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$reference, $validSignature ? 1 : 0, $validServer ? 1 : 0, json_encode($payload, JSON_FLAGS), now_sql()]);

    if (!$validSignature) {
        text_response(400, 'INVALID SIGNATURE');
    }

    $stmt = db()->prepare('SELECT * FROM bookings WHERE reference = ? LIMIT 1');
    $stmt->execute([$reference]);
    $booking = $stmt->fetch();
    if (!$booking) {
        text_response(404, 'BOOKING NOT FOUND');
    }

    $amountGross = (float)($payload['amount_gross'] ?? 0);
    $expected = (float)$booking['estimated_total'];
    if (abs($amountGross - $expected) > 0.01) {
        text_response(400, 'AMOUNT MISMATCH');
    }

    $paymentStatus = clean($payload['payment_status'] ?? 'Unknown');
    $providerPaymentId = clean($payload['pf_payment_id'] ?? '');
    $status = strtoupper($paymentStatus) === 'COMPLETE' ? 'Paid' : $paymentStatus;
    $bookingStatus = strtoupper($paymentStatus) === 'COMPLETE' ? 'Confirmed' : 'Pending Payment';

    $stmt = db()->prepare('UPDATE bookings SET payment_status = ?, status = ?, payfast_payment_id = ?, updated_at = ? WHERE reference = ?');
    $stmt->execute([$status, $bookingStatus, $providerPaymentId, now_sql(), $reference]);

    $stmt = db()->prepare('INSERT INTO payments (booking_reference, provider, provider_payment_id, amount, status, raw_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$reference, 'PayFast', $providerPaymentId, $amountGross, $status, json_encode($payload, JSON_FLAGS), now_sql()]);

    if ($status === 'Paid') {
        notify_admin(
            'FreshAndShine PayFast payment confirmed: ' . $reference,
            "Payment confirmed for booking {$reference}\nAmount: R" . number_format($amountGross, 2) . "\nPayFast ID: {$providerPaymentId}"
        );
    }

    text_response(200, 'OK');
}

function handle_my_bookings(): void
{
    $user = current_user();
    if (!$user) {
        json_response(401, ['error' => 'Please log in.']);
    }
    $stmt = db()->prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$user['id']]);
    $bookings = array_map(function (array $item): array {
        return [
            'reference' => $item['reference'],
            'service' => $item['service'],
            'propertyType' => $item['property_type'],
            'date' => $item['service_date'],
            'time' => $item['service_time'],
            'city' => $item['city'],
            'estimatedTotal' => (float)$item['estimated_total'],
            'paymentStatus' => $item['payment_status'],
            'status' => $item['status'],
        ];
    }, $stmt->fetchAll());
    json_response(200, ['bookings' => $bookings]);
}

function handle_profile(): void
{
    $user = current_user();
    if (!$user) {
        json_response(401, ['error' => 'Please log in.']);
    }
    $payload = request_payload();
    $stmt = db()->prepare('UPDATE users SET name = ?, phone = ?, company = ?, newsletter = ?, updated_at = ? WHERE id = ?');
    $stmt->execute([
        clean($payload['name'] ?? $user['name']),
        clean($payload['phone'] ?? ''),
        clean($payload['company'] ?? ''),
        !empty($payload['newsletter']) ? 1 : 0,
        now_sql(),
        $user['id'],
    ]);
    json_response(200, ['user' => public_user(current_user())]);
}

function handle_admin_records(): void
{
    $token = clean($_GET['token'] ?? '');
    $expected = clean(app_config()['app']['admin_token'] ?? '');
    if ($expected === '' || !hash_equals($expected, $token)) {
        json_response(403, ['error' => 'Invalid admin token.']);
    }
    $pdo = db();
    $bookings = $pdo->query('SELECT reference, name, email, phone, service, property_type AS propertyType, city, service_date AS date, service_time AS time, status, created_at AS createdAt FROM bookings ORDER BY created_at DESC LIMIT 100')->fetchAll();
    $quotes = $pdo->query('SELECT reference, contact_name AS contactName, email, phone, hotel_name AS hotelName, property_type AS propertyType, city, status, created_at AS createdAt FROM quotes ORDER BY created_at DESC LIMIT 100')->fetchAll();
    $contacts = $pdo->query('SELECT reference, name, email, phone, message AS service, status, created_at AS createdAt FROM contacts ORDER BY created_at DESC LIMIT 100')->fetchAll();
    json_response(200, ['bookings' => $bookings, 'quotes' => $quotes, 'contacts' => $contacts]);
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $route = trim((string)($_GET['route'] ?? ''), '/');
    if ($route === '') {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
        $route = trim(preg_replace('#^/api/?#', '', $path), '/');
    }

    if ($method === 'GET' && $route === '') {
        json_response(200, ['status' => 'ok', 'service' => 'FreshAndShine PHP API']);
    }
    if ($method === 'GET' && $route === 'me') {
        json_response(200, ['user' => public_user(current_user())]);
    }
    if ($method === 'POST' && $route === 'register') {
        handle_register();
    }
    if ($method === 'POST' && $route === 'login') {
        handle_login();
    }
    if ($method === 'POST' && $route === 'logout') {
        $sid = $_COOKIE['fs_session'] ?? '';
        if ($sid !== '') {
            $stmt = db()->prepare('DELETE FROM sessions WHERE id = ?');
            $stmt->execute([$sid]);
        }
        clear_session_cookie();
        json_response(200, ['message' => 'Logged out.']);
    }
    if ($method === 'POST' && $route === 'password-reset') {
        json_response(200, ['message' => 'If this email exists, a reset link will be sent after SMTP is configured.']);
    }
    if ($method === 'POST' && $route === 'bookings') {
        handle_booking();
    }
    if ($method === 'POST' && $route === 'quotes') {
        handle_quote();
    }
    if ($method === 'POST' && $route === 'contact') {
        handle_contact();
    }
    if ($method === 'POST' && $route === 'payfast/itn') {
        handle_payfast_itn();
    }
    if ($method === 'GET' && $route === 'my-bookings') {
        handle_my_bookings();
    }
    if ($method === 'PATCH' && $route === 'profile') {
        handle_profile();
    }
    if ($method === 'GET' && $route === 'admin/records') {
        handle_admin_records();
    }

    json_response(404, ['error' => 'API route not found.']);
} catch (Throwable $error) {
    json_response(500, ['error' => 'Server error: ' . $error->getMessage()]);
}
