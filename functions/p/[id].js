import { loadConfig } from '../lib/config.js';
import { escHtml, escAttr, absolute, ICONS, pageHeader, pageFooter } from '../lib/esc.js';

function colorToHex(hex) {
  if (!hex || !hex.startsWith('#')) return '#888888';
  if (hex.length === 4) {
    return '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  }
  return hex;
}

function productJsonLd(config, product, url) {
  const hasImage = (product.colors || []).find(c => c.image);
  const price = (product.price || '').replace(/[^\d,]/g, '').replace(',', '.');
  const json = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': url + '#product',
        name: product.name,
        description: [product.description, product.details].filter(Boolean).join('. '),
        sku: product.id,
        brand: { '@type': 'Brand', name: (config.brand && config.brand.name) || 'FILZ' },
        offers: {
          '@type': 'Offer',
          price: price || undefined,
          priceCurrency: 'BRL',
          availability: 'https://schema.org/InStock',
          url
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: '/' },
          { '@type': 'ListItem', position: 2, name: 'Coleção', item: '/#produtos' },
          { '@type': 'ListItem', position: 3, name: product.name, item: url }
        ]
      }
    ]
  };
  if (hasImage) {
    json['@graph'][0].image = absolute(config, hasImage.image);
  }
  return JSON.stringify(json);
}

function productBody(config, product, url) {
  const b = config.brand || {};
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  const hasPhoto = colors.some(c => c.image);
  const firstPhoto = colors.find(c => c.image);
  const whatsapp = String(b.whatsapp || '').replace(/[^\d]/g, '');
  const priceClean = (product.price || '').replace(/[^\d,]/g, '').replace(',', '.');

  const imageHtml = hasPhoto
    ? `<img id="p-main-img" src="${escAttr(firstPhoto.image)}" alt="${escAttr(product.name)} — ${escAttr(firstPhoto.name)}" class="p-main-img" width="896" height="1200" fetchpriority="high" decoding="async">`
    : `<div class="p-main-placeholder">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
         <span>Foto em breve</span>
       </div>`;

  const swatches = colors.map((c, i) => `
    <button class="color-swatch ${i === 0 ? 'active' : ''}" style="background:${escAttr(colorToHex(c.hex))}; ${c.hex === '#F5F3EF' ? 'box-shadow:inset 0 0 0 1px #D9D4CC;' : ''}"
      data-idx="${i}" aria-label="${escAttr(c.name)}" title="${escAttr(c.name)}" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}"></button>
  `).join('');

  const sizeBtns = sizes.map(s => `
    <button class="size-btn" data-size="${escAttr(s)}" aria-label="Tamanho ${escAttr(s)}" role="radio" aria-checked="false">${escHtml(s)}</button>
  `).join('');

  return `
    <section class="p-page">
      <div class="container p-layout">
        <div class="p-gallery">
          <div class="p-gallery__main">
            ${imageHtml}
          </div>
        </div>

        <div class="p-info">
          <nav class="p-breadcrumb" aria-label="Trilha de navegação">
            <a href="/">Início</a><span aria-hidden="true">/</span>
            <a href="/#produtos">Coleção</a><span aria-hidden="true">/</span>
            <span>${escHtml(product.name)}</span>
          </nav>

          <h1 class="p-name">${escHtml(product.name)}</h1>
          <p class="p-desc">${escHtml(product.description)}</p>
          <p class="p-details">${escHtml(product.details)}</p>

          <p class="p-price" id="p-price">${escHtml(product.price)}</p>

          <div class="selector-group">
            <p class="selector-label">Cor — <span id="p-color-label">${escHtml((colors[0] && colors[0].name) || '')}</span></p>
            <div class="color-swatches" role="radiogroup" aria-label="Cor" id="p-swatches">${swatches}</div>
          </div>

          <div class="selector-group">
            <p class="selector-label">Tamanho</p>
            <div class="size-options" role="radiogroup" aria-label="Tamanho" id="p-sizes">${sizeBtns}</div>
          </div>

          <div class="p-cta">
            <button class="btn btn--dark btn--lg" id="p-buy" data-whatsapp="${escAttr(whatsapp)}" data-msg="${escAttr(product.whatsappMessage || '')}" aria-label="Comprar ${escAttr(product.name)} pelo WhatsApp">
              <span style="display:flex;align-items:center;gap:10px;">
                <span style="width:18px;height:18px;flex-shrink:0;">${ICONS.whatsapp}</span>
                Comprar pelo WhatsApp
              </span>
            </button>
            <a href="/" class="btn btn--outline btn--lg">Voltar para a coleção</a>
          </div>

          <p class="p-note">Pagamento e envio combinados direto pelo WhatsApp.</p>
        </div>
      </div>
    </section>

    <script>
    (function () {
      var colors = ${JSON.stringify(colors.map(c => ({ name: c.name, image: c.image, hex: c.hex })))};
      var sizes = ${JSON.stringify(sizes)};
      var buyBtn = document.getElementById('p-buy');
      var label = document.getElementById('p-color-label');
      var swatches = document.getElementById('p-swatches');
      var sizeGroup = document.getElementById('p-sizes');
      var mainImg = document.getElementById('p-main-img');
      var colorIdx = 0;
      var selectedSize = null;

      if (swatches) {
        swatches.addEventListener('click', function (e) {
          var btn = e.target.closest('.color-swatch');
          if (!btn) return;
          var idx = parseInt(btn.dataset.idx, 10);
          colorIdx = idx;
          swatches.querySelectorAll('.color-swatch').forEach(function (s, i) {
            s.classList.toggle('active', i === idx);
            s.setAttribute('aria-checked', i === idx ? 'true' : 'false');
          });
          if (label) label.textContent = colors[idx].name;
          if (mainImg && colors[idx].image) {
            mainImg.src = colors[idx].image;
            mainImg.alt = buyBtn.getAttribute('aria-label').replace(' pelo WhatsApp', '') + ' — ' + colors[idx].name;
          }
        });
      }

      if (sizeGroup) {
        sizeGroup.addEventListener('click', function (e) {
          var btn = e.target.closest('.size-btn');
          if (!btn) return;
          selectedSize = btn.dataset.size;
          sizeGroup.querySelectorAll('.size-btn').forEach(function (s) {
            s.classList.toggle('active', s === btn);
            s.setAttribute('aria-checked', s === btn ? 'true' : 'false');
          });
        });
      }

      if (buyBtn) {
        buyBtn.addEventListener('click', function () {
          var color = colors[colorIdx];
          var msg = buyBtn.dataset.msg || '';
          if (color) msg += ' Cor: ' + color.name + '.';
          if (selectedSize) { msg += ' Tamanho: ' + selectedSize + '.'; }
          else {
            var toast = document.getElementById('p-toast');
            if (toast) { toast.textContent = 'Selecione um tamanho antes de continuar.'; toast.classList.add('show'); setTimeout(function(){ toast.classList.remove('show'); }, 3000); }
            return;
          }
          var url = 'https://wa.me/' + buyBtn.dataset.whatsapp + '?text=' + encodeURIComponent(msg);
          window.open(url, '_blank', 'noopener,noreferrer');
        });
      }
    })();
    </script>
    <div class="p-toast" id="p-toast" role="status" aria-live="polite"></div>
  `;
}

