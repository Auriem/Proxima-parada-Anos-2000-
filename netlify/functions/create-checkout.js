// Importa o SDK do Mercado Pago
const mercadopago = require('mercadopago');

// A função principal que a Netlify irá executar
exports.handler = async (event) => {
    // Garante que a requisição é um POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Configura o Mercado Pago com a sua chave de acesso (que estará na Netlify)
    mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    // Obtém os dados enviados do formulário do site
    const data = JSON.parse(event.body);
    const { sessionId, userName, userEmail, phone, tickets } = data;

    // Cria a lista de itens para o checkout
    const items = [];
    if (tickets.inteira.quantity > 0) {
        items.push({
            title: `Ingresso Inteira - Próxima Parada: Anos 2000`,
            description: `Sessão ID: ${sessionId}`,
            quantity: tickets.inteira.quantity,
            currency_id: 'BRL',
            unit_price: tickets.inteira.unit_price,
        });
    }
    if (tickets.meia.quantity > 0) {
        items.push({
            title: `Ingresso Meia - Próxima Parada: Anos 2000`,
            description: `Sessão ID: ${sessionId}`,
            quantity: tickets.meia.quantity,
            currency_id: 'BRL',
            unit_price: tickets.meia.unit_price,
        });
    }

    // Se não houver itens, retorna um erro
    if (items.length === 0) {
        return { statusCode: 400, body: 'Nenhum ingresso selecionado.' };
    }
    
    // Agrupa todos os dados do cliente para usar depois no webhook
    const externalReference = JSON.stringify({
        userName,
        userEmail,
        phone,
        sessionId,
        tickets,
    });

    // Cria a preferência de pagamento
    const preference = {
        items: items,
        payer: {
            name: userName,
            email: userEmail,
            phone: {
                area_code: phone.substring(1, 3),
                number: phone.substring(5).replace('-', ''),
            },
        },
        back_urls: {
            success: 'https://proximaparadaanos2000.netlify.app/', // URL do seu site
            failure: 'https://proximaparadaanos2000.netlify.app/',
            pending: 'https://proximaparadaanos2000.netlify.app/',
        },
        auto_return: 'approved',
        notification_url: `https://proximaparadaanos2000.netlify.app/.netlify/functions/handle-payment`,
        external_reference: externalReference,
    };

    try {
        // Envia a preferência para a API do Mercado Pago
        const response = await mercadopago.preferences.create(preference);
        // Retorna o link de checkout para o site
        return {
            statusCode: 200,
            body: JSON.stringify({ init_point: response.body.init_point }),
        };
    } catch (error) {
        console.error('Erro ao criar preferência no Mercado Pago:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao comunicar com o sistema de pagamento.' }),
        };
    }
};