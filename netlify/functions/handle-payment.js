// netlify/functions/handle-payment.js
const { Resend } = require('resend');
const mercadopago = require('mercadopago');

const resend = new Resend(process.env.RESEND_API_KEY);
mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const notification = JSON.parse(event.body);

        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const payment = await mercadopago.payment.findById(notification.data.id);
            
            if (payment.body.status === 'approved') {
                const { userName, userEmail, phone, sessionId, tickets } = JSON.parse(payment.body.external_reference);
                
                const uniqueCode = `A2K-${Date.now().toString(36).toUpperCase()}`;
                let ticketDetails = '';
                if (tickets.inteira.quantity > 0) ticketDetails += `<li>${tickets.inteira.quantity}x Ingresso(s) Inteira</li>`;
                if (tickets.meia.quantity > 0) ticketDetails += `<li>${tickets.meia.quantity}x Ingresso(s) Meia</li>`;

                // ENVIA E-MAIL PARA O CLIENTE
                await resend.emails.send({
                    from: 'Auriem Company <contato@proximaparadaanos2000.online>', // **Use o seu domínio verificado**
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
                    attachments: [
                        {
                            filename: 'modelo_ingresso_anos2000.pdf',
                            path: 'https://proximaparadaanos2000.online/assets/modelo_ingresso.pdf' // **Use o seu novo domínio aqui também**
                        }
                    ]
                });

                // ENVIA E-MAIL DE NOTIFICAÇÃO PARA A PRODUÇÃO
                await resend.emails.send({
                    from: 'Sistema de Vendas <vendas@proximaparadaanos2000.online>', // **Use o seu domínio verificado**
                    to: 'auriemcompany@gmail.com',
                    subject: `✅ Nova Venda Realizada! - Próxima Parada: Anos 2000`,
                    html: `
                        <h2>Nova Venda Confirmada!</h2>
                        <p><strong>Comprador:</strong> ${userName}</p>
                        <p><strong>E-mail:</strong> ${userEmail}</p>
                        <p><strong>Telefone:</strong> ${phone}</p>
                        <p><strong>Sessão ID:</strong> ${sessionId}</p>
                        <p><strong>Ingressos:</strong></p>
                        <ul>${ticketDetails}</ul>
                        <p><strong>Código Único:</strong> ${uniqueCode}</p>
                    `
                });
            }
        }
    } catch (error) {
        console.error('Erro no webhook:', error);
        return { statusCode: 200, body: JSON.stringify({ status: "error", message: error.message }) };
    }

    return { statusCode: 200, body: 'Notificação recebida.' };
};
