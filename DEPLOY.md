# DEPLOY.md — Subir o site na Hostinger

Guia passo a passo. Tempo total estimado: **40-60 minutos** na primeira vez.

---

## Pré-requisitos

- [ ] Conta Hostinger ativa (plano Premium ou Business — sem isso, não roda PHP/MySQL)
- [ ] Domínio comprado e propagado (`abcinvest.com.br` ou similar)
- [ ] Cliente FTP instalado (FileZilla, Cyberduck) — opcional, dá pra usar Gerenciador de Arquivos do hPanel

---

## 1. Criar o banco de dados

1. Logar no **hPanel** da Hostinger
2. Menu lateral → **Bancos de Dados → Bancos de Dados MySQL**
3. Clicar em **"Criar novo banco de dados"**
4. Preencher:
   - Nome do banco: `abc_invest_leads` (Hostinger prefixa com `u000000000_` automaticamente)
   - Usuário: `abc_user`
   - Senha: gerar uma forte e **anotar**
5. Clicar em **Criar**
6. Anotar:
   - Nome completo do banco (ex: `u123456789_abc_invest_leads`)
   - Usuário completo (ex: `u123456789_abc_user`)
   - Senha
   - Host (geralmente `localhost`)

---

## 2. Importar o schema

1. No mesmo painel → **phpMyAdmin** ao lado do banco criado
2. Abrir o banco recém-criado no menu da esquerda
3. Aba **Importar** → escolher arquivo `sql/database.sql` do projeto
4. Clicar em **Importar**
5. Verificar se as tabelas `leads` e `rate_limits` foram criadas

---

## 3. Criar caixa de e-mail SMTP

1. **hPanel → E-mails → Contas de E-mail**
2. **Criar nova conta:**
   - Endereço: `noreply@abcinvest.com.br` (ou similar — precisa ser do domínio próprio)
   - Senha: gerar forte e **anotar**
3. Anotar configurações de SMTP exibidas:
   - Servidor: `smtp.hostinger.com` (geralmente)
   - Porta: 465 (SSL) ou 587 (TLS)
   - Usuário: o e-mail completo
   - Senha: a definida acima

---

## 4. Configurar o `config.php`

Antes de subir, editar `api/config.php` com os dados anotados:

```php
define('APP_ENV', 'production');

define('ALLOWED_ORIGINS', [
    'https://abcinvest.com.br',
    'https://www.abcinvest.com.br',
]);

define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_abc_invest_leads');  // ← seu nome real
define('DB_USER', 'u123456789_abc_user');           // ← seu user real
define('DB_PASS', 'SENHA_QUE_VOCE_DEFINIU');        // ← sua senha real

define('SMTP_HOST', 'smtp.hostinger.com');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');
define('SMTP_USER', 'noreply@abcinvest.com.br');    // ← e-mail real criado
define('SMTP_PASS', 'SENHA_DO_EMAIL');              // ← senha do e-mail
define('SMTP_FROM_EMAIL', 'noreply@abcinvest.com.br');
define('SMTP_FROM_NAME', 'ABC Invest — Site');

define('LEAD_NOTIFY_EMAIL', 'felipeduarte8@hotmail.com');
define('LEAD_NOTIFY_NAME', 'Felipe Duarte');
```

⚠️ **Não commitar este arquivo com senhas reais em repositório público.**

---

## 5. Subir os arquivos

### Via Gerenciador de Arquivos (mais fácil)
1. **hPanel → Arquivos → Gerenciador de Arquivos**
2. Entrar em `public_html/`
3. Apagar o `index.html` padrão da Hostinger se existir
4. Subir TODA a pasta `abc-invest/` — exceto que o conteúdo da pasta vai pra raiz de `public_html/`, não dentro de `public_html/abc-invest/`
5. Verificar que os arquivos `.htaccess` (oculto), `index.html`, `obrigado.html`, e as pastas `assets/`, `api/`, `includes/`, `sql/` estão em `public_html/`

### Via FTP (FileZilla)
1. **hPanel → Arquivos → Contas FTP** → criar conta ou usar existente
2. Conectar no FileZilla com host, usuário, senha
3. Arrastar conteúdo da pasta `abc-invest/` pra `/public_html/`

⚠️ Garantir que arquivos ocultos (começando com `.`) estejam visíveis e sejam transferidos — em especial `.htaccess`.

---

## 6. Apontar o domínio

Se o domínio foi comprado na Hostinger, ele já vem apontado pra `public_html`.

