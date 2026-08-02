export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email, password } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ ok: false, message: 'E-mail inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ ok: false, message: 'A senha deve ter no mínimo 6 caracteres.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Try KV first
    const kv = env.ADMIN_KV;
    if (kv) {
      const existing = await kv.get('admin_email');
      if (existing) {
        return new Response(JSON.stringify({ ok: false, message: 'Já existe uma conta cadastrada.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await kv.put('admin_email', email);
      await kv.put('admin_hash', hashHex);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fallback: send password via email so admin can set it in env vars
    const resendKey = env.RESEND_API_KEY;
    const adminEmail = env.ADMIN_EMAIL;

    if (resendKey && adminEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'FILZ Admin <contato@filz.com.br>',
          to: adminEmail,
          subject: 'Nova conta FILZ Admin — definir senha',
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;padding:20px;">
              <h2 style="font-weight:300;font-size:22px;letter-spacing:0.15em;text-transform:uppercase;">FILZ</h2>
              <hr style="border:0;border-top:1px solid #D9D4CC;margin:20px 0;">
              <p>Uma nova conta foi solicitada para o e-mail: <strong>${email}</strong></p>
              <p>Senha escolhida: <strong style="font-family:monospace;font-size:16px;">${password}</strong></p>
              <p>Para ativar, adicione a variável de ambiente <code>ADMIN_PASSWORD</code> no Cloudflare Pages com essa senha.</p>
              <hr style="border:0;border-top:1px solid #F5F3EF;margin:30px 0;">
              <p style="font-size:12px;color:#5E5A54;">contato@filz.com.br</p>
            </div>
          `
        })
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      message: !kv
        ? 'Conta solicitada! Verifique seu e-mail para ativar.'
        : 'Conta criada com sucesso!'
    }), {
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
