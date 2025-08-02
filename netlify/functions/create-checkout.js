// netlify/functions/create-checkout.js
const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Validação do Access Token
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Chave de Acesso do Mercado Pago não configurada no servidor.' }) };
    }

    mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });

    const data = JSON.parse(event.body);
    const { sessionId, userName, userEmail, phone, tickets } = data;

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

    if (items.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Nenhum ingresso selecionado.' }) };
    }
    
    // Formata o número de telefone para o padrão da API
    const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não for dígito
    const areaCode = cleanPhone.substring(0, 2);
    const number = cleanPhone.substring(2);

    const externalReference = JSON.stringify({ userName, userEmail, phone, sessionId, tickets });

    const preference = {
        items,
        payer: {
            name: userName,
            email: userEmail,
            phone: {
                area_code: areaCode,
                number: Number(number),
            },
        },
        back_urls: { 
            success: 'https://proximaparadaanos2000.online/', 
            failure: 'https://proximaparadaanos2000.online/', 
            pending: 'https://proximaparadaanos2000.online/' 
        },
        auto_return: 'approved',
        notification_url: `https://proximaparadaanos2000.online/.netlify/functions/handle-payment`,
        external_reference: externalReference,
        purpose: 'wallet_purchase',
    };

    try {
        const response = await mercadopago.preferences.create(preference);
        return { statusCode: 200, body: JSON.stringify({ init_point: response.body.init_point }) };
    } catch (error) {
        console.error('ERRO DETALHADO DO MERCADO PAGO:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.cause?.[0]?.description || error.message || 'Falha ao comunicar com o sistema de pagamento.';
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Erro do Mercado Pago: ${errorMessage}` })
        };
    }
};

