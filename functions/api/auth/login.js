import { signToken, cookieHeader } from '../../lib/auth.js';

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { password } = await request.json();

    if (!password) {
      return new Response(JSON.stringify({ ok: false, message: 'Digite a senha.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check KV first (registered accounts), fallback to env var
    let valid = false;
    const kv = env.ADMIN_KV;
    if (kv) {
      const storedHash = await kv.get('admin_hash');
      if (storedHash) {
        const encoder = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
        const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        valid = (hashHex === storedHash);
      }
    }
    if (!valid && env.ADMIN_PASSWORD) {
      valid = (password === env.ADMIN_PASSWORD);
    }
    if (!valid) {
      return new Response(JSON.stringify({ ok: false, message: 'Senha incorreta' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const secret = env.SESSION_SECRET || env.ADMIN_PASSWORD || 'fallback_secret';
    const token = await signToken({
      role: 'admin',
      exp: Date.now() + 86400000,
      jti: crypto.randomUUID()
    }, secret);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieHeader('filz_session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
          path: '/',
          maxAge: 86400
        })
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
