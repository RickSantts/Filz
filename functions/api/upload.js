import { getUser } from '../../lib/auth.js';

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

function sanitizeName(name = '') {
  const clean = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\.\./g, '');
  return clean || 'imagem';
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const user = await getUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, message: 'Não autenticado. Faça login.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const kv = env.CONFIG_KV;
    if (!kv) {
      return new Response(JSON.stringify({ ok: false, message: 'KV não configurado no Cloudflare.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ ok: false, message: 'Nenhum arquivo enviado.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const name = sanitizeName(file.name || 'imagem.jpg');
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot) : '.jpg';
    const mime = EXT_MIME[ext] || file.type || 'application/octet-stream';

    await kv.put('media:' + name, await file.arrayBuffer());

    return new Response(JSON.stringify({ ok: true, path: 'media/' + name, mime }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
