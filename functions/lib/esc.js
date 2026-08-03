export function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

export function escAttr(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function siteUrl(config) {
  const domain = (config.brand && config.brand.domain) || 'filz.com.br';
  return 'https://' + domain;
}

export function absolute(config, p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p)) return p;
  return siteUrl(config) + '/' + String(p).replace(/^\//, '');
}

export function assetPath(p) {
  if (!p) return '';
  if (/^https?:\/\//.test(p) || p.startsWith('/')) return p;
  return '/' + p;
}

export const ICONS = {
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`
};

export function brandLogo(config) {
  const b = config.brand || {};
  if (b.logoImage) {
    return `<a href="/" class="nav__logo" aria-label="${escAttr(b.name || 'FILZ')} — início">
      <img src="${escAttr(assetPath(b.logoImage))}" alt="${escAttr(b.logoAlt || b.name || 'FILZ')}" class="nav__logo-img">
    </a>`;
  }
  return `<a href="/" class="nav__logo" aria-label="${escAttr(b.name || 'FILZ')} — início">
    <span class="nav__logo-text">${escHtml(b.name || 'FILZ')}</span>
  </a>`;
}

export function pageHeader(config) {
  const b = config.brand || {};
  return `
    <header id="nav" class="nav" role="banner">
      <div class="nav__left"></div>
      ${brandLogo(config)}
      <nav class="nav__links" aria-label="Navegação principal">
        <a href="/#produtos" class="nav__link">Coleção</a>
        <a href="/#medidas" class="nav__link">Medidas</a>
        <a href="${escAttr(b.instagram || '#')}" class="nav__link nav__link--cta" target="_blank" rel="noopener noreferrer" aria-label="Instagram da ${escAttr(b.name || 'FILZ')}">Instagram</a>
      </nav>
    </header>
  `;
}

export function pageFooter(config) {
  const b = config.brand || {};
  return `
    <footer id="footer" class="footer" role="contentinfo">
      <div class="container">
        <div class="footer__inner">
          <div><p class="footer__logo">${escHtml(b.name || 'FILZ')}</p></div>
          <div class="footer__links">
            <a href="${escAttr(b.instagram || '#')}" class="footer__link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${escHtml(b.instagramHandle || 'Instagram')}</a>
            <a href="mailto:${escAttr(b.email || '')}" class="footer__link" aria-label="E-mail">${escHtml(b.email || '')}</a>
            <span class="footer__link">${escHtml(b.domain || 'filz.com.br')}</span>
          </div>
        </div>
        <p class="footer__tagline">${escHtml(b.tagline || '')}</p>
      </div>
    </footer>
  `;
}
