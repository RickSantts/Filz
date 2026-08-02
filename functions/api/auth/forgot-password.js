export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email } = await request.json();

    const adminEmail = env.ADMIN_EMAIL;
    if (!adminEmail) {
      return new Response(JSON.stringify({ ok: false, message: 'E-mail do administrador não configurado' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resendKey = env.RESEND_API_KEY;
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, message: 'API de e-mail não configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FILZ Admin <contato@filz.com.br>',
        to: adminEmail,
        subject: 'Recuperação de senha — FILZ Admin',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #111; padding: 20px;">
            <h2 style="font-weight: 300; font-size: 22px; letter-spacing: 0.15em; text-transform: uppercase;">FILZ</h2>
            <hr style="border:0;border-top:1px solid #D9D4CC;margin:20px 0;">
            <p>Olá,</p>
            <p>Alguém solicitou a recuperação da senha do painel administrativo da FILZ.</p>
            <p style="background:#F5F3EF;padding:12px 16px;border-radius:6px;font-family:monospace;font-size:16px;letter-spacing:0.1em;">
              ${env.ADMIN_PASSWORD}
            </p>
            <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>
            <hr style="border:0;border-top:1px solid #F5F3EF;margin:30px 0;">
            <p style="font-size:12px;color:#5E5A54;">contato@filz.com.br</p>
          </div>
        `
      })
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('Erro Resend:', err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
