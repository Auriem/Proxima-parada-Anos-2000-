// netlify/functions/create-checkout.js
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const data = JSON.parse(event.body);
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  const preference = {
    items: [{
      title: `Ingressos para: ${data.sessao}`,
      description: `${data.qtdInteira}x Inteira, ${data.qtdMeia}x Meia`,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: data.total,
    }],
    back_urls: {
      success: `https://proximaparadaanos2000.netlify.app/`, // Página para onde volta após sucesso
    },
    auto_return: 'approved',
    payer: {
      name: data.nome,
      email: data.email,
    },
    external_reference: JSON.stringify({ // Enviamos os dados para uso posterior
        nome: data.nome,
        email: data.email,
        sessao: data.sessao,
        qtdInteira: data.qtdInteira,
        qtdMeia: data.qtdMeia,
        total: data.total
    })
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });
    const result = await response.json();
    return { statusCode: 200, body: JSON.stringify({ checkoutUrl: result.init_point }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};