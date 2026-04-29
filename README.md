# ABC Invest — Landing page de geração de leads

Landing page institucional + form de captura para a ABC Invest, imobiliária do ABC Paulista especializada em parcela baixa via Minha Casa Minha Vida e financiamento privado.

**Stack:** HTML5 + CSS3 vanilla + JavaScript vanilla + PHP 8 + MySQL/MariaDB. Sem Node, sem build.

---

## 1. Estrutura do projeto

```
abc-invest/
├── index.html              ← landing principal (9 seções)
├── obrigado.html           ← página de confirmação pós-envio
├── robots.txt
├── sitemap.xml
├── .htaccess               ← headers de segurança, cache, HTTPS
├── README.md               ← este arquivo
├── DEPLOY.md               ← passo a passo de subida na Hostinger
├── assets/
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css   ← CSS custom properties (cores, tipografia, espaçamento)
│   │   └── style.css       ← estilos das 9 seções, mobile-first
│   ├── js/
│   │   ├── main.js         ← smooth scroll, FAQ accordion, reveal on scroll
│   │   └── form.js         ← máscara, validação, submit, CSRF fetch
│   └── images/
│       ├── logo.svg / logo.png
│       ├── logo-claro.svg / logo-claro.png
│       ├── logo-icon.svg / logo-icon.png
│       ├── favicon-32/64/192/512.png
│       └── (hero/, socios/, construtoras/, imoveis/, icons/) → vazias, aguardam assets reais
├── api/
│   ├── config.php          ← TODAS as credenciais e constantes (DB, SMTP, WhatsApp)
│   ├── csrf-token.php      ← endpoint que devolve token de sessão pro front
│   ├── enviar-lead.php     ← endpoint principal do form
│   └── webhook-crm.php     ← placeholder pra integração futura
├── includes/
│   ├── db-connect.php      ← PDO singleton
│   ├── mailer.php          ← SMTP cliente nativo (sem Composer)
│   ├── rate-limiter.php    ← janela móvel por IP (DB)
│   └── whatsapp-sender.php ← Fase 1: link wa.me. Fase 2: API real.
└── sql/
    └── database.sql        ← criação das tabelas (leads + rate_limits)
```

---

## 2. Como rodar localmente (desenvolvimento)

### Opção A — XAMPP (Mac/Win/Linux)

1. Baixar XAMPP em https://www.apachefriends.org/
2. Copiar a pasta `abc-invest/` pra dentro de `htdocs/`
3. Iniciar Apache + MySQL pelo painel do XAMPP
4. Abrir `http://localhost/phpmyadmin`, criar banco `abc_invest_leads` e rodar `sql/database.sql`
5. Editar `api/config.php`:
   - `APP_ENV` = `'development'`
   - `DB_NAME` = `'abc_invest_leads'`
   - `DB_USER` = `'root'`
   - `DB_PASS` = `''`
6. Acessar `http://localhost/abc-invest/`

### Opção B — Laragon (Win) ou MAMP (Mac)

Mesmo fluxo: copiar pasta pro `www/` (Laragon) ou `htdocs/` (MAMP), criar banco, ajustar `config.php`.

### Opção C — PHP built-in server (rápido, sem Apache)

```bash
cd abc-invest/
php -S localhost:8000
```

⚠️ Não vai aplicar `.htaccess` — o site roda mas sem as regras de cache/HTTPS/CSP. Bom só pra desenvolvimento de UI.

---

## 3. Variáveis a configurar antes do deploy

Todas centralizadas em `api/config.php`. **Nunca commitar este arquivo com valores reais.**

| Constante | O quê | Onde pegar |
|---|---|---|
| `APP_ENV` | `'production'` em produção, `'development'` local | — |
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASS` | Credenciais MySQL | Painel Hostinger → Bancos de Dados |
| `ALLOWED_ORIGINS` | Lista de domínios que podem postar no form | Domínio comprado |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Conta de e-mail pra disparar notificação | Painel Hostinger → E-mails. Criar `noreply@abcinvest.com.br` |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | Remetente exibido | — |
| `LEAD_NOTIFY_EMAIL` | Pra onde vai a notificação de cada lead novo | Hoje: `felipeduarte8@hotmail.com` |
| `WHATSAPP_NUMERO_COMERCIAL` | Telefone do WhatsApp 1 (formato `5511XXXXXXXXX`) | Já preenchido: `5511982114443` |
| `WHATSAPP_NUMERO_SECUNDARIO` | WhatsApp 2 do rodapé | Já preenchido: `5511914943924` |
| `WHATSAPP_API_URL` / `WHATSAPP_API_TOKEN` | Vazios na Fase 1. Preencher quando contratar Z-API/Twilio | — |
| `CRM_WEBHOOK_URL` / `CRM_WEBHOOK_TOKEN` | Vazios na Fase 1. Preencher quando integrar CRM | — |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS` | 5 envios / 600s (10min) por padrão | Ajustar se necessário |

---

## 4. Como deploy na Hostinger

Veja **`DEPLOY.md`** — passo a passo completo.

Resumo:
1. Comprar domínio + plano Premium ou Business
2. Criar banco MySQL no hPanel
3. Criar caixa de e-mail SMTP (`noreply@dominio.com.br`)
4. Editar `api/config.php` com credenciais reais
5. Subir tudo via FTP / Gerenciador de Arquivos pra `public_html/`
6. Importar `sql/database.sql` via phpMyAdmin
7. Instalar SSL gratuito + descomentar redirect HTTPS no `.htaccess`
8. Testar form em produção

