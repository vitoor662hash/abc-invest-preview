/**
 * ABC Invest — Interações da landing
 *
 *  Tier 1
 *  - Smooth scroll pra âncoras (com offset)
 *  - FAQ accordion (1 aberto por vez)
 *  - Reveal on scroll com variantes (.reveal, .reveal-up, .reveal-left, .reveal-scale) + stagger
 *  - Parallax leve no hero
 *  - Scroll progress bar no topo
 *  - Hover tilt nos cards (apenas desktop com pointer fino)
 *
 *  Tier 2
 *  - Counter animado nos stats
 *  - Sticky mobile CTA (aparece depois do hero)
 *
 *  Reduced motion: desliga parallax, counter, tilt e progress bar.
 *  Reveal e marquee se autodesligam via CSS @media.
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
   * Smooth scroll
   * ------------------------------------------------------- */
  const headerOffset = 16;

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });

      window.setTimeout(function () {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, 600);
    });
  });

  /* ---------------------------------------------------------
   * FAQ accordion
   * ------------------------------------------------------- */
  const faqTriggers = document.querySelectorAll('.faq-item__trigger');

  faqTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      faqTriggers.forEach(function (other) {
        other.setAttribute('aria-expanded', 'false');
        const id = other.getAttribute('aria-controls');
        const panel = document.getElementById(id);
        if (panel) panel.style.maxHeight = null;
      });

      if (!isOpen) {
        trigger.setAttribute('aria-expanded', 'true');
        const id = trigger.getAttribute('aria-controls');
        const panel = document.getElementById(id);
        if (panel) {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      }
    });
  });

  /* ---------------------------------------------------------
   * Reveal on scroll com stagger
   * .reveal | .reveal-up | .reveal-left | .reveal-scale
   * ------------------------------------------------------- */
  const REVEAL_SELECTOR = '.reveal, .reveal-up, .reveal-left, .reveal-scale, .reveal-curtain, .reveal-bounce, .reveal-blueprint, .reveal-stagger';
  const reveals = document.querySelectorAll(REVEAL_SELECTOR);

  // Stagger: itens irmãos no mesmo pai recebem transition-delay incremental (max 5)
  const STAGGER_STEP_MS = 100;
  const STAGGER_MAX = 5;
  const grouped = new Map();

  reveals.forEach(function (el) {
    const parent = el.parentElement;
    if (!parent) return;
    if (!grouped.has(parent)) grouped.set(parent, []);
    grouped.get(parent).push(el);
  });

  grouped.forEach(function (children) {
    if (children.length < 2) return;
    children.forEach(function (child, idx) {
      const step = Math.min(idx, STAGGER_MAX) * STAGGER_STEP_MS;
      child.style.transitionDelay = step + 'ms';
    });
  });

  if ('IntersectionObserver' in window && reveals.length > 0) {
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------
   * Counter animado nos stats (entra por viewport)
   * ------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-counter]');

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-counter'), 10);
    const prefix = el.getAttribute('data-counter-prefix') || '';
    const suffix = el.getAttribute('data-counter-suffix') || '';

    if (Number.isNaN(target) || target <= 0) {
      el.textContent = prefix + '0' + suffix;
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const eased = 1 - (1 - t) * (1 - t);
      const value = Math.round(target * eased);
      el.textContent = prefix + value + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (!prefersReducedMotion && 'IntersectionObserver' in window && counters.length > 0) {
    const counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (c) { counterObserver.observe(c); });
  } else {
    // Sem motion ou sem suporte: aplica valor final imediatamente
    counters.forEach(function (el) {
      const target = el.getAttribute('data-counter') || '0';
      const prefix = el.getAttribute('data-counter-prefix') || '';
      const suffix = el.getAttribute('data-counter-suffix') || '';
      el.textContent = prefix + target + suffix;
    });
  }

  /* ---------------------------------------------------------
   * Scroll progress bar
   * ------------------------------------------------------- */
  const progressEl = document.getElementById('scroll-progress');

  if (progressEl && !prefersReducedMotion) {
    let ticking = false;

    function updateProgress() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      progressEl.style.width = Math.min(100, Math.max(0, progress)) + '%';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });

    updateProgress();
  }

  /* ---------------------------------------------------------
   * Parallax sutil no hero (CSS variable consumida pelo ::before)
   * ------------------------------------------------------- */
  const heroEl = document.getElementById('hero');

  if (heroEl && !prefersReducedMotion) {
    let parallaxTicking = false;

    function updateParallax() {
      const heroBottom = heroEl.offsetTop + heroEl.offsetHeight;
      // Só anima enquanto o hero está visível
      if (window.scrollY < heroBottom) {
        const offset = window.scrollY * 0.3;
        heroEl.style.setProperty('--hero-parallax', offset + 'px');
      }
      parallaxTicking = false;
    }

    window.addEventListener('scroll', function () {
      if (!parallaxTicking) {
        window.requestAnimationFrame(updateParallax);
        parallaxTicking = true;
      }
    }, { passive: true });
  }

  /* ---------------------------------------------------------
   * Sticky mobile CTA (após hero)
   * ------------------------------------------------------- */
  const mobileCta = document.getElementById('mobile-cta');

  if (mobileCta) {
    let ctaTicking = false;
    const trigger = window.innerHeight * 0.8;

    function updateMobileCta() {
      if (window.scrollY > trigger) {
        mobileCta.classList.add('is-visible');
      } else {
        mobileCta.classList.remove('is-visible');
      }
      ctaTicking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ctaTicking) {
        window.requestAnimationFrame(updateMobileCta);
        ctaTicking = true;
      }
    }, { passive: true });

    updateMobileCta();
  }

  /* ---------------------------------------------------------
   * Hover tilt nos cards (.tilt) — desktop apenas
   * ------------------------------------------------------- */
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (supportsHover && !prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('.tilt');
    const TILT_MAX = 6;

    tiltCards.forEach(function (card) {
      let rect = null;

      function refreshRect() { rect = card.getBoundingClientRect(); }

      card.addEventListener('mouseenter', function () {
        refreshRect();
        card.style.transition = 'transform 200ms ease';
      });

      card.addEventListener('mousemove', function (e) {
        if (!rect) refreshRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        const rotY = dx * TILT_MAX;
        const rotX = -dy * TILT_MAX;
        card.style.transform = 'perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
      });

      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
      });

      window.addEventListener('resize', function () { rect = null; }, { passive: true });
    });
  }
})();


