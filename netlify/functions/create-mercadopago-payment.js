import { MercadoPagoConfig, Preference } from 'mercadopago';

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });
const preference = new Preference(client);

export const handler = async (event) => {
    try {
        const { items, payer, metadata } = JSON.parse(event.body);

        const result = await preference.create({
            body: {
                items: items,
                payer: { name: payer.fullName, email: payer.email },
                metadata: {
                    buyer_name: payer.fullName,
                    buyer_email: payer.email,
                    buyer_phone: payer.phone,
                    session_id: metadata.sessionId
                },
                notification_url: `${process.env.URL}/api/2-handle-webhook`,
                back_urls: {
                    success: `${process.env.URL}/sucesso.html`,
                    failure: `${process.env.URL}/falha.html`
                },
                auto_return: "approved",
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ paymentUrl: result.init_point })
        };
    } catch (error) {
        console.error("Erro ao criar preferência:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao criar preferência.' }) };
    }
};
