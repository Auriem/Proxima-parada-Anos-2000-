// Importa os SDKs do Resend e Mercado Pago
const { Resend } = require('resend');
const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    // Garante que a requisição é um POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Configura as chaves de API (que estarão na Netlify)
    const resend = new Resend(process.env.RESEND_API_KEY);
    mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
    });

    try {
        const notification = JSON.parse(event.body);

        // Verifica se é uma notificação de pagamento
        if (notification.type === 'payment' && notification.data && notification.data.id) {
            // Busca os detalhes completos do pagamento
            const payment = await mercadopago.payment.findById(notification.data.id);
            
            // Se o pagamento foi aprovado
            if (payment.body.status === 'approved') {
                // Recupera os dados do cliente que guardámos
                const { userName, userEmail, tickets } = JSON.parse(payment.body.external_reference);
                
                // Gera um código único para o ingresso
                const uniqueCode = `A2K-${Date.now().toString(36).toUpperCase()}`;

                // Monta a lista de ingressos para o e-mail
                let ticketDetails = '';
                if (tickets.inteira.quantity > 0) ticketDetails += `<li>${tickets.inteira.quantity}x Ingresso(s) Inteira</li>`;
                if (tickets.meia.quantity > 0) ticketDetails += `<li>${tickets.meia.quantity}x Ingresso(s) Meia</li>`;

                // Envia o e-mail com o Resend
                await resend.emails.send({
                    from: 'Auriem Company <contato@auriem.com.br>', // **IMPORTANTE: Use um domínio verificado no Resend**
                    to: userEmail,
                    subject: `Seu ingresso para Próxima Parada: Anos 2000! ✨`,
                    html: `
                        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #333;">
                            <img src="https://i.postimg.cc/H8phbYvx/ce6dae6d-822a-4f90-9415-f73e5ac34390.png" alt="Logo Auriem" style="width:100px;">
                            <h1 style="color: #8A2BE2;">Compra Aprovada, ${userName}!</h1>
                            <p>Seu passaporte para os anos 2000 está garantido!</p>
                            <img src="https://i.postimg.cc/4496yMT8/Anahi-Rbd-GIF-Anahi-Rbd-Rebelde-Way-Descubre-y-comparte-GIF.gif" alt="Confirmação" style="max-width: 300px; border-radius: 10px;">
                            <h2 style="color: #FF1493;">Detalhes do Pedido:</h2>
                            <ul style="list-style: none; padding: 0;">${ticketDetails}</ul>
                            <p><strong>Seu Código Único de Entrada:</strong></p>
                            <h2 style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; border: 2px dashed #FF6EC7;">${uniqueCode}</h2>
                            <p>Apresente este e-mail (ou o código) na entrada do teatro.</p>
                            <hr style="border: 1px solid #ddd;">
                            <p>Atenciosamente,<br><strong>Auriem Produções Artísticas</strong></p>
                        </div>
                    `,
                });
            }
        }
    } catch (error) {
        console.error('Erro no webhook:', error);
        // Retorna 200 mesmo em caso de erro para não sobrecarregar o Mercado Pago com retentativas.
        // O erro será visível nos logs da função na Netlify para depuração.
        return { statusCode: 200, body: JSON.stringify({ status: "error", message: error.message }) };
    }

    // Responde ao Mercado Pago que a notificação foi recebida com sucesso
    return { statusCode: 200, body: 'Notificação recebida.' };
};