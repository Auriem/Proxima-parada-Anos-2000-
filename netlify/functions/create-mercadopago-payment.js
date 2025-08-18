import { MercadoPagoConfig, Preference } from 'mercadopago';

export const handler = async (event) => {
  try {
    console.log('create-mercadopago-payment: Função iniciada.');
    console.log('create-mercadopago-payment: Event body recebido:', event.body);
    
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('create-mercadopago-payment: MERCADOPAGO_ACCESS_TOKEN não configurado.');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Token do Mercado Pago não configurado.' }),
      };
    }
    
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
      console.log('create-mercadopago-payment: Body parseado:', requestBody);
    } catch (parseError) {
      console.error('create-mercadopago-payment: Erro ao parsear JSON do body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Requisição inválida: JSON mal formatado.' }),
      };
    }

    const { title, price, buyerName, buyerEmail } = requestBody;
    console.log('create-mercadopago-payment: Dados extraídos:', { title, price, buyerName, buyerEmail });

    // Verificando se os dados essenciais estão presentes
    if (!title || !price || !buyerName || !buyerEmail) {
      console.error('create-mercadopago-payment: Dados essenciais faltando:', { title, price, buyerName, buyerEmail });
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dados essenciais para a preferência de pagamento estão faltando.' }),
      };
    }

    const items = [{
      title: title,
      unit_price: parseFloat(price),
      quantity: 1,
    }];

    const payer = {
      fullName: buyerName,
      email: buyerEmail,
    };

    const metadata = {
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      // Adicione outros metadados se necessário, como buyer_phone ou session_id
    };

    // Usar process.env.BASE_URL conforme discutido
    const notificationUrl = `${process.env.BASE_URL}/.netlify/functions/2-handle-webhook`;
    const successUrl = `${process.env.BASE_URL}/sucesso.html`;
    const failureUrl = `${process.env.BASE_URL}/falha.html`;

    console.log('create-mercadopago-payment: URLs de retorno e notificação:', { notificationUrl, successUrl, failureUrl });

    const result = await preference.create({
      body: {
        items: items,
        payer: payer,
        metadata: metadata,
        notification_url: notificationUrl,
        back_urls: {
          success: successUrl,
          failure: failureUrl,
        },
        auto_return: "approved",
      },
    });

    console.log('create-mercadopago-payment: Preferência criada com sucesso. ID:', result.id);
    return {
      statusCode: 200,
      body: JSON.stringify({ id: result.id, init_point: result.init_point }),
    };
  } catch (error) {
    console.error('create-mercadopago-payment: Erro geral:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Erro interno do servidor: ' + error.message }),
    };
  }
};


