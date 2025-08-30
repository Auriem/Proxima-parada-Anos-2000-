// netlify/functions/send-tickets.js

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const API_KEY = process.env.MAILERSEND_API_KEY;
    if (!API_KEY) {
      return { statusCode: 500, body: 'MAILERSEND_API_KEY ausente nas variáveis de ambiente.' };
    }

    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'auriemcompany@gmail.com';
    const TEMPLATE_CLIENTE = 'v69oxl5oz2rg785k';
    const TEMPLATE_ADMIN   = 'zr6ke4njzx3gon12';

    const { cliente, admin, codigos } = JSON.parse(event.body || '{}');

    if (!cliente || !admin || !Array.isArray(codigos) || !cliente.email) {
      return { statusCode: 400, body: 'Payload inválido. Campos esperados: { cliente:{nome,email,telefone,sessao_label,valor}, admin:{from_name,from_email,phone,responsavel_pix,sessao,ingresso}, codigos:[...] }' };
    }

    // --- Monta envio ao CLIENTE ---
    const payloadCliente = {
      from: { email: "ingressos@proximaparadaanos2000.online", name: "Próxima Parada: Anos 2000" },
      to:   [{ email: cliente.email, name: cliente.nome }],
      template_id: TEMPLATE_CLIENTE,
      personalization: [{
        email: cliente.email,
        data: {
          nome_cliente:   cliente.nome,
          email_cliente:  cliente.email,
          telefone_cliente: cliente.telefone || '—',
          sessao_escolhida: cliente.sessao_label || '—',
          valor_ingresso: cliente.valor || '—',
          codigo_ingresso: codigos.join(', ')
        }
      }]
    };

    // --- Monta envio ao ADMIN ---
    const payloadAdmin = {
      from: { email: "ingressos@proximaparadaanos2000.online", name: "Próxima Parada: Anos 2000" },
      to:   [{ email: OWNER_EMAIL, name: "Admin Ingressos" }],
      template_id: TEMPLATE_ADMIN,
      personalization: [{
        email: OWNER_EMAIL,
        data: {
          from_name:      admin.from_name,
          from_email:     admin.from_email,
          phone:          admin.phone || '—',
          responsavel_pix: admin.responsavel_pix || '—',
          sessao:         admin.sessao || '—',
          ingresso:       admin.ingresso || '—',
          code:           codigos.join(', ')
        }
      }]
    };

    // Envia os dois e-mails em paralelo
    const fetchOpts = (body) => ({
      method:'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const url = 'https://api.mailersend.com/v1/email';
    const [resCliente, resAdmin] = await Promise.all([
      fetch(url, fetchOpts(payloadCliente)),
      fetch(url, fetchOpts(payloadAdmin))
    ]);

    if (!resCliente.ok) {
      const t = await resCliente.text();
      return { statusCode: 502, body: `Falha ao enviar para CLIENTE: ${t}` };
    }
    if (!resAdmin.ok) {
      const t = await resAdmin.text();
      return { statusCode: 502, body: `Falha ao enviar para ADMIN: ${t}` };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, sent: { cliente: true, admin: true } })
    };

  } catch (err) {
    return { statusCode: 500, body: `Erro interno: ${err && err.message ? err.message : String(err)}` };
  }
}
