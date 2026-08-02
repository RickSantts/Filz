const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const name = String(params.name || '');

  const kv = env.CONFIG_KV;
  if (kv) {
    try {
      const data = await kv.get('media:' + name, 'arrayBuffer');
      if (data) {
        const dot = name.lastIndexOf('.');
        const ext = dot > 0 ? name.slice(dot).toLowerCase() : '';
        return new Response(data, {
          status: 200,
          headers: {
            'Content-Type': EXT_MIME[ext] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {
      console.error('Falha ao ler media do KV:', e);
    }
  }

  const fallback = await env.ASSETS.fetch(new URL('/assets/images/' + name, request.url));
  if (fallback.ok) return fallback;

  return new Response('Not Found', { status: 404 });
}
