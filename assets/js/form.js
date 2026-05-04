/**
 * ABC Invest — Quiz gameficado
 * - 9 perguntas com transição lateral
 * - Auto-avanço ao escolher opção (radio)
 * - Validação por step + shake em erro
 * - Máscara WhatsApp + validação live (verde)
 * - CSRF + submit pra api/enviar-lead.php
 * - Tela de celebração com confetti vanilla canvas
 */
(function () {
  'use strict';

  const form = document.getElementById('lead-form');
  const result = document.getElementById('quiz-result');
  if (!form) return;

  const steps = form.querySelectorAll('.quiz-step');
  const fill = form.querySelector('.quiz__fill');
  const counter = form.querySelector('[data-q-current]');
  const total = steps.length;
  const backBtn = form.querySelector('[data-q-back]');
  const nextBtn = form.querySelector('[data-q-next]');
  const submitBtn = form.querySelector('.quiz__submit');
  const submitLabel = submitBtn ? submitBtn.querySelector('.form-submit__label') : null;
  const csrfInput = form.querySelector('#csrf-token');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 1;

  /* ---------- Render ---------- */
  function render() {
    steps.forEach(function (s) {
      const n = parseInt(s.dataset.step, 10);
      s.classList.toggle('is-active', n === current);
    });
    if (fill) fill.style.width = ((current / total) * 100) + '%';
    if (counter) counter.textContent = current;
    if (backBtn) backBtn.disabled = current === 1;
    if (current === total) {
      if (nextBtn) nextBtn.hidden = true;
      if (submitBtn) submitBtn.hidden = false;
    } else {
      if (nextBtn) nextBtn.hidden = false;
      if (submitBtn) submitBtn.hidden = true;
    }
    const activeStep = form.querySelector('.quiz-step.is-active');
    if (activeStep) {
      const textInput = activeStep.querySelector('input:not([type=radio]):not([type=hidden])');
      if (textInput) {
        window.setTimeout(function () { textInput.focus({ preventScroll: true }); }, 360);
      }
    }
  }

  /* ---------- Validação ---------- */
  function isPhoneValid(v) {
    const digits = v.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  }

  function validateStep(stepEl) {
    const radios = stepEl.querySelectorAll('input[type=radio][required]');
    const inputs = stepEl.querySelectorAll('input:not([type=radio]):not([type=hidden])[required]');
    let ok = true;

    if (radios.length) {
      const name = radios[0].name;
      const selected = stepEl.querySelector('input[name="' + name + '"]:checked');
      if (!selected) ok = false;
    }

    inputs.forEach(function (input) {
      let valid = input.checkValidity();
      if (valid && input.type === 'tel') valid = isPhoneValid(input.value);
      input.classList.toggle('is-invalid', !valid);
      input.classList.toggle('is-valid', valid && !!input.value);
      const errorEl = stepEl.querySelector('[data-error-for="' + input.name + '"]');
      if (errorEl) errorEl.classList.toggle('is-visible', !valid);
      if (!valid) ok = false;
    });

    if (!ok) {
      stepEl.classList.add('is-error');
      window.setTimeout(function () { stepEl.classList.remove('is-error'); }, 400);
    }
    return ok;
  }

  /* ---------- Auto-avanço ao selecionar radio ---------- */
  form.addEventListener('change', function (e) {
    if (e.target.type !== 'radio') return;
    if (current >= total) return;
    window.setTimeout(function () {
      const stepEl = form.querySelector('.quiz-step.is-active');
      if (validateStep(stepEl)) { current++; render(); }
    }, 320);
  });

  /* ---------- Validação live nos campos texto ---------- */
  form.querySelectorAll('input:not([type=radio]):not([type=hidden])').forEach(function (input) {
    input.addEventListener('input', function () {
      let valid = input.checkValidity();
      if (valid && input.type === 'tel') valid = isPhoneValid(input.value);
      if (input.value && valid) {
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');
        const errorEl = form.querySelector('[data-error-for="' + input.name + '"]');
        if (errorEl) errorEl.classList.remove('is-visible');
      } else if (!input.value) {
        input.classList.remove('is-valid', 'is-invalid');
      }
    });
    input.addEventListener('blur', function () {
      let valid = input.checkValidity();
      if (valid && input.type === 'tel') valid = isPhoneValid(input.value);
      if (input.value && !valid) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
      }
    });
  });

  /* ---------- Máscara WhatsApp ---------- */
  const whatsapp = form.querySelector('#whatsapp');
  if (whatsapp) {
    whatsapp.addEventListener('input', function (e) {
      const d = e.target.value.replace(/\D/g, '').slice(0, 11);
      let f = d;
      if (d.length > 10)      f = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      else if (d.length > 6)  f = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      else if (d.length > 2)  f = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      else if (d.length > 0)  f = '(' + d;
      e.target.value = f;
    });
  }

  /* ---------- Navegação ---------- */
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      const stepEl = form.querySelector('.quiz-step.is-active');
      if (validateStep(stepEl)) { current++; render(); }
    });
  }
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (current > 1) { current--; render(); }
    });
  }

  // Enter avança / submete
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const tag = e.target.tagName;
    if (tag === 'BUTTON' || tag === 'TEXTAREA') return;
    e.preventDefault();
    if (current < total) {
      if (nextBtn) nextBtn.click();
    } else if (submitBtn) {
      submitBtn.click();
    }
  });

  /* ---------- CSRF ---------- */
  fetch('api/csrf-token.php', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data && data.token && csrfInput) csrfInput.value = data.token;
    })
    .catch(function () { /* silencioso */ });

  /* ---------- Confetti vanilla canvas ---------- */
  function shootConfetti(canvas) {
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = ['#1B87E7', '#4FA8F1', '#FFFFFF', '#4CAF50', '#FFD700'];
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: w / 2,
        y: h / 3,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      particles.forEach(function (p) {
        p.vy += 0.4;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 0.008;
        if (p.life > 0 && p.y < h + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });
      if (alive) requestAnimationFrame(frame);
    }
    frame();
  }

  /* ---------- Tela de resultado ---------- */
  // Mapas de valores → labels humanas (devem bater com os values dos radios)
  const LABELS = {
    objetivo: {
      'aluguel': 'Sair do aluguel',
      'primeira': 'Primeira casa pelo MCMV',
      'investir': 'Investir em imóvel'
    },
    renda: {
      'ate-2k': 'Até R$ 2.000',
      '2k-4k': 'R$ 2.000 a R$ 4.000',
      '4k-8k': 'R$ 4.000 a R$ 8.000',
      'acima-8k': 'Acima de R$ 8.000'
    },
    spc: {
      'limpo': 'Limpo, sem restrições',
      'restricao': 'Tem alguma restrição',
      'nao-sei': 'Não tem certeza'
    },
    entrada: {
      'economia': 'Tem economia separada',
      'fgts': 'Pode usar FGTS',
      'economia-e-fgts': 'Tem economia + FGTS',
      'ainda-nao': 'Vai organizar a entrada'
    },
    parcela: {
      'ate-800': 'Até R$ 800',
      '800-1200': 'R$ 800 a R$ 1.200',
      '1200-2000': 'R$ 1.200 a R$ 2.000',
      'acima-2000': 'Acima de R$ 2.000'
    },
    proprietario: {
      'primeira': 'Não, será o primeiro',
      'quitado': 'Sim, mas já quitou',
      'financiando': 'Sim, ainda financiando'
    },
    urgencia: {
      '3meses': 'O quanto antes (até 3 meses)',
      '6meses': 'Próximos 6 meses',
      '1ano': 'Próximo ano',
      'planejando': 'Tá planejando'
    }
  };

  function getRadio(name) {
    const el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function label(field, val) {
    return (LABELS[field] && LABELS[field][val]) || val || '—';
  }

  function showResult() {
    const nomeFull = (form.querySelector('#nome').value || '').trim();
    const nome = nomeFull.split(' ')[0] || 'amigo(a)';
    const cidade = (form.querySelector('#cidade').value || '').trim();
    const whatsappLead = (form.querySelector('#whatsapp').value || '').trim();

    const data = {
      objetivo: label('objetivo', getRadio('objetivo')),
      renda: label('renda', getRadio('renda')),
      spc: label('spc', getRadio('spc')),
      entrada: label('entrada', getRadio('entrada')),
      parcela: label('parcela', getRadio('parcela')),
      proprietario: label('proprietario', getRadio('proprietario')),
      urgencia: label('urgencia', getRadio('urgencia'))
    };

    // Mensagem completa pro WhatsApp — usa *negrito* (renderizado nativo em mobile/web/desktop)
    const msg = [
      'Olá! Vim pelo site da ABC Invest e preenchi o quiz.',
      '',
      '*Meu perfil:*',
      '',
      '*Nome:* ' + nomeFull,
      '*WhatsApp:* ' + whatsappLead,
      '*Cidade:* ' + cidade,
      '',
      '*Objetivo:* ' + data.objetivo,
      '*Renda:* ' + data.renda,
      '*SPC/Serasa:* ' + data.spc,
      '*Entrada:* ' + data.entrada,
      '*Parcela:* ' + data.parcela,
      '*Já tem imóvel:* ' + data.proprietario,
      '*Urgência:* ' + data.urgencia,
      '',
      'Quero saber as opções pra mim!'
    ].join('\n');

    // Renderizar tela de resultado
    const nameSlot = result.querySelector('[data-result-name]');
    if (nameSlot) nameSlot.textContent = nome;

    const waLink = result.querySelector('[data-result-whatsapp]');
    if (waLink) {
      waLink.href = 'https://wa.me/5511982114443?text=' + encodeURIComponent(msg);
    }

    form.style.display = 'none';
    result.hidden = false;

    try { result.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' }); } catch (e) { /* */ }

    if (window.dataLayer) window.dataLayer.push({ event: 'lead_submitted', whatsapp: whatsappLead });

    shootConfetti(result.querySelector('.quiz-result__confetti'));
  }

  /* ---------- Submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const last = form.querySelector('.quiz-step[data-step="' + total + '"]');
    if (!validateStep(last)) return;

    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Processando...';

    fetch('api/enviar-lead.php', {
      method: 'POST',
      body: new FormData(form),
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.data || !res.data.success) {
          throw new Error((res.data && res.data.message) || 'Erro');
        }
        showResult();
      })
      .catch(function (err) {
        // Em ambiente local (Python http.server, sem PHP), simula sucesso
        // pra permitir testar a tela de celebração. Em produção, mostra erro real.
        const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.hostname) !== -1
                        || window.location.protocol === 'file:';
        if (isLocal) {
          if (window.console && window.console.warn) {
            window.console.warn('[dev] PHP backend indisponível em localhost — mostrando resultado mesmo assim. Em produção isso seria um erro real.');
          }
          showResult();
        } else {
          submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = '🎉 Ver meu resultado';
          const toast = form.querySelector('#form-toast');
          if (toast) {
            toast.textContent = 'Ops, deu um erro ao enviar. Tenta de novo ou fala direto no WhatsApp.';
            toast.style.display = 'block';
          } else {
            window.alert('Ops, deu erro ao enviar. Tenta de novo ou fala direto no WhatsApp.');
          }
        }
      });
  });

  render();

  /* ---------- Debug: ?debug=result preenche valores fictícios e mostra resultado ---------- */
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'result' && result) {
      window.setTimeout(function () {
        // Preenche valores fictícios no form pra showResult() montar a mensagem completa
        const nomeEl     = form.querySelector('#nome');
        const whatsappEl = form.querySelector('#whatsapp');
        const cidadeEl   = form.querySelector('#cidade');
        if (nomeEl)     nomeEl.value     = 'Maria Silva';
        if (whatsappEl) whatsappEl.value = '(11) 98765-4321';
        if (cidadeEl)   cidadeEl.value   = 'São Bernardo do Campo';

        function setRadio(name, value) {
          const r = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
          if (r) r.checked = true;
        }
        setRadio('objetivo',     'aluguel');
        setRadio('renda',        '2k-4k');
        setRadio('spc',          'limpo');
        setRadio('entrada',      'fgts');
        setRadio('parcela',      '800-1200');
        setRadio('proprietario', 'primeira');
        setRadio('urgencia',     '6meses');

        showResult();
      }, 300);
    }
  } catch (e) { /* sem URLSearchParams: ignora */ }
})();


