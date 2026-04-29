<?php
/**
 * Conexão PDO com MySQL/MariaDB.
 * Falha de conexão NÃO expõe credenciais: loga interno e devolve erro genérico.
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/config.php';

function abc_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST,
        DB_NAME,
        DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        error_log('[ABC] DB connection failed: ' . $e->getMessage());
        abc_json(500, [
            'success' => false,
            'message' => 'Não foi possível processar agora. Tenta de novo em alguns segundos.',
        ]);
    }

    return $pdo;
}
