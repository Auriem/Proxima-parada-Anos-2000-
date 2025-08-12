import { MercadoPagoConfig, Payment } from 'mercadopago';

// Esta chave é SECRETA e será lida das variáveis de ambiente do Netlify
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken });
const payment = new Payment(client);

export const handler = async (event) => {
    try {
        const { items, payer, metadata } = JSON.parse(event.body);

        // Calcula o valor total da transação
        const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

        // Define uma data de expiração para 15 minutos no futuro para o PIX
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + 15);

        const paymentData = {
            body: {
                transaction_amount: Number(totalAmount.toFixed(2)),
                description: 'Ingressos para "Próxima Parada: Anos 2000"',
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    first_name: payer.fullName.split(' ')[0],
                    last_name: payer.fullName.split(' ').slice(1).join(' ') || payer.fullName.split(' ')[0],
                },
                notification_url: `${process.env.URL}/api/2-handle-webhook`,
                date_of_expiration: expirationDate.toISOString().replace(/\.\d{3}Z$/, "-03:00"),
                external_reference: metadata.sessionId, // Usamos um ID para referência
                metadata: {
                    buyer_name: payer.fullName,
                    buyer_email: payer.email,
                    buyer_phone: payer.phone,
                    session_id: metadata.sessionId
                }
            }
        };

        const result = await payment.create(paymentData);
        
        // Extrai os dados do QR Code da resposta da API
        const qrCodeBase64 = result.point_of_interaction.transaction_data.qr_code_base64;
        const qrCodeCopyPaste = result.point_of_interaction.transaction_data.qr_code;

        return {
            statusCode: 200,
            body: JSON.stringify({
                qrCodeBase64: qrCodeBase64,
                qrCodeCopyPaste: qrCodeCopyPaste
            })
        };

    } catch (error) {
        console.error("Erro ao criar pagamento PIX:", error?.cause ?? error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Falha ao gerar o código PIX.' })
        };
    }
};
