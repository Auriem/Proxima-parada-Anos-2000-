import { MercadoPagoConfig, Preference } from 'mercadopago';

// Esta chave é SECRETA e será lida das variáveis de ambiente do Netlify
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });

export const handler = async (event) => {
    try {
        const { items, payer, metadata } = JSON.parse(event.body);

        // Define uma data de expiração para 15 minutos no futuro para o PIX
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 15);

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: items,
                payer: {
                    name: payer.fullName,
                    email: payer.email,
                    phone: {
                        // Assume formato (XX) YYYYY-YYYY, remove caracteres não numéricos
                        area_code: payer.phone.replace(/\D/g, '').substring(0, 2),
                        number: payer.phone.replace(/\D/g, '').substring(2)
                    }
                },
                metadata: {
                    buyer_name: payer.fullName,
                    buyer_email: payer.email,
                    buyer_phone: payer.phone,
                    session_id: metadata.sessionId
                },
                payment_methods: {
                    excluded_payment_types: [
                        { id: "ticket" } // Exclui boleto para simplificar
                    ]
                },
                // Adiciona a data de expiração para o pagamento
                date_of_expiration: expirationDate.toISOString().replace(/\.\d{3}Z$/, "-03:00"),
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
