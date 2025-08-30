// netlify/functions/send-tickets.js

export async function handler(event) {
  // Permite preflight se algum dia você chamar de outro domínio
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const API_KEY = process.env.MAILERSEND_API_KEY;
    if (!API_KEY) {
      return { statusCode: 500, body: 'MAILERSEND_API_KEY ausente nas variáveis de ambiente.' };
    }

    const OWNER_EMAIL      = process.env.OWNER_EMAIL || 'auriemcompany@gmail.com';
    const TEMPLATE_CLIENTE = 'v69oxl5oz2rg785k';  // seu template do cliente
    const TEMPLATE_ADMIN   = 'zr6ke4njzx3gon12';  // seu template do admin

    const payloadIn = JSON.parse(event.body || '{}');
    const { cliente, admin, codigos } = payloadIn;

    if (!cliente || !admin || !Array.isArray(codigos) || !cliente.email) {
      return {
        statusCode: 400,
        body: 'Payload inválido. Esperado { cliente:{nome,email,telefone,sessao_label,valor}, admin:{from_name,from_email,phone,responsavel_pix,sessao,ingresso}, codigos:[...] }'
      };
    }

    // ------- Formatação de códigos (um por linha) -------
    // Para texto simples:
    const codesText = codigos.join(', ');

    // Para HTML (um código por linha)
    const codesHtml = codigos.map(c => `• ${c}`).join('<br>');

    // ------- EMAIL PARA O CLIENTE (template visual) -------
    // Seu template usa: {{nome_cliente}}, {{codigo_ingresso}}, {{email_cliente}}, {{telefone_cliente}},
    // {{sessao_escolhida}}, {{valor_ingresso}}
    const mailCliente = {
      from: { email: "ingressos@proximaparadaanos2000.online", name: "Próxima Parada: Anos 2000" },
      to:   [{ email: cliente.email, name: cliente.nome }],
      template_id: TEMPLATE_CLIENTE,
      personalization: [{
        email: cliente.email,
        data: {
          nome_cliente:      cliente.nome,
          email_cliente:     cliente.email,
          telefone_cliente:  cliente.telefone || '—',
          sessao_escolhida:  cliente.sessao_label || '—',
          valor_ingresso:    (cliente.valor || '—').toString().replace('R$','').trim(),
          // Você pode usar este campo no template: ex.: <div>{{codigo_ingresso}}</div>
          // (o template é HTML, então as <br> serão renderizadas)
          codigo_ingresso:   codesHtml
        }
      }]
    };

    // ------- EMAIL PARA O ADMIN (tabela) -------
    // Seu template usa: {{from_name}}, {{from_email}}, {{phone}}, {{responsavel_pix}},
    // {{sessao}}, {{ingresso}}, {{code}}
    const mailAdmin = {
      from: { email: "ingressos@proximaparadaanos2000.online", name: "Próxima Parada: Anos 2000" },
      to:   [{ email: OWNER_EMAIL, name: "Admin Ingressos" }],
      template_id: TEMPLATE_ADMIN,
      personalization: [{
        email: OWNER_EMAIL,
        data: {
          from_name:       admin.from_name,
          from_email:      admin.from_email,
          phone:           admin.phone || '—',
          responsavel_pix: admin.responsavel_pix || '—',
          sessao:          admin.sessao || '—',
          ingresso:        admin.ingresso || '—',
          // Aqui também mandamos linhas separadas:
          code:            codesHtml
        }
      }]
    };

    // ------- Envio paralelo -------
    const url = 'https://api.mailersend.com/v1/email';
    const send = (body) => fetch(url, {
      method:'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const [resCliente, resAdmin] = await Promise.all([ send(mailCliente), send(mailAdmin) ]);

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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true, sent: { cliente: true, admin: true } })
    };

  } catch (err) {
    return { statusCode: 500, body: `Erro interno: ${err?.message || String(err)}` };
  }
}
