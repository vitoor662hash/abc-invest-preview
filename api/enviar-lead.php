<?php
/**
 * Endpoint principal de captura de lead.
 *
 * Fluxo:
 *  1. Valida método + origin
 *  2. Valida CSRF de sessão
 *  3. Verifica honeypot
 *  4. Aplica rate limit por IP
 *  5. Sanitiza e valida campos
 *  6. Insere no banco
 *  7. Dispara e-mail SMTP de notificação interna
 *  8. (placeholder) Dispara webhook de CRM se configurado
 *  9. Retorna JSON
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../includes/db-connect.php';
require_once __DIR__ . '/../includes/mailer.php';
require_once __DIR__ . '/../includes/whatsapp-sender.php';
require_once __DIR__ . '/../includes/rate-limiter.php';

// ---------- Headers ----------
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ---------- Método ----------
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    abc_json(405, ['success' => false, 'message' => 'Método não permitido.']);
}

// ---------- Origin ----------
if (!abc_check_origin()) {
    abc_json(403, ['success' => false, 'message' => 'Origem não autorizada.']);
}

// ---------- Honeypot ----------
$honeypot = $_POST['website'] ?? '';
if ($honeypot !== '') {
    // Bot detectado — fingir sucesso pra não dar feedback
    abc_json(200, ['success' => true]);
}

// ---------- CSRF ----------
abc_start_session();
$tokenSent    = $_POST['csrf_token']            ?? '';
$tokenSession = $_SESSION[CSRF_TOKEN_NAME]      ?? '';
if ($tokenSent === '' || $tokenSession === '' || !hash_equals($tokenSession, $tokenSent)) {
    abc_json(419, ['success' => false, 'message' => 'Sessão expirada. Recarrega a página e tenta de novo.']);
}

// ---------- Rate limit ----------
$ip = abc_client_ip();
if (abc_is_rate_limited($ip, 'lead_submit')) {
    abc_json(429, [
        'success' => false,
        'message' => 'Você já enviou várias vezes. Calma! Se foi engano, espera uns minutinhos e tenta de novo.',
    ]);
}

// ---------- Sanitização ----------
function clean(string $value): string
{
    return trim(strip_tags($value));
}

$nome         = clean((string)($_POST['nome']         ?? ''));
$whatsapp     = clean((string)($_POST['whatsapp']     ?? ''));
$cidade       = clean((string)($_POST['cidade']       ?? ''));
$renda        = clean((string)($_POST['renda']        ?? ''));
$objetivo     = clean((string)($_POST['objetivo']     ?? ''));
$spc          = clean((string)($_POST['spc']          ?? ''));
$entrada      = clean((string)($_POST['entrada']      ?? ''));
$parcela      = clean((string)($_POST['parcela']      ?? ''));
$proprietario = clean((string)($_POST['proprietario'] ?? ''));
$urgencia     = clean((string)($_POST['urgencia']     ?? ''));

// Labels humanas dos values dos radios (devem bater com o quiz no front)
$LABELS = [
    'objetivo' => [
        'aluguel'  => 'Sair do aluguel',
        'primeira' => 'Primeira casa pelo MCMV',
        'investir' => 'Investir em imóvel',
    ],
    'renda' => [
        'ate-2k'   => 'Até R$ 2.000',
        '2k-4k'    => 'R$ 2.000 a R$ 4.000',
        '4k-8k'    => 'R$ 4.000 a R$ 8.000',
        'acima-8k' => 'Acima de R$ 8.000',
    ],
    'spc' => [
        'limpo'     => 'Limpo, sem restrições',
        'restricao' => 'Tem alguma restrição',
        'nao-sei'   => 'Não tem certeza',
    ],
    'entrada' => [
        'economia'        => 'Tem economia separada',
        'fgts'            => 'Pode usar FGTS',
        'economia-e-fgts' => 'Tem economia + FGTS',
        'ainda-nao'       => 'Vai organizar a entrada',
    ],
    'parcela' => [
        'ate-800'     => 'Até R$ 800',
        '800-1200'    => 'R$ 800 a R$ 1.200',
        '1200-2000'   => 'R$ 1.200 a R$ 2.000',
        'acima-2000'  => 'Acima de R$ 2.000',
    ],
    'proprietario' => [
        'primeira'    => 'Não, será o primeiro',
        'quitado'     => 'Sim, mas já quitou',
        'financiando' => 'Sim, ainda financiando',
    ],
    'urgencia' => [
        '3meses'     => 'O quanto antes (até 3 meses)',
        '6meses'     => 'Próximos 6 meses',
        '1ano'       => 'Próximo ano',
        'planejando' => 'Tá planejando',
    ],
];

function lbl(array $map, string $field, string $val): string {
    return $map[$field][$val] ?? ($val !== '' ? $val : '—');
}

// ---------- Validação ----------
$errors = [];

if (mb_strlen($nome) < 3 || mb_strlen($nome) > 120 || strpos($nome, ' ') === false) {
    $errors['nome'] = 'Por favor, digita seu nome completo.';
}

$digits = preg_replace('/\D/', '', $whatsapp) ?? '';
if (strlen($digits) !== 10 && strlen($digits) !== 11) {
    $errors['whatsapp'] = 'Verifica o número, parece estar incompleto.';
}

if (mb_strlen($cidade) < 2 || mb_strlen($cidade) > 80) {
    $errors['cidade'] = 'Coloca a cidade onde você quer morar ou já mora.';
}

if (!array_key_exists($renda, $LABELS['renda'])) {
    $errors['renda'] = 'Escolhe uma faixa pra gente te orientar melhor.';
}

if (!empty($errors)) {
    abc_json(422, [
        'success' => false,
        'message' => 'Verifica os campos marcados em vermelho.',
        'errors'  => $errors,
    ]);
}

$rendaLabel = $LABELS['renda'][$renda];
$whatsappFormatted = (strlen($digits) === 11)
    ? sprintf('(%s) %s-%s', substr($digits, 0, 2), substr($digits, 2, 5), substr($digits, 7))
    : sprintf('(%s) %s-%s', substr($digits, 0, 2), substr($digits, 2, 6), substr($digits, 8));

// ---------- Persistência ----------
// Helper: converte string vazia em NULL pros campos quiz opcionais
$nullIfEmpty = static function (string $v): ?string {
    return $v !== '' ? $v : null;
};

try {
    $pdo  = abc_db();
    $stmt = $pdo->prepare(
        'INSERT INTO leads
            (nome, whatsapp, cidade, faixa_renda,
             objetivo, spc, entrada, parcela, proprietario, urgencia,
             origem, ip, user_agent)
         VALUES
            (:nome, :whatsapp, :cidade, :renda,
             :objetivo, :spc, :entrada, :parcela, :proprietario, :urgencia,
             :origem, :ip, :ua)'
    );
    $stmt->execute([
        ':nome'         => $nome,
        ':whatsapp'     => $whatsappFormatted,
        ':cidade'       => $cidade,
        ':renda'        => $renda,
        ':objetivo'     => $nullIfEmpty($objetivo),
        ':spc'          => $nullIfEmpty($spc),
        ':entrada'      => $nullIfEmpty($entrada),
        ':parcela'      => $nullIfEmpty($parcela),
        ':proprietario' => $nullIfEmpty($proprietario),
        ':urgencia'     => $nullIfEmpty($urgencia),
        ':origem'       => 'site',
        ':ip'           => $ip,
        ':ua'           => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500),
    ]);
    $leadId = (int)$pdo->lastInsertId();
} catch (Throwable $e) {
    error_log('[ABC] Insert lead failed: ' . $e->getMessage());
    abc_json(500, [
        'success' => false,
        'message' => 'Não foi possível processar agora. Tenta de novo em alguns segundos.',
    ]);
}

// ---------- Notificação por e-mail ----------
$lead = [
    'nome'              => $nome,
    'whatsapp'          => $whatsappFormatted,
    'cidade'            => $cidade,
    'faixa_renda'       => $renda,
    'faixa_renda_label' => $rendaLabel,
    'objetivo'          => $objetivo,
    'spc'               => $spc,
    'entrada'           => $entrada,
    'parcela'           => $parcela,
    'proprietario'      => $proprietario,
    'urgencia'          => $urgencia,
];

$whatsappDigits = preg_replace('/\D/', '', $whatsappFormatted) ?? '';
$primeiroNome   = explode(' ', $nome)[0] ?? $nome;
$replyMsg       = 'Olá ' . $primeiroNome . '! Aqui é da ABC Invest, recebi seu cadastro pelo site. Posso te ajudar?';
$replyLink      = 'https://wa.me/55' . $whatsappDigits . '?text=' . urlencode($replyMsg);

$emailSubject = '🔔 Lead novo ABC Invest — ' . $nome . ' (' . $cidade . ')';

$htmlBody = '<!DOCTYPE html>
<html lang="pt-BR"><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f5f5f5;">
  <div style="background: #081828; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🎯 Lead novo qualificado</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.7;">ABC Invest Imobiliária — recebido em ' . date('d/m/Y H:i') . '</p>
  </div>

  <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1B87E7; font-size: 18px; margin-top: 0;">👤 Contato</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666; width: 140px;">Nome:</td><td style="padding: 8px 0;"><strong>' . htmlspecialchars($nome) . '</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #666;">WhatsApp:</td><td style="padding: 8px 0;"><a href="https://wa.me/55' . htmlspecialchars($whatsappDigits) . '" style="color: #1B87E7;">' . htmlspecialchars($whatsappFormatted) . '</a></td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Cidade:</td><td style="padding: 8px 0;">' . htmlspecialchars($cidade) . '</td></tr>
    </table>

    <h2 style="color: #1B87E7; font-size: 18px; margin-top: 24px;">🎯 Perfil do lead</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #666; width: 140px;">Objetivo:</td><td style="padding: 8px 0;"><strong>' . htmlspecialchars(lbl($LABELS, 'objetivo', $objetivo)) . '</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Renda mensal:</td><td style="padding: 8px 0;">' . htmlspecialchars(lbl($LABELS, 'renda', $renda)) . '</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">SPC/Serasa:</td><td style="padding: 8px 0;">' . htmlspecialchars(lbl($LABELS, 'spc', $spc)) . '</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Entrada:</td><td style="padding: 8px 0;">' . htmlspecialchars(lbl($LABELS, 'entrada', $entrada)) . '</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Parcela disponível:</td><td style="padding: 8px 0;">' . htmlspecialchars(lbl($LABELS, 'parcela', $parcela)) . '</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Já tem imóvel:</td><td style="padding: 8px 0;">' . htmlspecialchars(lbl($LABELS, 'proprietario', $proprietario)) . '</td></tr>
      <tr><td style="padding: 8px 0; color: #666;">Urgência:</td><td style="padding: 8px 0;"><strong>' . htmlspecialchars(lbl($LABELS, 'urgencia', $urgencia)) . '</strong></td></tr>
    </table>

    <div style="margin-top: 32px; padding: 16px; background: #1B87E7; border-radius: 8px; text-align: center;">
      <a href="' . htmlspecialchars($replyLink) . '" style="color: white; text-decoration: none; font-weight: 600;">💬 Responder agora pelo WhatsApp</a>
    </div>

    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      Lead #' . $leadId . ' · IP: ' . htmlspecialchars($ip) . '
    </p>
  </div>
</body></html>';

$emailResult = abc_send_email(LEAD_NOTIFY_EMAIL, LEAD_NOTIFY_NAME, $emailSubject, $htmlBody);
if (!$emailResult['ok']) {
    error_log('[ABC] E-mail falhou pro lead #' . $leadId . ': ' . ($emailResult['error'] ?? 'unknown'));
}

// ---------- WhatsApp (Fase 2) ----------
$wpp = enviarWhatsApp($lead);

// ---------- Webhook CRM (placeholder) ----------
$crmOk = false;
if (CRM_WEBHOOK_URL !== '') {
    $payload = json_encode([
        'lead_id'      => $leadId,
        'nome'         => $nome,
        'whatsapp'     => $whatsappFormatted,
        'cidade'       => $cidade,
        'renda'        => $renda,
        'objetivo'     => $objetivo,
        'spc'          => $spc,
        'entrada'      => $entrada,
        'parcela'      => $parcela,
        'proprietario' => $proprietario,
        'urgencia'     => $urgencia,
        'origem'       => 'site_abcinvest',
        'created_at'   => date('c'),
    ]);
    $ch = curl_init(CRM_WEBHOOK_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . CRM_WEBHOOK_TOKEN,
        ],
        CURLOPT_POSTFIELDS     => $payload,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $crmOk = $code >= 200 && $code < 300;
}

// ---------- Atualiza flags ----------
try {
    $pdo->prepare('UPDATE leads SET enviado_whatsapp = :w, enviado_crm = :c WHERE id = :id')->execute([
        ':w'  => $wpp['ok'] ? 1 : 0,
        ':c'  => $crmOk     ? 1 : 0,
        ':id' => $leadId,
    ]);
} catch (Throwable $e) {
    error_log('[ABC] Update lead flags failed: ' . $e->getMessage());
}

// ---------- Resposta final ----------
abc_json(200, ['success' => true, 'lead_id' => $leadId]);
