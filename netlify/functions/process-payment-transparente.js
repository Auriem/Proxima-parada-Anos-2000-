// netlify/functions/process-payment-transparente.js
const mercadopago = require('mercadopago');
const { Resend } = require('resend');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });
        const data = JSON.parse(event.body);

        const paymentData = {
            transaction_amount: data.transaction_amount,
            description: data.description,
            payment_method_id: 'pix',
            payer: {
                email: data.payer.email,
                first_name: data.payer.first_name,
                last_name: data.payer.last_name,
                identification: {
                    type: data.payer.identification.type,
                    number: data.payer.identification.number
                }
            },
            notification_url: `https://proximaparadaanos2000.online/.netlify/functions/handle-payment`,
        };

        const { body: paymentResult } = await mercadopago.payment.save(paymentData);

        if (paymentResult.status === 'pending') {
            // Retorna os dados do PIX para o frontend
            return {
                statusCode: 200,
                body: JSON.stringify({
                    paymentId: paymentResult.id,
                    qr_code_base64: paymentResult.point_of_interaction.transaction_data.qr_code_base64,
                    qr_code: paymentResult.point_of_interaction.transaction_data.qr_code
                }),
            };
        } else {
            throw new Error(paymentResult.status_detail || 'Não foi possível gerar o PIX.');
        }

    } catch (error) {
        console.error("Erro ao processar pagamento:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Ocorreu um erro interno.' }),
        };
    }
};
