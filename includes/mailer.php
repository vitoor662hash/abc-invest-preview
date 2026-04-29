<?php
/**
 * Mailer simples via SMTP (sem dependências externas).
 *
 * Implementação minimalista pra evitar Composer. Suporta:
 *   - Conexão SSL (porta 465) ou STARTTLS (porta 587)
 *   - Auth LOGIN
 *   - Envio HTML + texto
 *
 * Limitações conhecidas: não anexa arquivos, não faz DKIM (Hostinger faz por nós).
 */

declare(strict_types=1);

require_once __DIR__ . '/../api/config.php';

/**
 * Envia um e-mail via SMTP autenticado.
 *
 * @return array{ok: bool, error?: string}
 */
function abc_send_email(string $toEmail, string $toName, string $subject, string $htmlBody, string $textBody = ''): array
{
    $host    = SMTP_HOST;
    $port    = (int) SMTP_PORT;
    $secure  = SMTP_SECURE;
    $user    = SMTP_USER;
    $pass    = SMTP_PASS;
    $fromE   = SMTP_FROM_EMAIL;
    $fromN   = SMTP_FROM_NAME;
    $timeout = 10;

    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;

    $errno = 0; $errstr = '';
    $socket = @stream_socket_client($remote, $errno, $errstr, $timeout);
    if (!$socket) {
        error_log('[ABC] SMTP connect failed: ' . $errstr);
        return ['ok' => false, 'error' => 'smtp_connect_failed'];
    }
    stream_set_timeout($socket, $timeout);

    $expect = function (string $code) use ($socket) {
        $resp = '';
        while ($line = fgets($socket, 515)) {
            $resp .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        return strpos($resp, $code) === 0 ? $resp : false;
    };
    $send = function (string $cmd) use ($socket) {
        fwrite($socket, $cmd . "\r\n");
    };

    if (!$expect('220')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_no_greeting']; }

    $send('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
    if (!$expect('250')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_ehlo_failed']; }

    if ($secure === 'tls') {
        $send('STARTTLS');
        if (!$expect('220')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_starttls_failed']; }
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            return ['ok' => false, 'error' => 'smtp_crypto_failed'];
        }
        $send('EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        if (!$expect('250')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_ehlo2_failed']; }
    }

    $send('AUTH LOGIN');
    if (!$expect('334')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_auth_init_failed']; }
    $send(base64_encode($user));
    if (!$expect('334')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_auth_user_failed']; }
    $send(base64_encode($pass));
    if (!$expect('235')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_auth_failed']; }

    $send('MAIL FROM:<' . $fromE . '>');
    if (!$expect('250')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_from_failed']; }
    $send('RCPT TO:<' . $toEmail . '>');
    if (!$expect('250')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_to_failed']; }

    $send('DATA');
    if (!$expect('354')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_data_failed']; }

    $boundary = '==MIXED-' . bin2hex(random_bytes(8));
    $headers  = [];
    $headers[] = 'From: ' . sprintf('"%s" <%s>', addslashes($fromN), $fromE);
    $headers[] = 'To: ' . ($toName !== '' ? sprintf('"%s" <%s>', addslashes($toName), $toEmail) : $toEmail);
    $headers[] = 'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

    $textBody = $textBody !== '' ? $textBody : strip_tags($htmlBody);

    $body  = "\r\n--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($textBody));
    $body .= "\r\n--$boundary\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
    $body .= chunk_split(base64_encode($htmlBody));
    $body .= "\r\n--$boundary--\r\n";

    // Dot stuffing (RFC 5321): linhas começando com "." precisam ser duplicadas
    $payload = implode("\r\n", $headers) . "\r\n" . $body;
    $payload = preg_replace('/^\./m', '..', $payload);

    fwrite($socket, $payload . "\r\n.\r\n");
    if (!$expect('250')) { fclose($socket); return ['ok' => false, 'error' => 'smtp_send_failed']; }

    $send('QUIT');
    fclose($socket);

    return ['ok' => true];
}
