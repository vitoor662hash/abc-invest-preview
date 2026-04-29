<?php
/**
 * Placeholder pra receber webhooks de CRM no futuro (RD Station, Pipedrive, HubSpot etc).
 *
 * Hoje não está em uso. Mantido pra que a integração seja apenas configuração,
 * sem exigir reescrita.
 *
 * Quando ativar:
 *  - Validar token via header (X-Auth-Token)
 *  - Mapear payload pro modelo de leads se desejar replicar no banco local
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    abc_json(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
if (CRM_WEBHOOK_TOKEN === '' || !hash_equals(CRM_WEBHOOK_TOKEN, $token)) {
    abc_json(401, ['success' => false, 'message' => 'Não autorizado.']);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

// TODO: implementar lógica de processamento conforme CRM escolhido.
error_log('[ABC] Webhook CRM recebido: ' . substr((string)$raw, 0, 500));

abc_json(200, ['success' => true]);