/**
 * Header inteligente — esconde no scroll pra baixo, reaparece ao subir
 * Adiciona blur/background quando passa de 100px
 */
(function () {
  'use strict';
  const header = document.querySelector('.site-header');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const goingDown = y > lastY;
    if (y > 100) {
      header.classList.toggle('site-header--hidden', goingDown);
      header.classList.add('site-header--scrolled');
    } else {
      header.classList.remove('site-header--hidden', 'site-header--scrolled');
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();




/* ============== v3.3 — Interatividade extra ============== */

/**
 * Hero text reveal — palavra a palavra
 * Roda síncrono no início pra evitar flash do texto inteiro
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const h1 = document.querySelector('.hero h1');
  if (!h1) return;
  const text = h1.textContent.trim();
  if (!text) return;
  const words = text.split(/\s+/);
  h1.innerHTML = words.map(function (w, i) {
    return '<span class="hero-word" style="--delay:' + (i * 70) + 'ms">' + w + '</span>';
  }).join(' ');
})();

/**
 * Filtros de imóveis (MCMV / Financiamento / Todos)
 */
(function () {
  const filters = document.querySelectorAll('.imoveis-filter');
  const cards = document.querySelectorAll('.imovel-card3d');
  if (!filters.length || !cards.length) return;
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (f) { f.classList.remove('is-active'); });
      btn.classList.add('is-active');
      const cat = btn.dataset.filter;
      cards.forEach(function (card) {
        const match = cat === 'all' || card.dataset.categoria === cat;
        card.classList.toggle('is-hidden', !match);
      });
    });
  });
})();

