import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export const handler = async (event) => {
    try {
        // ETAPA 1: Verificar as variáveis de ambiente
        const resendApiKey = process.env.RESEND_API_KEY;
        const myAdminEmail = process.env.MY_ADMIN_EMAIL;

        if (!resendApiKey) {
            throw new Error('CONFIGURAÇÃO FALTANDO: A variável de ambiente RESEND_API_KEY não foi encontrada no Netlify.');
        }
        if (!myAdminEmail) {
            throw new Error('CONFIGURAÇÃO FALTANDO: A variável de ambiente MY_ADMIN_EMAIL não foi encontrada no Netlify.');
        }

        const resend = new Resend(resendApiKey);
        const { buyerInfo, ticketInfo } = JSON.parse(event.body);
        const uniqueCode = `PP2000-${Date.now().toString(36).toUpperCase()}`;

        // ETAPA 2: Tentar ler e modificar o arquivo PDF
        let pdfBytes;
        try {
            pdfBytes = await createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode);
        } catch (pdfError) {
            throw new Error(`ERRO NO ARQUIVO PDF: Não foi possível ler ou modificar o template. Verifique se o caminho 'templates/ingresso_template.pdf' está correto no GitHub. Detalhe: ${pdfError.message}`);
        }
        
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        // ETAPA 3: Tentar enviar o e-mail para o cliente
        try {
            await resend.emails.send({
                from: 'Ingressos <vendas@proximaparadaanos2000.online>',
                to: [buyerInfo.email],
                subject: `Seu ingresso para "Próxima Parada: Anos 2000" chegou!`,
                html: `<h1>Obrigado, ${buyerInfo.fullName}!</h1><p>Seu(s) ingresso(s) estão em anexo. Guarde este e-mail, ele é seu comprovante.</p>`,
                attachments: [{ filename: 'Ingresso-Anos-2000.pdf', content: pdfBase64 }],
            });
        } catch (clientEmailError) {
            throw new Error(`ERRO NO ENVIO (CLIENTE): O serviço de e-mail (Resend) recusou o envio. Verifique se o domínio 'proximaparadaanos2000.online' está verificado no Resend. Detalhe da API: ${clientEmailError.message}`);
        }
        
        // ETAPA 4: Tentar enviar o e-mail de notificação para o administrador
        try {
            const itemsComprados = `Inteiras: ${ticketInfo.qtyInteira}<br>Meias: ${ticketInfo.qtyMeia}`;
            await resend.emails.send({
                from: 'AVISO DE VENDA MANUAL <sistema@proximaparadaanos2000.online>',
                to: [myAdminEmail],
                subject: `Nova Venda (Ação Manual) - ${buyerInfo.fullName}`,
                html: `<h1>Venda Registrada (CONFIRMAR PAGAMENTO)</h1><p><b>AVISO:</b> Este ingresso foi enviado. <b>Verifique manualmente se o pagamento de R$ ${ticketInfo.totalAmount} foi recebido.</b></p><hr><p><b>Cliente:</b> ${buyerInfo.fullName}</p><p><b>Email:</b> ${buyerInfo.email}</p><p><b>Telefone:</b> ${buyerInfo.phone || 'Não informado'}</p><p><b>Código Único Gerado:</b> ${uniqueCode}</p><hr><p><b>Itens:</b></p><p>${itemsComprados}</p><p><b>Total: R$ ${ticketInfo.totalAmount}</b></p>`,
            });
        } catch (adminEmailError) {
            // Se este e-mail falhar, não retornamos um erro para o cliente, pois ele já recebeu o ingresso.
            console.error("AVISO: O e-mail para o cliente foi enviado, mas falhou ao notificar o administrador.", adminEmailError);
        }

        return { statusCode: 200, body: JSON.stringify({ message: 'E-mails enviados.' }) };

    } catch (error) {
        console.error("ERRO FINAL CAPTURADO:", error.message);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: 'Falha ao processar o envio do ingresso.',
                details: error.message, // A mensagem de erro exata que criamos!
            }) 
        };
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
    
    page.drawText(`CODIGO: ${uniqueCode}`, { x: 50, y: height - 750, font, size: 14, color: rgb(0, 0, 0) });
    page.drawText(buyerInfo.fullName, { x: 50, y: height - 720, font, size: 12, color: rgb(0, 0, 0) });
    page.drawText(itemsText, { x: 50, y: height - 700, font, size: 12, color: rgb(0, 0, 0) });

    return await pdfDoc.save();
                                       }
