import { getUser } from '../lib/auth.js';

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

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return new Response(JSON.stringify({ ok: false, message: 'Payload inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await kv.put('config', JSON.stringify(body));

    return new Response(JSON.stringify({ ok: true }), {
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
