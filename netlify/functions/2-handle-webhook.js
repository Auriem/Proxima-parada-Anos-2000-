import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises'; // Módulo para ler arquivos
import path from 'path';     // Módulo para lidar com caminhos de arquivos

// Lendo as chaves secretas do ambiente Netlify
const resend = new Resend(process.env.RESEND_API_KEY);
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new Payment(mpClient);
const myAdminEmail = process.env.MY_ADMIN_EMAIL;

export const handler = async (event) => {
    try {
        const data = JSON.parse(event.body);

        if (data.type === 'payment') {
            const paymentDetails = await payment.get({ id: data.data.id });
            
            if (paymentDetails.status === 'approved') {
                const { metadata, additional_info } = paymentDetails;
                const buyerName = metadata.buyer_name;
                const buyerEmail = metadata.buyer_email;

                // 1. Gerar o PDF a partir do seu template
                const pdfBytes = await createTicketFromTemplate(paymentDetails);
                const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

                // 2. Enviar email para o cliente com o ingresso personalizado
                await resend.emails.send({
                    from: 'Ingressos Anos 2000 <vendas@seudominio.com>', // Configure seu domínio no Resend
                    to: [buyerEmail],
                    subject: `Seu ingresso para "Próxima Parada: Anos 2000" chegou!`,
                    html: `<h1>Obrigado por sua compra, ${buyerName}!</h1><p>Seu ingresso personalizado está em anexo. Ele contém um código único de validação.</p>`,
                    attachments: [{ filename: 'Ingresso-Anos-2000.pdf', content: pdfBase64 }],
                });
                
                // 3. Enviar email de notificação para você (administrador)
                const itemsComprados = additional_info.items.map(item => `${item.quantity}x ${item.title}`).join('<br>');
                await resend.emails.send({
                    from: 'Notificação de Venda <sistema@seudominio.com>',
                    to: [myAdminEmail],
                    subject: `Nova Venda de Ingresso! - ID: ${paymentDetails.id}`,
                    html: `<h1>Venda Aprovada</h1>
                           <p><b>Cliente:</b> ${buyerName}</p>
                           <p><b>Email:</b> ${buyerEmail}</p>
                           <p><b>Código Único Gerado:</b> ${paymentDetails.id}</p>
                           <hr>
                           <p><b>Itens:</b></p>
                           <p>${itemsComprados}</p>
                           <p><b>Total: R$ ${paymentDetails.transaction_amount}</b></p>`,
                });
            }
        }
    } catch (error) {
        console.error("Erro no Webhook:", error);
    }
    return { statusCode: 200 }; 
};


// --- NOVA Função Auxiliar para criar o PDF a partir de um template ---
async function createTicketFromTemplate(paymentDetails) {
    // Carrega o caminho para o seu arquivo de template
    const templatePath = path.resolve(process.cwd(), 'templates/ingresso_template.pdf');
    const templateBytes = await fs.readFile(templatePath);

    // Carrega o documento PDF a partir do seu template
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Pega a primeira página do seu PDF
    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize(); // Pega as dimensões da página

    // Define a fonte e o código único
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const uniqueCode = `${paymentDetails.id}`; // O ID do pagamento é nosso código único

    // ===================================================================
    // ✨ A MÁGICA ACONTECE AQUI - AJUSTE A POSIÇÃO (X, Y) ✨
    //
    // Você precisará ajustar os valores de 'x' e 'y' para que o código
    // apareça exatamente no espaço em branco que você deixou no seu design.
    //
    // O ponto (0, 0) é o CANTO INFERIOR ESQUERDO da página.
    // - x: Distância da borda ESQUERDA.
    // - y: Distância da borda INFERIOR.
    //
    // Dica: Comece com um valor e ajuste aos poucos até ficar perfeito.
    // ===================================================================
    page.drawText(uniqueCode, {
        x: 50,          // Exemplo: 50 pontos da borda esquerda
        y: height - 750, // Exemplo: 750 pontos da borda superior (height - y)
        font: font,
        size: 14,
        color: rgb(0, 0, 0), // Cor preta
    });

    // Salva o PDF modificado e retorna os bytes
    return await pdfDoc.save();
}