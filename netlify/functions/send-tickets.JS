// netlify/functions/send-tickets.js
// Envia e-mails via MailerSend (admin + cliente) usando templates.
// Espera POST com body:
// {
//   cliente: { nome, email, telefone, sessao_label, valor },
//   admin:   { from_name, from_email, phone, responsavel_pix, sessao, ingresso },
//   codigos: ["PRX2000-...","PRX2000-..."]
// }

const API_URL = 'https://api.mailersend.com/v1/email';

function currencyBRL(v) {
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  // se vier "50" como string
  const num = Number(v);
  if (!isNaN(num)) return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return String(v);
}

function buildCodesHtml(codes = []) {
  if (!codes || !codes.length) return '<p>—</p>';
  const items = codes.map(c => `<li style="font-family:monospace">${c}</li>`).join('');
  return `<ul style="margin:8px 0 0 18px; padding:0">${items}</ul>`;
}

async function sendMailerSend({
  apiKey,
  fromEmail,
  fromName,
  toEmail,
  toName,
  subject,
  templateId,
  variablesObj,   // objeto { chave: valor } para {{chave}} no template
  replyToEmail,   // opcional
}) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // MailerSend usa "personalization" para passar variáveis por destinatário
  const body = {
    from: { email: fromEmail, name: fromName },
    to: [{ email: toEmail, name: toName || '' }],
    subject,
    template_id: templateId,
    personalization: [
      { email: toEmail, data: variablesObj }
    ],
  };

  if (replyToEmail) {
    body.reply_to = { email: replyToEmail };
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MailerSend error ${res.status}: ${text || res.statusText}`);
  }

  return res.status; // 202 esperado
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const {
      cliente,
      admin,
      codigos
    } = JSON.parse(event.body || '{}');

    if (!cliente || !admin || !Array.isArray(codigos)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payload inválido. Esperado { cliente, admin, codigos[] }.' })
      };
    }

    const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@proximaparadaanos2000.online';
    const FROM_NAME  = process.env.FROM_NAME  || 'Próxima Parada: Anos 2000';
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'auriemcompany@gmail.com';

    const TEMPLATE_CLIENTE_ID = process.env.MAILERSEND_TEMPLATE_CLIENT || 'v69oxl5oz2rg785k';
    const TEMPLATE_ADMIN_ID   = process.env.MAILERSEND_TEMPLATE_ADMIN  || 'zr6ke4njzx3gon12';

    if (!MAILERSEND_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'MAILERSEND_API_KEY não configurada.' }) };
    }

    // Normalizações e auxiliares
    const codes = Array.isArray(codigos) ? codigos : [];
    const codesFirst = codes[0] || '—';
    const codesJoined = codes.join(', ');
    const codesHtml = buildCodesHtml(codes);
    const valorBRL = currencyBRL(cliente.valor);

    // ===== E-MAIL DO ADMIN =====
    // Seu template adm antigo usava variáveis: {{from_name}}, {{from_email}}, {{phone}},
    // {{responsavel_pix}}, {{sessao}}, {{ingresso}}, {{code}}
    // Para suportar múltiplos códigos, também enviamos {{codes}} e {{codes_html}} (se quiser, adicione ao template).
    const adminVars = {
      from_name:       admin.from_name,
      from_email:      admin.from_email,
      phone:           admin.phone || '—',
      responsavel_pix: admin.responsavel_pix || '—',
      sessao:          admin.sessao,
      ingresso:        admin.ingresso,
      code:            codesFirst,     // compat c/ template antigo (1 código)
      codes:           codesJoined,    // novo
      codes_html:      codesHtml       // novo (se usar no template)
    };

    // ===== E-MAIL DO CLIENTE =====
    // Seu template cliente antigo usava: {{nome_cliente}}, {{email_cliente}}, {{telefone_cliente}},
    // {{sessao_escolhida}}, {{valor_ingresso}}, {{codigo_ingresso}}
    // Para múltiplos códigos enviamos também: {{codigos}} e {{codigos_html}} (opcional no template).
    const clienteVars = {
      nome_cliente:     cliente.nome,
      email_cliente:    cliente.email,
      telefone_cliente: cliente.telefone || '—',
      sessao_escolhida: cliente.sessao_label,
      valor_ingresso:   valorBRL,
      codigo_ingresso:  codesJoined, // compat c/ template antigo (vai exibir todos numa linha)
      codigos:          codesJoined, // novo
      codigos_html:     codesHtml    // novo
    };

    // Disparo em paralelo
    const [admStatus, cliStatus] = await Promise.all([
      sendMailerSend({
        apiKey: MAILERSEND_API_KEY,
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME,
        toEmail: OWNER_EMAIL,
        toName: 'Admin - Auriem',
        subject: '🎟️ Novo pedido de ingresso (pendente de pagamento)',
        templateId: TEMPLATE_ADMIN_ID,
        variablesObj: adminVars,
        replyToEmail: admin.from_email, // responder cai no e-mail do cliente
      }),
      sendMailerSend({
        apiKey: MAILERSEND_API_KEY,
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME,
        toEmail: cliente.email,
        toName: cliente.nome,
        subject: 'Seus ingressos chegaram! (aguardando pagamento)',
        templateId: TEMPLATE_CLIENTE_ID,
        variablesObj: clienteVars,
      })
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        admin_status: admStatus,
        cliente_status: cliStatus
      })
    };

  } catch (err) {
    console.error('send-tickets error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err && err.message ? err.message : err) })
    };
  }
};
