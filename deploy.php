<?php
$secret = getenv('DEPLOY_SECRET');
$payload = file_get_contents('php://input');
$sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($sig, $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '')) {
    http_response_code(403);
    exit('Forbidden');
}

$output = shell_exec('cd /home/xfurnitureco/public_html/quotes && git pull 2>&1');
echo $output;