/**
 * Hero quick form — captura compacta com 3 campos (nome, WhatsApp, cidade).
 * Submete pro mesmo endpoint api/enviar-lead.php (origem=hero-quick).
 * Em sucesso, redireciona pra obrigado.html.
 */
(function () {
  'use strict';

  const form = document.getElementById('hero-quick-form');
  if (!form) return;

  const submitBtn = form.querySelector('#hero-quick-submit');
  const submitLabel = submitBtn ? submitBtn.querySelector('span') : null;
  const toast = form.querySelector('#hero-quick-toast');
  const csrfInput = form.querySelector('#hero-csrf-token');
  const inputs = form.querySelectorAll('.hero-quick-form__input');
  const whatsapp = form.querySelector('#hero-whatsapp');

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
  }
  function hideToast() {
    if (toast) toast.classList.remove('is-visible');
  }

  function isWhatsappValid(value) {
    const digits = (value || '').replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  }
  function isInputValid(input) {
    if (!input.checkValidity()) return false;
    if (input.type === 'tel') return isWhatsappValid(input.value);
    return true;
  }

  // Máscara WhatsApp (mesma lógica do quiz)
  if (whatsapp) {
    whatsapp.addEventListener('input', function (e) {
      const d = e.target.value.replace(/\D/g, '').slice(0, 11);
      let f = d;
      if (d.length > 10)      f = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      else if (d.length > 6)  f = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      else if (d.length > 2)  f = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      else if (d.length > 0)  f = '(' + d;
      e.target.value = f;
    });
  }

  // Validação live verde/vermelho
  inputs.forEach(function (input) {
    input.addEventListener('input', function () {
      const valid = isInputValid(input);
      input.classList.toggle('is-valid',   !!input.value && valid);
      input.classList.toggle('is-invalid', !!input.value && !valid);
    });
  });

  // CSRF
  fetch('api/csrf-token.php', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.token && csrfInput) csrfInput.value = d.token; })
    .catch(function () { /* dev sem PHP: segue sem token */ });

  // Submit
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideToast();

    let allValid = true;
    inputs.forEach(function (input) {
      const valid = isInputValid(input);
      input.classList.toggle('is-invalid', !valid);
      if (!valid) allValid = false;
    });
    if (!allValid) {
      showToast('Preenche os 3 campos pra continuar.');
      return;
    }

    submitBtn.disabled = true;
    if (submitLabel) submitLabel.textContent = 'Enviando...';

    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.hostname) !== -1
                    || window.location.protocol === 'file:';

    fetch('api/enviar-lead.php', {
      method: 'POST',
      body: new FormData(form),
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.data || !res.data.success) {
          throw new Error((res.data && res.data.message) || 'Erro');
        }
        window.location.href = 'obrigado.html';
      })
      .catch(function () {
        if (isLocal) {
          // Dev local sem PHP: simula sucesso e redireciona
          if (window.console && window.console.warn) {
            window.console.warn('[dev] PHP backend indisponível — simulando sucesso e redirecionando.');
          }
          window.location.href = 'obrigado.html';
        } else {
          submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = 'Falar com Felipe';
          showToast('Ops, deu erro. Tenta de novo ou fala direto no WhatsApp.');
        }
      });
  });
})();
