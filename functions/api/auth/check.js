import { verifyToken } from '../../lib/auth.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/(?:^|;\s*)filz_session=([^;]*)/);
    if (!match) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD;
    const payload = await verifyToken(match[1], secret);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, role: payload.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
