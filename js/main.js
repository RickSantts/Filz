/* ============================================
   SVG Icons (inline, zero-dependency)
   ============================================ */
const ICONS = {
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  feather: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  maximize2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`
};

/* ============================================
   State
   ============================================ */
let config = null;
const productState = {}; // { productId: { colorIndex, size } }

/* ============================================
   Boot
   ============================================ */
async function boot() {
  try {
    const res = await fetch('config.json');
    config = await res.json();
  } catch (e) {
    console.error('Failed to load config.json:', e);
    return;
  }

  applyMeta();
  renderNav();
  renderHero();
  renderAbout();
  renderProducts();
  renderSizing();
  renderPillars();
  renderManifesto();
  renderWaitlist();
  renderFooter();
  renderToast();

  // Init interactive behaviours
  initNavScroll();
  initWaitlistForm();
}

/* ============================================
   Meta / SEO
   ============================================ */
function applyMeta() {
  document.title = config.seo.title;
  setMeta('description', config.seo.description);
  setMeta('og:title', config.seo.title, true);
  setMeta('og:description', config.seo.description, true);
  setMeta('og:image', config.seo.ogImage, true);
  setMeta('og:type', 'website', true);
  setMeta('twitter:card', 'summary_large_image', true);
}

function setMeta(name, content, isProperty = false) {
  let el = isProperty
    ? document.querySelector(`meta[property="${name}"]`)
    : document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    isProperty ? el.setAttribute('property', name) : el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/* ============================================
   Nav
   ============================================ */
function renderNav() {
  const nav = document.getElementById('nav');
  const b   = config.brand;

  // Logo: image or text fallback
  const logoHtml = b.logoImage
    ? `<a href="#" class="nav__logo" aria-label="${escAttr(b.name)} — início">
         <img src="${escAttr(b.logoImage)}" alt="${escAttr(b.logoAlt || b.name)}" class="nav__logo-img">
       </a>`
    : `<a href="#" class="nav__logo" aria-label="${escAttr(b.name)} — início">
         <span class="nav__logo-text">${escHtml(b.name)}</span>
       </a>`;

  nav.innerHTML = `
    <div class="nav__left"></div>
    ${logoHtml}
    <nav class="nav__links" aria-label="Navegação principal">
      <a href="#produtos" class="nav__link">Coleção</a>
      <a href="#medidas" class="nav__link">Medidas</a>
      <a href="${b.instagram}" class="nav__link nav__link--cta" target="_blank" rel="noopener noreferrer" aria-label="Instagram da ${escAttr(b.name)}">Instagram</a>
    </nav>
  `;
}

function initNavScroll() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

/* ============================================
   Hero
   ============================================ */
function renderHero() {
  const el = document.getElementById('hero');
  el.innerHTML = `
    <div class="hero__image-wrap">
      <img src="${config.hero.image}" alt="FILZ — Básicos premium" loading="eager" fetchpriority="high">
      <div class="hero__overlay"></div>
    </div>
    <div class="hero__content">
      <p class="hero__label">${config.brand.name} — Coleção 01</p>
      <h1 class="hero__headline">${escHtml(config.hero.headline)}</h1>
      <p class="hero__sub">${escHtml(config.hero.subheadline)}</p>
      <div class="hero__actions">
        <a href="#produtos" class="btn btn--primary" id="hero-cta-colecao">
          ${config.hero.ctaCollection} ${ICONS.arrow}
        </a>
        <a href="${config.brand.instagram}" class="btn btn--outline" target="_blank" rel="noopener noreferrer" id="hero-cta-instagram">
          ${ICONS.instagram}&nbsp; ${config.hero.ctaInstagram}
        </a>
      </div>
    </div>
    <div class="scroll-hint" aria-hidden="true">
      <span class="scroll-hint__line"></span>
    </div>
  `;
}

/* ============================================
   About
   ============================================ */
function renderAbout() {
  const el = document.getElementById('about');
  el.innerHTML = `
    <div class="container">
      <div class="about__inner">
        <span class="t-label">Sobre</span>
        <div class="divider divider--left"></div>
        <h2 class="about__title">${escHtml(config.about.title)}</h2>
        <p class="about__text">${escHtml(config.about.text)}</p>
      </div>
    </div>
  `;
}

/* ============================================
   Products
   ============================================ */
function renderProducts() {
  const el = document.getElementById('produtos');

  // Init product state
  config.products.forEach(p => {
    productState[p.id] = { colorIndex: 0, size: null };
  });

  el.innerHTML = `
    <div class="container">
      <div class="products__header">
        <span class="t-label">Coleção</span>
        <div class="divider divider--left"></div>
        <h2 class="products__title">Básicos essenciais.</h2>
      </div>
      <div class="products__grid" id="products-grid">
        ${config.products.map(p => renderProductCard(p)).join('')}
      </div>
    </div>
  `;

  // Attach listeners after DOM is inserted
  config.products.forEach(p => attachProductListeners(p));
}

function renderProductCard(p) {
  const state = productState[p.id];
  const activeColor = p.colors[state.colorIndex];
  const isPlaceholder = p.placeholder || !activeColor.image;

  const imageHtml = isPlaceholder
    ? `<div class="product-card__img-wrap is-placeholder" id="img-wrap-${p.id}">
         <div class="product-placeholder">
           <svg class="product-placeholder__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
             <circle cx="8.5" cy="8.5" r="1.5"/>
             <polyline points="21 15 16 10 5 21"/>
           </svg>
           <span class="product-placeholder__text">Foto em breve</span>
         </div>
       </div>`
    : `<div class="product-card__img-wrap" id="img-wrap-${p.id}">
         <img
           src="${activeColor.image}"
           alt="${escHtml(p.name)} — ${escHtml(activeColor.name)}"
           class="product-card__img"
           id="img-${p.id}"
           loading="lazy"
         >
         <span class="product-card__badge">Novo</span>
       </div>`;

  return `
    <article class="product-card" id="card-${p.id}" aria-label="Produto: ${escHtml(p.name)}">
      ${imageHtml}

      <div class="product-card__body">
        <h3 class="product-card__name">${escHtml(p.name)}</h3>
        <p class="product-card__desc">${escHtml(p.description)}</p>
        <p class="product-card__details">${escHtml(p.details)}</p>

        <div class="selector-group" style="margin-top:20px;">
          <p class="selector-label">Cor — <span id="color-label-${p.id}">${escHtml(activeColor.name)}</span></p>
          <div class="color-swatches" role="radiogroup" aria-label="Cor" id="swatches-${p.id}">
            ${p.colors.map((c, i) => `
              <button
                class="color-swatch ${i === 0 ? 'active' : ''}"
                style="background:${c.hex}; ${c.hex === '#F5F3EF' ? 'box-shadow:inset 0 0 0 1px #D9D4CC;' : ''}"
                data-product="${p.id}"
                data-color-index="${i}"
                aria-label="${escHtml(c.name)}"
                title="${escHtml(c.name)}"
                role="radio"
                aria-checked="${i === 0 ? 'true' : 'false'}"
              ></button>
            `).join('')}
          </div>
        </div>

        <div class="selector-group">
          <p class="selector-label">Tamanho</p>
          <div class="size-options" role="radiogroup" aria-label="Tamanho" id="sizes-${p.id}">
            ${p.sizes.map(s => `
              <button
                class="size-btn"
                data-product="${p.id}"
                data-size="${s}"
                aria-label="Tamanho ${s}"
                role="radio"
                aria-checked="false"
              >${s}</button>
            `).join('')}
          </div>
        </div>

        <p class="product-card__price">${escHtml(p.price)}</p>

        <div class="product-card__cta">
          <button
            class="btn btn--dark"
            id="buy-${p.id}"
            data-product="${p.id}"
            aria-label="Comprar ${escHtml(p.name)} pelo WhatsApp"
          >
            <span style="display:flex;align-items:center;gap:8px;">
              <span style="width:16px;height:16px;flex-shrink:0;">${ICONS.whatsapp}</span>
              Comprar pelo WhatsApp
            </span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function attachProductListeners(p) {
  // Color swatches
  const swatchContainer = document.getElementById(`swatches-${p.id}`);
  if (swatchContainer) {
    swatchContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-swatch');
      if (!btn) return;
      const idx = parseInt(btn.dataset.colorIndex, 10);
      productState[p.id].colorIndex = idx;

      // Update image only if product has real photos
      const color = p.colors[idx];
      if (color.image) {
        const imgWrap = document.getElementById(`img-wrap-${p.id}`);
        const img = document.getElementById(`img-${p.id}`);
        if (img) {
          img.src = color.image;
          img.alt = `${p.name} — ${color.name}`;
        }
      }

      // Update label
      const label = document.getElementById(`color-label-${p.id}`);
      if (label) label.textContent = color.name;

      // Update active swatch
      swatchContainer.querySelectorAll('.color-swatch').forEach((s, i) => {
        s.classList.toggle('active', i === idx);
        s.setAttribute('aria-checked', i === idx ? 'true' : 'false');
      });
    });
  }

  // Size buttons
  const sizeContainer = document.getElementById(`sizes-${p.id}`);
  if (sizeContainer) {
    sizeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.size-btn');
      if (!btn) return;
      const size = btn.dataset.size;
      productState[p.id].size = size;

      sizeContainer.querySelectorAll('.size-btn').forEach(s => {
        const isActive = s.dataset.size === size;
        s.classList.toggle('active', isActive);
        s.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });
    });
  }

  // Buy button
  const buyBtn = document.getElementById(`buy-${p.id}`);
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const state = productState[p.id];
      const color = p.colors[state.colorIndex];
      const size  = state.size;

      let msg = p.whatsappMessage;
      if (color) msg += ` Cor: ${color.name}.`;
      if (size)  msg += ` Tamanho: ${size}.`;
      if (!size) {
        showToast('Selecione um tamanho antes de continuar.');
        return;
      }

      const url = `https://wa.me/${config.brand.whatsapp}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }
}

/* ============================================
   Sizing Guide
   ============================================ */
function renderSizing() {
  const el = document.getElementById('medidas');
  const g  = config.sizingGuide;
  el.innerHTML = `
    <div class="container">
      <span class="t-label" style="color:rgba(245,243,239,0.45);">Guia</span>
      <div class="divider divider--left"></div>
      <h2 class="sizing__title">${escHtml(g.title)}</h2>
      <p class="sizing__subtitle">${escHtml(g.subtitle)}</p>
      <div class="sizing__table-wrap">
        <table class="sizing__table" aria-label="Tabela de medidas">
          <thead>
            <tr>
              ${g.columns.map(c => `<th scope="col">${escHtml(c)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${g.rows.map(row => `
              <tr>
                ${row.map((cell, i) => i === 0
                  ? `<td><strong>${escHtml(cell)}</strong></td>`
                  : `<td>${escHtml(cell)}</td>`
                ).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${g.note ? `<p class="sizing__note sizing__note--warning">${escHtml(g.note)}</p>` : ''}
      <p class="sizing__note">Dúvidas? Fale pelo WhatsApp ou Instagram.</p>
    </div>
  `;
}

/* ============================================
   Pillars
   ============================================ */
function renderPillars() {
  const el = document.getElementById('pillars');
  el.innerHTML = `
    <div class="container">
      <span class="t-label">Qualidade</span>
      <div class="divider divider--left"></div>
      <h2 class="pillars__title">O que nos define.</h2>
      <div class="pillars__grid">
        ${config.pillars.map(p => `
          <div class="pillar">
            <div class="pillar__icon" aria-hidden="true">${ICONS[p.icon] || ''}</div>
            <h3 class="pillar__title">${escHtml(p.title)}</h3>
            <p class="pillar__text">${escHtml(p.text)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ============================================
   Manifesto
   ============================================ */
function renderManifesto() {
  const el = document.getElementById('manifesto');
  el.innerHTML = `
    <div class="container">
      <h2 class="manifesto__title">${escHtml(config.manifesto.title)}</h2>
      <p class="manifesto__text">${escHtml(config.manifesto.text)}</p>
    </div>
  `;
}

/* ============================================
   Waitlist
   ============================================ */
function renderWaitlist() {
  const el = document.getElementById('waitlist');
  const w  = config.waitlist;
  el.innerHTML = `
    <div class="container">
      <span class="t-label" style="color:rgba(245,243,239,0.45);">Lista de espera</span>
      <div class="divider divider--left"></div>
      <h2 class="waitlist__title">${escHtml(w.title)}</h2>
      <p class="waitlist__subtitle">${escHtml(w.subtitle)}</p>
      <form class="waitlist__form" id="waitlist-form" novalidate aria-label="Formulário de lista de espera">
        <label for="waitlist-email" class="sr-only">E-mail</label>
        <input
          type="email"
          id="waitlist-email"
          name="email"
          class="waitlist__input"
          placeholder="${escAttr(w.placeholder)}"
          required
          autocomplete="email"
        >
        <button type="submit" class="waitlist__btn" id="waitlist-submit">${escHtml(w.cta)}</button>
      </form>
      <p class="waitlist__success" id="waitlist-success" role="alert">
        Perfeito. Você será o primeiro a saber. ✦
      </p>
    </div>
  `;
}

function initWaitlistForm() {
  const form    = document.getElementById('waitlist-form');
  const success = document.getElementById('waitlist-success');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email || !email.includes('@')) {
      showToast('Por favor, insira um e-mail válido.');
      return;
    }

    const submitBtn = document.getElementById('waitlist-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (res.ok && data.ok) {
        form.style.display = 'none';
        success.style.display = 'block';
      } else {
        showToast(data.message || 'Erro ao cadastrar. Tente mais tarde.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = config.waitlist.cta;
        }
      }
    } catch (err) {
      showToast('Erro de conexão.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = config.waitlist.cta;
      }
    }
  });
}

/* ============================================
   Footer
   ============================================ */
function renderFooter() {
  const el = document.getElementById('footer');
  el.innerHTML = `
    <div class="container">
      <div class="footer__inner">
        <div>
          <p class="footer__logo">${config.brand.name}</p>
        </div>
        <div class="footer__links">
          <a href="${config.brand.instagram}" class="footer__link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            ${config.brand.instagramHandle}
          </a>
          <a href="mailto:${config.brand.email}" class="footer__link" aria-label="E-mail">
            ${config.brand.email}
          </a>
          <span class="footer__link">${config.brand.domain}</span>
        </div>
      </div>
      <p class="footer__tagline">${escHtml(config.brand.tagline)}</p>
    </div>
  `;
}

/* ============================================
   Toast
   ============================================ */
function renderToast() {
  if (!document.getElementById('toast')) {
    const t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
}

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ============================================
   Helpers
   ============================================ */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function escAttr(str = '') {
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================
   Start
   ============================================ */
document.addEventListener('DOMContentLoaded', boot);
