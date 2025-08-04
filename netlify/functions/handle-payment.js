// netlify/functions/handle-payment.js
const { Resend } = require('resend');
const mercadopago = require('mercadopago');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // Configurar Mercado Pago
        mercadopago.configure({ 
            access_token: process.env.MERCADOPAGO_ACCESS_TOKEN 
        });

        const notification = JSON.parse(event.body);
        console.log('Webhook recebido:', notification);

        // Verificar se é uma notificação de pagamento
        if (notification.type === 'payment' && notification.data && notification.data.id) {
            const payment = await mercadopago.payment.findById(notification.data.id);
            console.log('Pagamento encontrado:', payment.body);
            
            if (payment.body.status === 'approved') {
                const { payer, description, transaction_amount, id } = payment.body;
                const userName = `${payer.first_name} ${payer.last_name}`;
                const userEmail = payer.email;

                // Gerar código único
                const uniqueCode = `A2K-${Date.now().toString(36).toUpperCase()}`;

                try {
                    // ENVIAR E-MAIL PARA O CLIENTE
                    await resend.emails.send({
                        from: 'Auriem Company <contato@proximaparadaanos2000.online>',
                        to: userEmail,
                        subject: `Seu ingresso para Próxima Parada: Anos 2000! ✨`,
                        html: `
                            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; color: #333;">
                                <img src="https://i.postimg.cc/H8phbYvx/ce6dae6d-822a-4f90-9415-f73e5ac34390.png" alt="Logo Auriem" style="width:100px;">
                                <h1 style="color: #8A2BE2;">Compra Aprovada, ${userName}!</h1>
                                <p>Seu passaporte para os anos 2000 está garantido!</p>
                                <img src="https://i.postimg.cc/4496yMT8/Anahi-Rbd-GIF-Anahi-Rbd-Rebelde-Way-Descubre-y-comparte-GIF.gif" alt="Confirmação" style="max-width: 300px; border-radius: 10px;">
                                <p><strong>Seu Código Único de Entrada:</strong></p>
                                <h2 style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; border: 2px dashed #FF6EC7;">${uniqueCode}</h2>
                                <p><strong>Detalhes da Compra:</strong></p>
                                <p>${description}</p>
                                <p><strong>Valor Pago:</strong> R$ ${transaction_amount.toFixed(2)}</p>
                                <p>Apresente este e-mail (ou o código) na entrada do teatro.</p>
                                <hr style="border: 1px solid #ddd;">
                                <p><strong>Local:</strong> Teatro Enio Carvalho - Rua Mateus Leme, 990, Centro Cívico, Curitiba</p>
                                <p>Atenciosamente,<br><strong>Auriem Produções Artísticas</strong></p>
                            </div>
                        `,
                        attachments: [{
                            filename: 'modelo_ingresso_anos2000.pdf',
                            path: 'https://proximaparadaanos2000.online/assets/modelo_ingresso.pdf'
                        }]
                    });

                    console.log('E-mail enviado para o cliente:', userEmail);

                    // ENVIAR E-MAIL DE NOTIFICAÇÃO PARA A PRODUÇÃO
                    await resend.emails.send({
                        from: 'Sistema de Vendas <vendas@proximaparadaanos2000.online>',
                        to: 'auriemcompany@gmail.com',
                        subject: `✅ Nova Venda Realizada! - Próxima Parada: Anos 2000`,
                        html: `
                            <h2>Nova Venda Confirmada!</h2>
                            <p><strong>Comprador:</strong> ${userName}</p>
                            <p><strong>E-mail:</strong> ${userEmail}</p>
                            <p><strong>Descrição da Compra:</strong> ${description}</p>
                            <p><strong>Valor:</strong> R$ ${transaction_amount.toFixed(2)}</p>
                            <p><strong>Código Único:</strong> ${uniqueCode}</p>
                            <p><strong>ID do Pagamento:</strong> ${id}</p>
                            <p><strong>Status:</strong> ${payment.body.status}</p>
                            <p><strong>Método de Pagamento:</strong> ${payment.body.payment_method_id}</p>
                            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                            
                            <h3>Dados do Comprador:</h3>
                            <p><strong>Nome Completo:</strong> ${userName}</p>
                            <p><strong>E-mail:</strong> ${userEmail}</p>
                            <p><strong>Documento:</strong> ${payer.identification?.type || 'N/A'} - ${payer.identification?.number || 'N/A'}</p>
                            
                            <h3>Detalhes Técnicos:</h3>
                            <p><strong>Payment ID:</strong> ${id}</p>
                            <p><strong>Status Detail:</strong> ${payment.body.status_detail}</p>
                            <p><strong>External Reference:</strong> ${payment.body.external_reference || 'N/A'}</p>
                        `
                    });

                    console.log('E-mail enviado para a produção');

                } catch (emailError) {
                    console.error('Erro ao enviar e-mails:', emailError);
                    // Não falhar o webhook por causa do e-mail
                }
            } else {
                console.log('Pagamento não aprovado, status:', payment.body.status);
            }
        } else {
            console.log('Notificação não é de pagamento ou dados inválidos');
        }

        return { 
            statusCode: 200, 
            headers,
            body: JSON.stringify({ status: "success", message: "Notificação processada" })
        };

    } catch (error) {
        console.error('Erro no webhook:', error);
        return { 
            statusCode: 200, 
            headers,
            body: JSON.stringify({ 
                status: "error", 
                message: error.message,
                details: error.stack
            })
        };
    }
};