/**
 * Magnetic CTAs — botões primários "puxam" o cursor (só desktop)
 */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const magnetics = document.querySelectorAll('.btn-primary');
  magnetics.forEach(function (el) {
    let rect = null;
    el.addEventListener('mouseenter', function () { rect = el.getBoundingClientRect(); });
    el.addEventListener('mousemove', function (e) {
      if (!rect) return;
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const strength = 0.25;
      el.style.transform = 'translate(' + (x * strength).toFixed(2) + 'px, ' + (y * strength).toFixed(2) + 'px)';
    });
    el.addEventListener('mouseleave', function () {
      el.style.transform = '';
      rect = null;
    });
  });
})();

/**
 * Ripple effect em todos os .btn (desligado em reduced-motion)
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'btn-ripple';
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      window.setTimeout(function () { ripple.remove(); }, 600);
    });
  });
})();

/**
 * Voltar ao topo
 */
(function () {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  btn.addEventListener('click', function () {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });
  let ticking = false;
  function update() {
    btn.hidden = window.scrollY < window.innerHeight * 0.8;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();

/**
 * FAQ search — filtra perguntas em tempo real
 */
(function () {
  const input = document.getElementById('faq-search-input');
  const items = document.querySelectorAll('.faq-item');
  const empty = document.querySelector('.faq-empty');
  if (!input || !items.length) return;
  input.addEventListener('input', function () {
    const q = input.value.toLowerCase().trim();
    let visibleCount = 0;
    items.forEach(function (item) {
      const text = item.textContent.toLowerCase();
      const match = !q || text.indexOf(q) !== -1;
      item.classList.toggle('is-hidden', !match);
      if (match) visibleCount++;
    });
    if (empty) empty.hidden = visibleCount > 0;
  });
})();

/**
 * Floor indicator — destaca o "andar" atual via IntersectionObserver
 * + dispara floor-flash quando muda de seção
 */
(function () {
  const floors = document.querySelectorAll('.floor-indicator__floor');
  const sections = Array.prototype.map.call(floors, function (f) {
    return document.getElementById(f.dataset.section);
  }).filter(Boolean);
  if (!floors.length) return;

  const flash = document.querySelector('[data-floor-flash]');
  const flashNum = flash ? flash.querySelector('.floor-flash__num') : null;
  const flashLabel = flash ? flash.querySelector('.floor-flash__label') : null;
  let flashTimer = null;
  let lastActiveSection = null;

  if (floors.length && sections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      // Pega a entry "mais visível" entre todas que cruzam a linha central
      // (em vez de aplicar a primeira que vier, que poderia ser uma seção fora do foco)
      let topEntry = null;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (!topEntry || entry.intersectionRatio > topEntry.intersectionRatio) {
            topEntry = entry;
          }
        }
      });
      if (!topEntry) return;

      floors.forEach(function (f) { f.classList.remove('is-active'); });
      const active = document.querySelector('.floor-indicator__floor[data-section="' + topEntry.target.id + '"]');
      if (active) {
        active.classList.add('is-active');

        // Dispara flash quando muda de seção (debounce via lastActiveSection)
        if (flash && topEntry.target.id !== lastActiveSection) {
          lastActiveSection = topEntry.target.id;
          if (flashNum) flashNum.textContent = active.querySelector('.floor-indicator__num').textContent;
          if (flashLabel) flashLabel.textContent = active.querySelector('.floor-indicator__label').textContent;
          flash.classList.add('is-active');
          if (flashTimer) window.clearTimeout(flashTimer);
          flashTimer = window.setTimeout(function () {
            flash.classList.remove('is-active');
          }, 1200);
        }
      }
    }, {
      // Linha de detecção no centro do viewport (10% de altura).
      // Quando o centro de uma seção cruza essa linha, ela vira ativa.
      // Funciona em qualquer tamanho de tela (desktop, tablet, mobile).
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0,
    });
    sections.forEach(function (s) { observer.observe(s); });
  }
})();


/**
 * Decifre o ABC — hero interactive
 * Reveal manual via clique, autoplay após 8s, persistência via sessionStorage.
 */
