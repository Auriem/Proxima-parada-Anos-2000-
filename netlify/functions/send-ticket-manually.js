import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// Lendo as chaves secretas do ambiente Netlify
const resend = new Resend(process.env.RESEND_API_KEY);
const myAdminEmail = process.env.MY_ADMIN_EMAIL;

export const handler = async (event) => {
    try {
        const { buyerInfo, ticketInfo } = JSON.parse(event.body);

        // 1. Gerar um código único para o ingresso
        const uniqueCode = `PP2000-${Date.now().toString(36).toUpperCase()}`;

        // 2. Gerar o PDF a partir do seu template
        const pdfBytes = await createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        // 3. Enviar email para o cliente com o ingresso
        await resend.emails.send({
            from: 'Ingressos Anos 2000 <vendas@seudominio.com>', // Configure seu domínio no Resend
            to: [buyerInfo.email],
            subject: `Seu ingresso para "Próxima Parada: Anos 2000" chegou!`,
            html: `<h1>Obrigado, ${buyerInfo.fullName}!</h1><p>Seu(s) ingresso(s) estão em anexo. Guarde este e-mail, ele é seu comprovante.</p>`,
            attachments: [{ filename: 'Ingresso-Anos-2000.pdf', content: pdfBase64 }],
        });
        
        // 4. Enviar email de notificação para você (administrador)
        const itemsComprados = `Inteiras: ${ticketInfo.qtyInteira}<br>Meias: ${ticketInfo.qtyMeia}`;
        await resend.emails.send({
            from: 'AVISO DE VENDA MANUAL <sistema@seudominio.com>',
            to: [myAdminEmail],
            subject: `Nova Venda (Ação Manual) - ${buyerInfo.fullName}`,
            html: `<h1>Venda Registrada (CONFIRMAR PAGAMENTO)</h1>
                   <p><b>AVISO:</b> Este ingresso foi enviado porque o cliente clicou em "Já paguei". <b>Verifique manualmente no seu painel do Mercado Pago se o pagamento de R$ ${ticketInfo.totalAmount} foi realmente recebido.</b></p>
                   <hr>
                   <p><b>Cliente:</b> ${buyerInfo.fullName}</p>
                   <p><b>Email:</b> ${buyerInfo.email}</p>
                   <p><b>Telefone:</b> ${buyerInfo.phone || 'Não informado'}</p>
                   <p><b>Código Único Gerado:</b> ${uniqueCode}</p>
                   <hr>
                   <p><b>Itens:</b></p>
                   <p>${itemsComprados}</p>
                   <p><b>Total: R$ ${ticketInfo.totalAmount}</b></p>`,
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'E-mails enviados.' }) };

    } catch (error) {
        console.error("Erro no envio manual:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao processar o envio.' }) };
    }
};

async function createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode) {
    const templatePath = path.resolve(process.cwd(), 'templates/ingresso_template.pdf');
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const [page] = pdfDoc.getPages();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const itemsText = `Inteiras: ${ticketInfo.qtyInteira} | Meias: ${ticketInfo.qtyMeia}`;
    
    // Adiciona o código único ao PDF (ajuste a posição X e Y conforme seu template)
    page.drawText(`CODIGO: ${uniqueCode}`, {
        x: 50,
        y: height - 750, // Ajuste esta posição
        font,
        size: 14,
        color: rgb(0, 0, 0),
    });

    // Adiciona o nome do comprador
     page.drawText(buyerInfo.fullName, {
        x: 50,
        y: height - 720, // Ajuste esta posição
        font,
        size: 12,
        color: rgb(0, 0, 0),
    });

    // Adiciona a quantidade de ingressos
    page.drawText(itemsText, {
        x: 50,
        y: height - 700, // Ajuste esta posição
        font,
        size: 12,
        color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
}
