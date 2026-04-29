<?php
/**
 * Endpoint que devolve um CSRF token de sessão pro front injetar no form.
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    abc_json(405, ['success' => false, 'message' => 'Método não permitido.']);
}

if (!abc_check_origin()) {
    abc_json(403, ['success' => false, 'message' => 'Origem não autorizada.']);
}

abc_start_session();

if (empty($_SESSION[CSRF_TOKEN_NAME])) {
    $_SESSION[CSRF_TOKEN_NAME] = bin2hex(random_bytes(32));
}

abc_json(200, ['token' => $_SESSION[CSRF_TOKEN_NAME]]);
