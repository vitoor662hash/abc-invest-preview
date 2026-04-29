<?php
/**
 * WhatsApp sender — Fase 1 (MVP)
 *
 * Por enquanto não dispara mensagem direto pra API do WhatsApp.
 * Apenas monta o link wa.me que será usado em e-mails internos / dashboard interno
 * pra que o comercial clique e abra a conversa pré-formatada.
 *
 * Quando o cliente decidir migrar pra Z-API / Twilio na Fase 2:
 *  - manter a assinatura `enviarWhatsApp(array $lead): array`
 *  - trocar o corpo dela por uma chamada cURL real à API escolhida
 *  - preencher WHATSAPP_API_URL e WHATSAPP_API_TOKEN no config.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/config.php';

/**
 * Monta o link wa.me com mensagem pré-preenchida pro comercial recepcionar o lead.
 *
 * @return array{link: string, message: string}
 */
function montarLinkWhatsAppLead(array $lead): array
{
    $message = sprintf(
        "🔔 Novo lead ABC Invest\n\nNome: %s\nWhatsApp: %s\nCidade: %s\nFaixa de renda: %s\n\nRecebido em: %s",
        $lead['nome'],
        $lead['whatsapp'],
        $lead['cidade'],
        $lead['faixa_renda_label'] ?? $lead['faixa_renda'],
        date('d/m/Y H:i')
    );

    // Link clicável que abre conversa no WhatsApp do PRÓPRIO LEAD com mensagem pré-pronta
    // pro corretor mandar de volta. Útil pra o comercial agir rápido.
    $digits = preg_replace('/\D/', '', $lead['whatsapp']);
    if (strlen($digits) === 10 || strlen($digits) === 11) {
        $digits = '55' . $digits; // país BR
    }
    $greeting = sprintf(
        "Olá, %s! Aqui é da ABC Invest. Recebemos seu interesse pelo nosso site e vou te ajudar a entender as opções de imóvel pra %s. Posso te chamar agora?",
        explode(' ', trim($lead['nome']))[0],
        $lead['cidade']
    );

    $link = 'https://wa.me/' . $digits . '?text=' . rawurlencode($greeting);

    return [
        'link'    => $link,
        'message' => $message,
    ];
}

/**
 * Envia notificação pelo WhatsApp (placeholder pra Fase 2).
 *
 * @return array{ok: bool, error?: string}
 */
function enviarWhatsApp(array $lead): array
{
    // Fase 1 — não envia automaticamente. Apenas retorna sucesso "passivo".
    // O e-mail SMTP cumpre o papel de notificar o comercial.
    if (WHATSAPP_API_URL === '' || WHATSAPP_API_TOKEN === '') {
        return ['ok' => false, 'error' => 'whatsapp_api_not_configured'];
    }

    // Fase 2 (exemplo de chamada genérica — adaptar quando escolher a API):
    /*
    $payload = [
        'phone'   => WHATSAPP_NUMERO_COMERCIAL,
        'message' => montarLinkWhatsAppLead($lead)['message'],
    ];

    $ch = curl_init(WHATSAPP_API_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . WHATSAPP_API_TOKEN,
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
    ]);
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['ok' => $code >= 200 && $code < 300, 'error' => $code >= 400 ? 'http_' . $code : null];
    */

    return ['ok' => false, 'error' => 'not_implemented'];
}
