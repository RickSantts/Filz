function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandSignature(config) {
  const b = config.brand || {};
  const e = config.email || {};
  if (!e.signatureEnabled) return '';

  const whatsapp = String(b.whatsapp || '').replace(/[^\d]/g, '');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:26px;">
      <tr>
        <td style="border-top:1px solid #D9D4CC;padding-top:18px;">
          <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#111111;">${escHtml(b.name || 'FILZ')}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#5E5A54;">${escHtml(b.tagline || '')}</p>
          <p style="margin:12px 0 0;font-size:12px;color:#5E5A54;">
            ${b.instagram ? `<a href="${escHtml(b.instagram)}" style="color:#B08D57;text-decoration:none;">${escHtml(b.instagramHandle || 'Instagram')}</a> &nbsp;·&nbsp;` : ''}
            ${whatsapp ? `<a href="https://wa.me/${whatsapp}" style="color:#B08D57;text-decoration:none;">WhatsApp</a> &nbsp;·&nbsp;` : ''}
            ${escHtml(b.domain || '')}
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#5E5A54;">
            <a href="mailto:${escHtml(b.email || '')}" style="color:#B08D57;text-decoration:none;">${escHtml(b.email || '')}</a>
          </p>
        </td>
      </tr>
    </table>
    <p style="font-size:11px;color:#8A857D;margin:16px 0 0;border-top:1px solid #F5F3EF;padding-top:12px;">${escHtml(e.signatureFooterNote || 'Este é um e-mail automático. Não é necessário respondê-lo.')}</p>
  `;
}

function welcomeEmailHtml(config) {
  const b = config.brand || {};
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111111;line-height:1.6;padding:20px;">
      <h2 style="font-weight:300;font-size:24px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:20px;">${escHtml(b.name || 'FILZ')}</h2>
      <hr style="border:0;border-top:1px solid #D9D4CC;margin:20px 0;" />
      <p>Olá,</p>
      <p>Agradecemos o seu interesse na nossa marca. Você acabou de ser adicionado à lista de espera para o lançamento da nossa primeira coleção.</p>
      <p><strong>Menos excesso. Mais presença.</strong></p>
      <p>Avisaremos você em primeira mão assim que as primeiras peças estiverem disponíveis para compra no site.</p>
      ${brandSignature(config)}
    </div>
  `;
}

async function loadConfig(request) {
  try {
    const res = await fetch(new URL('/config.json', request.url));
    if (res.ok) return await res.json();
  } catch (e) {
    console.error('Falha ao carregar config.json:', e);
  }
  return {};
}

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

    const config = await loadConfig(request);
    const b = config.brand || {};
    const e = config.email || {};
    const from = `${b.name || 'FILZ'} <${b.email || 'contato@filz.com.br'}>`;
    const welcomeSubject = e.welcomeSubject || 'Bem-vindo à lista de espera da FILZ ✦';

    // 1. E-mail de Boas-vindas para o Cliente
    const sendToClient = fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: welcomeSubject,
        html: welcomeEmailHtml(config)
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
        from,
        to: b.email || 'contato@filz.com.br', // Direciona para o e-mail cadastrado no Cloudflare Email Routing
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
