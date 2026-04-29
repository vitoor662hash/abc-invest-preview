<?php
/**
 * Rate limiter baseado no banco.
 * Tabela `rate_limits` (criada em sql/database.sql).
 *
 * Limita N requests por janela de M segundos por IP.
 */

declare(strict_types=1);

require_once __DIR__ . '/db-connect.php';
require_once __DIR__ . '/../api/config.php';

/**
 * Retorna true se o IP ESTOUROU o limite (ou seja: bloquear).
 */
function abc_is_rate_limited(string $ip, string $action = 'lead_submit'): bool
{
    $pdo = abc_db();

    // Limpa entradas expiradas
    $pdo->prepare('DELETE FROM rate_limits WHERE expires_at < NOW()')->execute();

    // Conta ocorrências válidas
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS total FROM rate_limits WHERE ip = :ip AND action = :action AND expires_at > NOW()'
    );
    $stmt->execute([':ip' => $ip, ':action' => $action]);
    $row = $stmt->fetch();
    $total = (int)($row['total'] ?? 0);

    if ($total >= RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    // Registra esta tentativa
    $expires = date('Y-m-d H:i:s', time() + RATE_LIMIT_WINDOW_SECONDS);
    $insert  = $pdo->prepare(
        'INSERT INTO rate_limits (ip, action, expires_at) VALUES (:ip, :action, :expires)'
    );
    $insert->execute([':ip' => $ip, ':action' => $action, ':expires' => $expires]);

    return false;
}
