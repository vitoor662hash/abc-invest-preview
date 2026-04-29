<?php
/**
 * ABC Invest — Configurações (TEMPLATE)
 *
 * Este arquivo VAI pro repositório. NÃO contém credenciais reais.
 * Pra deploy:
 *   1. Copie este arquivo pra api/config.php (que está no .gitignore)
 *   2. Substitua todos os valores marcados com TROCAR_*
 *   3. NUNCA commite api/config.php
 */

declare(strict_types=1);

// --------- Ambiente ---------
define('APP_ENV', 'production');         // 'production' | 'development'
define('APP_DEBUG', false);              // true só em ambiente local
date_default_timezone_set('America/Sao_Paulo');

// --------- Segurança / Origens permitidas ---------
define('ALLOWED_ORIGINS', [
    'https://abcinvest.com.br',
    'https://www.abcinvest.com.br',
]);

// --------- Banco de dados (MySQL/MariaDB Hostinger) ---------
define('DB_HOST', 'localhost');
define('DB_NAME', 'TROCAR_NOME_DO_BANCO');      // ex: u000000000_abc_invest
define('DB_USER', 'TROCAR_USUARIO_DO_BANCO');   // ex: u000000000_abc_user
define('DB_PASS', 'TROCAR_SENHA_DO_BANCO');
define('DB_CHARSET', 'utf8mb4');

// --------- E-mail (SMTP) ---------
// Hostinger entrega SMTP autenticado. Criar uma caixa do tipo
// noreply@abcinvest.com.br no painel e usar abaixo.
define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');                   // 'ssl' (porta 465) ou 'tls' (porta 587)
define('SMTP_USER', 'noreply@abcinvest.com.br');
define('SMTP_PASS', 'TROCAR_SENHA_SMTP');
define('SMTP_FROM_EMAIL', 'noreply@abcinvest.com.br');
define('SMTP_FROM_NAME', 'ABC Invest — Site');

// Pra onde enviar a notificação de novo lead
define('LEAD_NOTIFY_EMAIL', 'felipeduarte8@hotmail.com');
define('LEAD_NOTIFY_NAME', 'Felipe Duarte');

// --------- WhatsApp ---------
// Fase 1: link wa.me direto. Mensagens compostas no front e no e-mail interno.
// Fase 2 (futuro): preencher WHATSAPP_API_* e migrar whatsapp-sender.php.
define('WHATSAPP_NUMERO_COMERCIAL', '5511982114443');
define('WHATSAPP_NUMERO_SECUNDARIO', '5511914943924');
define('WHATSAPP_API_URL', '');
define('WHATSAPP_API_TOKEN', '');

// --------- CRM Webhook (placeholder pra fase futura) ---------
define('CRM_WEBHOOK_URL', '');                  // ex: 'https://api.rdstation.com/...'
define('CRM_WEBHOOK_TOKEN', '');

// --------- Rate limit ---------
define('RATE_LIMIT_MAX_REQUESTS', 5);           // máximo de envios
define('RATE_LIMIT_WINDOW_SECONDS', 600);       // janela em segundos (10min)

// --------- Sessão / CSRF ---------
define('CSRF_TOKEN_NAME', 'abc_csrf');
define('SESSION_NAME', 'ABCSESSID');

/**
 * Inicia sessão de forma segura. Chamado por endpoints que precisam de CSRF.
 */
function abc_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    session_name(SESSION_NAME);
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => APP_ENV === 'production',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

/**
 * Resposta JSON padronizada.
 */
function abc_json(int $status, array $data): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Valida se o Origin/Referer da requisição está autorizado.
 * Retorna true se ok, false se bloqueado.
 */
function abc_check_origin(): bool
{
    if (APP_ENV !== 'production') return true;

    $origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $source  = $origin ?: $referer;

    if ($source === '') return false;

    foreach (ALLOWED_ORIGINS as $allowed) {
        if (strpos($source, $allowed) === 0) return true;
    }
    return false;
}

/**
 * Pega o IP real do cliente (considerando proxies da Hostinger).
 */
function abc_client_ip(): string
{
    $candidates = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($candidates as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = trim(explode(',', $_SERVER[$key])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
        }
    }
    return '0.0.0.0';
}
