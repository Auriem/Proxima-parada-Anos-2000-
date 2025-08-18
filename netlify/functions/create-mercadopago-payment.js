import { MercadoPagoConfig, Preference } from 'mercadopago';

export const handler = async (event) => {
  try {
    console.log('Criando preferência de pagamento');
    console.log('Event body:', event.body);
    
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Token do Mercado Pago não configurado' }),
      };
    }
    
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const { items, payer, metadata } = JSON.parse(event.body);
    console.log('Dados recebidos:', { items, payer, metadata });

    const result = await preference.create({
      body: {
        items: items,
        payer: { 
          name: payer.fullName, 
          email: payer.email 
        },
        metadata: {
          buyer_name: payer.fullName,
          buyer_email: payer.email,
          buyer_phone: payer.phone,
          session_id: metadata.sessionId
        },
        notification_url: `${process.env.URL}/.netlify/functions/2-handle-webhook`,
        back_urls: {
          success: `${process.env.URL}/sucesso.html`,
          failure: `${process.env.URL}/falha.html`,
        },
        auto_return: "approved",
      },
    });

    console.log('Preferência criada com sucesso:', result.id);
    return {
      statusCode: 200,
      body: JSON.stringify({ id: result.id, init_point: result.init_point }),
    };
  } catch (error) {
    console.error("Erro ao criar preferência de pagamento:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno do servidor: " + error.message }),
    };
  }
};