---

## 5. Como atualizar conteúdo

### Foto e bio do Felipe (sócio)
- Substituir o placeholder em `index.html` na seção `#time` (procurar `<!-- TODO: substituir por foto real do Felipe -->`)
- Adicionar imagem em `assets/images/socios/felipe.jpg` (quadrada, 600×600+, fundo neutro)
- Substituir o `<div class="team-card__photo">` por `<img src="assets/images/socios/felipe.jpg" alt="...">`
- Trocar `Bio em revisão.` pelo texto aprovado pelo Felipe (2-3 linhas, tom humano)

### Imóveis em destaque
- Editar os 3 cards em `index.html` na seção `#imoveis` (procurar `<!-- TODO: substituir por dados reais do imóvel -->`)
- Para cada card: trocar `[Imóvel exemplo]`, `[Cidade]`, valores `R$ 0,00`, e a foto placeholder
- Atualizar a mensagem WhatsApp pré-preenchida no link `wa.me/?text=` — o nome do imóvel e cidade precisam refletir o real (URL-encoded)
- Para adicionar mais imóveis, duplicar o `<article class="property-card">` e ajustar conteúdo

### Logos das construtoras
- Salvar logos em `assets/images/construtoras/` (PNG transparente ou SVG, mín. 300px largura)
- Em `index.html` seção `#parceiros`, substituir cada `<div class="partner-logo">Construtora X</div>` por:
  ```html
  <div class="partner-logo">
    <img src="assets/images/construtoras/nome.svg" alt="Construtora Nome" loading="lazy">
  </div>
  ```
- **Importante:** ter autorização escrita de cada construtora antes de publicar logos.

### Selo MCMV
- Substituir `<div class="mcmv-seal">Programa MCMV</div>` por `<img>` quando tiver o selo oficial autorizado pela Caixa

### Hero
- Hoje usa gradient sintético da paleta. Quando houver foto:
  - Adicionar `assets/images/hero/hero.webp` (1920×1080+, < 200KB)
  - Trocar `background-image` da `.hero` em `assets/css/style.css` por `linear-gradient(rgba(11,5,51,0.55), rgba(11,5,51,0.65)), url('../images/hero/hero.webp')`

### FAQ
- Cada pergunta está duplicada em 2 lugares: no HTML (botão + resposta) e no JSON-LD `FAQPage` no `<head>`
- Quando alterar uma pergunta, atualizar nos DOIS lugares pra manter SEO consistente

---

## 6. Como ativar a integração com CRM (Fase 2)

1. Escolher CRM (RD Station, HubSpot, Pipedrive)
2. No painel do CRM, criar webhook de entrada e copiar URL + token
3. Em `api/config.php` preencher `CRM_WEBHOOK_URL` e `CRM_WEBHOOK_TOKEN`
4. Pronto — o `enviar-lead.php` já dispara automaticamente

---

## 7. Como migrar pra API de WhatsApp (Fase 2)

1. Contratar Z-API (~R$ 99/mês) ou Twilio
2. Em `api/config.php` preencher `WHATSAPP_API_URL` e `WHATSAPP_API_TOKEN`
3. Em `includes/whatsapp-sender.php`, descomentar o bloco de Fase 2 dentro de `enviarWhatsApp()` e ajustar o payload pra forma da API escolhida
4. Testar manualmente com um lead de teste

---

## 8. Lista de TODOs / placeholders pendentes

Procurar por `TODO:` no código pra encontrar todos. Resumo:

- [ ] Imagem real do hero (1920×1080+, WebP < 200KB) → `assets/images/hero/`
- [ ] Foto + bio do Felipe (sócio) → seção `#time`
- [ ] 3-6 cards de imóveis com fotos, valores e nomes reais → seção `#imoveis`
- [ ] Logos das construtoras parceiras (com autorização escrita) → seção `#parceiros`
- [ ] Selo oficial MCMV (verificar uso autorizado com Caixa) → seção `#parceiros`
- [ ] OG image dedicada 1200×630 → `assets/images/og.jpg`
- [ ] Domínio definitivo (ajustar `ALLOWED_ORIGINS` em `config.php`, `canonical` no HTML, `sitemap.xml` e `robots.txt`)
- [ ] Política de Privacidade (LGPD) — link no rodapé quando existir
- [ ] Redes sociais — adicionar ícones e links no rodapé quando criadas

---

## 9. Critérios de aceitação

- [x] 9 seções implementadas
- [x] Form com 4 campos + máscara WhatsApp + validação client-side
- [x] Honeypot + CSRF + rate limiting (5 envios/IP/10min)
- [x] PHP grava no banco e dispara e-mail SMTP
- [x] Página `obrigado.html` com WhatsApp pra agilizar contato
- [x] Mobile-first / responsivo
- [x] Schema.org RealEstateAgent + FAQPage
- [x] Open Graph + Twitter Card
- [x] WCAG AA (foco visível, labels associados, contraste)
- [x] Headers de segurança em `.htaccess`
- [x] Sem variáveis sensíveis hardcoded
- [ ] Lighthouse > 90 em todas categorias (testar em produção com imagens reais)
- [ ] Form testado end-to-end em produção (após deploy)

---

## 10. Suporte

Documento mantido por **EQUIPE CAOS / Pinnacle**.
Cliente final: **ABC Invest**.
