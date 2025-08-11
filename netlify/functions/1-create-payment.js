import { MercadoPagoConfig, Preference } from 'mercadopago';

// Esta chave é SECRETA e será lida das variáveis de ambiente do Netlify
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });

export const handler = async (event) => {
    try {
        const { items, payer, metadata } = JSON.parse(event.body);

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: items, // Recebe os itens diretamente do frontend
                payer: {
                    name: payer.fullName,
                    email: payer.email,
                    phone: {
                        area_code: payer.phone.substring(0, 2), // Supondo formato (XX) YYYYY-YYYY
                        number: payer.phone.substring(2)
                    }
                },
                metadata: {
                    buyer_name: payer.fullName,
                    buyer_email: payer.email,
                    buyer_phone: payer.phone,
                    session_id: metadata.sessionId
                },
                notification_url: `${process.env.URL}/api/2-handle-webhook`,
                back_urls: {
                    success: `${process.env.URL}/sucesso.html`, // Crie esta página
                    failure: `${process.env.URL}/falha.html`    // Crie esta página
                },
                auto_return: "approved",
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ preferenceId: result.id })
        };
    } catch (error) {
        console.error("Erro ao criar preferência no Mercado Pago:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao criar preferência de pagamento.' })
        };
    }
};