export async function onRequestGet(context) {
  try {
    const { request, env, params } = context;
    const id = (params && params.id) || '';

    const config = await loadConfig(request, env);
    const products = config.products || [];
    const product = products.find(p => p.id === id) || products.find(p => String(p.id).toLowerCase() === String(id).toLowerCase());

    if (!product) {
      return new Response('Página não encontrada', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const seo = config.seo || {};
    const url = absolute(config, 'p/' + product.id);
    const title = `${product.name} — Camiseta em Algodão | ${(config.brand && config.brand.name) || 'FILZ'}`;
    const description = [product.description, product.details].filter(Boolean).join('. ');
    const ogImage = (product.colors || []).find(c => c.image)
      ? absolute(config, (product.colors).find(c => c.image).image)
      : absolute(config, 'assets/images/og-cover.jpg');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escAttr(description)}">
  <meta name="robots" content="index, follow">
  <meta name="author" content="${escAttr((config.brand && config.brand.name) || 'FILZ')}">
  <meta name="theme-color" content="#F5F3EF">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-WLJD26DDGJ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-WLJD26DDGJ');
  </script>
  <link rel="icon" type="image/png" href="${escAttr(absolute(config, 'assets/images/Simbolo-Filz.png'))}">
  <link rel="canonical" href="${escAttr(url)}">
  <meta property="og:site_name" content="${escAttr((config.brand && config.brand.name) || 'FILZ')}">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(description)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${escAttr(url)}">
  <meta property="og:image" content="${escAttr(ogImage)}">
  <meta property="og:image:alt" content="${escAttr(product.name)}">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(title)}">
  <meta name="twitter:description" content="${escAttr(description)}">
  <meta name="twitter:image" content="${escAttr(ogImage)}">
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Saira:wght@300;400;500&family=Inter:wght@300;400;500&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Saira:wght@300;400;500&family=Inter:wght@300;400;500&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Saira:wght@300;400;500&family=Inter:wght@300;400;500&display=swap"></noscript>
  <link rel="stylesheet" href="${escAttr(absolute(config, 'css/style.css'))}">
  <link rel="stylesheet" href="${escAttr(absolute(config, 'css/product.css'))}">
  <script type="application/ld+json">${productJsonLd(config, product, url)}</script>
</head>
<body>
  <a href="/#produtos" class="sr-only" style="position:absolute;">Pular para o conteúdo</a>
  ${pageHeader(config)}
  <main>${productBody(config, product, url)}</main>
  ${pageFooter(config)}
  <script src="${escAttr(absolute(config, 'js/main.js'))}"></script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response('Erro interno: ' + error.message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
