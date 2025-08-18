import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lendo as chaves secretas do ambiente Netlify
const resend = new Resend(process.env.RESEND_API_KEY);
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new Payment(mpClient);
const myAdminEmail = process.env.MY_ADMIN_EMAIL;

export const handler = async (event) => {
  try {
    console.log('Webhook recebido:', event.body);
    
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY não configurada');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Configuração de email não encontrada' }),
      };
    }
    
    if (!process.env.MY_ADMIN_EMAIL) {
      console.error('MY_ADMIN_EMAIL não configurada');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Email do administrador não configurado' }),
      };
    }

    const data = JSON.parse(event.body);
    console.log('Dados do webhook:', data);

    if (data.type === 'payment') {
      console.log('Processando pagamento ID:', data.data.id);
      const paymentDetails = await payment.get({ id: data.data.id });
      console.log('Detalhes do pagamento:', paymentDetails);

      if (paymentDetails.status === 'approved') {
        const { metadata } = paymentDetails;
        const buyerName = metadata.buyer_name;
        const buyerEmail = metadata.buyer_email;

        console.log('Pagamento aprovado para:', buyerName, buyerEmail);

        // 1. Gerar o PDF a partir do seu template
        const pdfBytes = await createTicketFromTemplate(paymentDetails, buyerName, buyerEmail);
        const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

        // 2. Enviar o e-mail com o ingresso para o cliente
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: buyerEmail,
          subject: 'Seu ingresso para Próxima Parada Anos 2000!',
          html: `<p>Olá ${buyerName},</p><p>Seu ingresso está anexado a este e-mail.</p><p>Atenciosamente,</p><p>Equipe Próxima Parada Anos 2000</p>`,
          attachments: [
            {
              filename: 'ingresso.pdf',
              content: pdfBase64,
            },
          ],
        });

        // 3. Enviar o e-mail de notificação para o administrador
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: myAdminEmail,
          subject: 'Novo ingresso vendido!',
          html: `<p>Um novo ingresso foi vendido para ${buyerName} (${buyerEmail}).</p><p>Detalhes do pagamento: ${JSON.stringify(paymentDetails)}</p>`,
        });

        console.log('Emails enviados com sucesso');
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Ingresso enviado com sucesso!' }),
        };
      } else {
        console.log('Pagamento não aprovado, status:', paymentDetails.status);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Evento não processado.' }),
    };
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Erro interno do servidor: ' + error.message }),
    };
  }
};

async function createTicketFromTemplate(paymentDetails, buyerName, buyerEmail) {
  const templatePath = path.join(__dirname, 'ingresso_template.pdf');
  let existingPdfBytes;
  try {
    existingPdfBytes = await fs.readFile(templatePath);
    console.log('Template PDF lido com sucesso.');
  } catch (readError) {
    console.error('Erro ao ler o template PDF:', readError);
    // Se o template não for encontrado, cria um PDF do zero como fallback
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(`Ingresso para Próxima Parada Anos 2000`, { x: 50, y: 700 });
    page.drawText(`Nome: ${buyerName}`, { x: 50, y: 680 });
    page.drawText(`Email: ${buyerEmail}`, { x: 50, y: 660 });
    page.drawText(`Valor: R$ ${paymentDetails.transaction_amount}`, { x: 50, y: 640 });
    page.drawText(`Data: ${new Date().toLocaleDateString()}`, { x: 50, y: 620 });
    page.drawText(`ID do Pagamento: ${paymentDetails.id}`, { x: 50, y: 600 });
    return await pdfDoc.save();
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0]; // Assume que o template tem pelo menos uma página

  // Adicione o conteúdo do ingresso aqui, sobre o template
  firstPage.drawText(`Nome: ${buyerName}`, { x: 50, y: 680, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Email: ${buyerEmail}`, { x: 50, y: 660, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Valor: R$ ${paymentDetails.transaction_amount}`, { x: 50, y: 640, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Data: ${new Date().toLocaleDateString()}`, { x: 50, y: 620, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`ID do Pagamento: ${paymentDetails.id}`, { x: 50, y: 600, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