(function () {
  'use strict';

  const decoder = document.querySelector('[data-decoder]');
  if (!decoder) return;

  const letters = decoder.querySelectorAll('.decoder-letter');
  const panels = {
    A: decoder.querySelector('[data-panel="A"]'),
    B: decoder.querySelector('[data-panel="B"]'),
    C: decoder.querySelector('[data-panel="C"]'),
  };
  const hint = decoder.querySelector('[data-decoder-hint]');
  const complete = decoder.querySelector('[data-decoder-complete]');
  const hero = document.querySelector('.hero');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealed = new Set();
  let autoplayTimer = null;

  function revealLetter(letter) {
    if (revealed.has(letter)) return;
    revealed.add(letter);

    const btn = decoder.querySelector('.decoder-letter[data-letter="' + letter + '"]');
    if (btn) {
      btn.classList.add('is-revealed');
      btn.setAttribute('aria-expanded', 'true');
    }

    const panel = panels[letter];
    if (panel) panel.hidden = false;

    if (hint) hint.classList.add('is-hidden');

    if (revealed.size === 3) {
      window.setTimeout(function () {
        if (complete) complete.hidden = false;
        if (hero) hero.classList.add('is-decoder-complete');
        try { sessionStorage.setItem('abc-decoded', '1'); } catch (e) { /* */ }
      }, 350);
    }
  }

  letters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (autoplayTimer) { window.clearTimeout(autoplayTimer); autoplayTimer = null; }
      revealLetter(btn.dataset.letter);
    });
  });

  function startAutoplay() {
    if (prefersReducedMotion) return;
    autoplayTimer = window.setTimeout(function () {
      ['A', 'B', 'C'].forEach(function (letter, idx) {
        window.setTimeout(function () { revealLetter(letter); }, idx * 1200);
      });
    }, 8000);
  }

  let alreadyDecoded = false;
  try { alreadyDecoded = sessionStorage.getItem('abc-decoded') === '1'; } catch (e) { /* */ }
  if (alreadyDecoded) {
    revealLetter('A'); revealLetter('B'); revealLetter('C');
  } else {
    startAutoplay();
  }
})();


/**
 * Imóveis — flip 3D no tap (mobile) / hover (desktop)
 */
(function () {
  const cards = document.querySelectorAll('.imovel-card3d');
  if (!cards.length) return;
  const isTouch = window.matchMedia('(hover: none)').matches;

  cards.forEach(function (card) {
    if (isTouch) {
      card.addEventListener('click', function (e) {
        // Não vira se clicou em link ou botão (CTAs do verso)
        if (e.target.closest('a, button')) return;
        card.classList.toggle('is-flipped');
      });
    }

    // Botão "← Voltar" no verso (funciona em ambos)
    const backBtn = card.querySelector('[data-imovel-back]');
    if (backBtn) {
      backBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('is-flipped');
        // Em desktop, hover ainda continua ativo — bloqueia o re-flip por 800ms
        card.classList.add('is-flipping-out');
        window.setTimeout(function () { card.classList.remove('is-flipping-out'); }, 800);
      });
    }
  });
})();

/**
 * Pause de marquees fora do viewport — economia de GPU
 */
(function () {
  const marquees = document.querySelectorAll('.parceiros-marquee');
  if (!marquees.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('is-paused', !entry.isIntersecting);
    });
  }, {
    rootMargin: '200px 0px',
  });

  marquees.forEach(function (m) {
    m.classList.add('is-paused');
    observer.observe(m);
  });
})();

/**
 * Hero build scene — progressive reveal driven by hero scroll progress
 */
(function () {
  const scene = document.querySelector('[data-build-scene]');
  if (!scene) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.querySelectorAll('.build-stage').forEach(function (s) { s.classList.add('is-visible'); });
    return;
  }

  const hero = document.querySelector('#hero, .hero');
  if (!hero) return;
  const stages = scene.querySelectorAll('.build-stage');
  let ticking = false;

  function update() {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const heroHeight = rect.height;
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / heroHeight));
    stages.forEach(function (stage, idx) {
      const threshold = idx * 0.22;
      stage.classList.toggle('is-visible', progress >= threshold);
    });
  }

  update();
  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
})();