Se foi comprado fora (Registro.br):
1. **Painel do registrador** → editar DNS
2. Adicionar registros A e CNAME conforme instruções da Hostinger (geralmente IP `153.92.X.X`)
3. Aguardar propagação (até 24h, normalmente < 2h)

---

## 7. Ativar SSL grátis

1. **hPanel → Avançado → SSL**
2. Selecionar o domínio
3. Clicar em **Instalar SSL grátis** (Let's Encrypt)
4. Aguardar 5-10 minutos pra certificar

Quando o cadeado aparecer no navegador:

5. Editar `.htaccess` no projeto e **descomentar** o bloco de redirect HTTPS:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```
6. Subir o `.htaccess` atualizado novamente

---

## 8. Testar em produção

### Teste 1 — Site abre
- [ ] `https://abcinvest.com.br/` carrega a landing
- [ ] Cadeado verde no navegador
- [ ] Mobile + desktop renderizam corretamente
- [ ] Console do DevTools sem erros vermelhos

### Teste 2 — Form funciona
- [ ] Preencher os 4 campos com dados de teste
- [ ] Clicar em "Quero saber quanto pago"
- [ ] Redirecionou pra `obrigado.html`?
- [ ] No phpMyAdmin: novo registro na tabela `leads`?
- [ ] Caixa do `LEAD_NOTIFY_EMAIL` recebeu o e-mail HTML formatado?

### Teste 3 — Validação
- [ ] Enviar form com campos vazios → mostra erros inline
- [ ] Enviar com WhatsApp inválido (ex: "123") → erro inline
- [ ] Tentar enviar 6 vezes seguidas → na 6ª, mostra mensagem de rate limit

### Teste 4 — Honeypot
- [ ] Inspecionar o `<input name="website">` no DevTools, preencher manualmente, submeter
- [ ] Backend deve fingir sucesso mas NÃO gravar no banco

### Teste 5 — WhatsApp
- [ ] Clicar nos botões de WhatsApp do hero, rodapé, sticky e cards de imóvel
- [ ] Cada um abre `wa.me/...` com mensagem específica do contexto

### Teste 6 — SEO
- [ ] Abrir `https://abcinvest.com.br/sitemap.xml` — XML válido
- [ ] Abrir `https://abcinvest.com.br/robots.txt` — texto correto
- [ ] Validar Schema.org em https://validator.schema.org/

### Teste 7 — Lighthouse
- [ ] Chrome DevTools → Lighthouse → executar todas as categorias
- [ ] Performance > 90, Accessibility > 90, Best Practices > 90, SEO > 90

---

## 9. Pós-launch

### Adicionar Google Analytics 4
1. Criar propriedade em https://analytics.google.com/
2. Copiar tag do GA4
3. Colar antes de `</head>` no `index.html` E no `obrigado.html`
4. Em `obrigado.html` descomentar o bloco de tracking de conversão

### Adicionar Meta Pixel
1. Criar pixel em https://business.facebook.com/
2. Colar tag no `<head>` do `index.html`
3. Adicionar evento `Lead` no submit do form (em `assets/js/form.js` no callback de sucesso)

### Submeter sitemap ao Google
1. Search Console → Adicionar propriedade
2. Verificar via DNS ou meta tag
3. Sitemaps → adicionar `https://abcinvest.com.br/sitemap.xml`

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| 500 ao submeter form | DB credentials erradas | Conferir `config.php` contra hPanel |
| E-mail de notificação não chega | SMTP credentials erradas | Testar SMTP do servidor; verificar pasta SPAM |
| `403` ao buscar `csrf-token.php` | `ALLOWED_ORIGINS` errado | Conferir domínio com/sem `www` |
| `429` mesmo na primeira tentativa | Tabela `rate_limits` corrompida | Truncar a tabela: `TRUNCATE rate_limits;` |
| Fonte Poppins não carrega | CSP bloqueando | Conferir `Content-Security-Policy` no `.htaccess` |
| Cadeado quebrado | Mistura HTTP/HTTPS | Garantir que todos os `<img src>`, `<a href>` usem HTTPS ou caminhos relativos |

---

## 11. Backup recomendado

- **Banco:** semanal — exportar SQL via phpMyAdmin
- **Arquivos:** mensal — baixar `public_html/` via FTP

---

**Documento mantido por:** EQUIPE CAOS / Pinnacle
**Cliente final:** ABC Invest
