export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ ok: false, message: 'E-mail inválido' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Chave de API do Resend configurada nas variáveis do Cloudflare
    const RESEND_API_KEY = env.RESEND_API_KEY; 
    
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, message: 'API Key do Resend não configurada' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 1. E-mail de Boas-vindas para o Cliente
    const sendToClient = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FILZ <contato@filz.com.br>',
        to: email,
        subject: 'Bem-vindo à lista de espera da FILZ ✦',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111111; line-height: 1.6; padding: 20px;">
            <h2 style="font-weight: 300; font-size: 24px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px;">FILZ</h2>
            <hr style="border: 0; border-top: 1px solid #D9D4CC; margin: 20px 0;" />
            <p>Olá,</p>
            <p>Agradecemos o seu interesse na nossa marca. Você acabou de ser adicionado à lista de espera para o lançamento da nossa primeira coleção.</p>
            <p><strong>Menos excesso. Mais presença.</strong></p>
            <p>Avisaremos você em primeira mão assim que as primeiras peças estiverem disponíveis para compra no site.</p>
            <hr style="border: 0; border-top: 1px solid #F5F3EF; margin: 30px 0;" />
            <p style="font-size: 12px; color: #5E5A54; letter-spacing: 0.05em;">Este é um e-mail automático. Não é necessário respondê-lo.</p>
            <p style="font-size: 12px; color: #5E5A54;">contato@filz.com.br | filz.com.br</p>
          </div>
        `
      })
    });

    // 2. Notificação para Você (Aviso de novo lead)
    const sendToAdmin = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'FILZ Sistema <contato@filz.com.br>',
        to: 'contato@filz.com.br', // Direciona para o e-mail cadastrado no Cloudflare Email Routing
        subject: 'Novo lead na lista de espera!',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h3>Novo cadastro na lista de espera da FILZ</h3>
            <p>E-mail do lead: <strong>${email}</strong></p>
            <p>Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          </div>
        `
      })
    });

    // Executa ambos os envios simultaneamente
    const [resClient, resAdmin] = await Promise.all([sendToClient, sendToAdmin]);

    if (!resClient.ok) {
      const errText = await resClient.text();
      console.error('Erro Resend Cliente:', errText);
    }
    if (!resAdmin.ok) {
      const errText = await resAdmin.text();
      console.error('Erro Resend Admin:', errText);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
