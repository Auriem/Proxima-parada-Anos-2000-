import { Resend } from 'resend';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handler = async (event) => {
  try {
    console.log('send-ticket-manually: Função iniciada.');
    console.log('send-ticket-manually: Event body recebido:', event.body);
    
    // ETAPA 1: Verificar as variáveis de ambiente
    const resendApiKey = process.env.RESEND_API_KEY;
    const myAdminEmail = process.env.MY_ADMIN_EMAIL;

    if (!resendApiKey) {
      console.error('send-ticket-manually: RESEND_API_KEY não configurada.');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'CONFIGURAÇÃO FALTANDO: A variável de ambiente RESEND_API_KEY não foi encontrada no Netlify.' }),
      };
    }
    if (!myAdminEmail) {
      console.error('send-ticket-manually: MY_ADMIN_EMAIL não configurada.');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'CONFIGURAÇÃO FALTANDO: A variável de ambiente MY_ADMIN_EMAIL não foi encontrada no Netlify.' }),
      };
    }

    const resend = new Resend(resendApiKey);
    
    // Parse dos dados recebidos
    let buyerInfo, ticketInfo;
    try {
      const data = JSON.parse(event.body);
      buyerInfo = data.buyerInfo;
      ticketInfo = data.ticketInfo;
      console.log('send-ticket-manually: Dados recebidos:', { buyerInfo, ticketInfo });
    } catch (parseError) {
      console.error('send-ticket-manually: Erro ao fazer parse dos dados:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dados inválidos recebidos.' }),
      };
    }

    if (!buyerInfo || !buyerInfo.name || !buyerInfo.email) {
      console.error('send-ticket-manually: Dados do comprador incompletos:', buyerInfo);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dados do comprador incompletos.' }),
      };
    }

    const uniqueCode = `PP2000-${Date.now().toString(36).toUpperCase()}`;
    console.log('send-ticket-manually: Código único gerado:', uniqueCode);

    // ETAPA 2: Tentar ler e modificar o arquivo PDF
    let pdfBytes;
    try {
      pdfBytes = await createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode);
      console.log('send-ticket-manually: PDF gerado com sucesso.');
    } catch (pdfError) {
      console.error('send-ticket-manually: ERRO NO ARQUIVO PDF:', pdfError);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Erro ao gerar o ingresso em PDF: ' + pdfError.message }),
      };
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

    // ETAPA 3: Enviar o e-mail com o ingresso para o cliente
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: buyerInfo.email,
        subject: 'Seu ingresso para Próxima Parada Anos 2000!',
        html: `<p>Olá ${buyerInfo.name},</p><p>Seu ingresso está anexado a este e-mail.</p><p>Código do ingresso: ${uniqueCode}</p><p>Atenciosamente,</p><p>Equipe Próxima Parada Anos 2000</p>`,
        attachments: [
          {
            filename: 'ingresso.pdf',
            content: pdfBase64,
          },
        ],
      });
      console.log('send-ticket-manually: Email enviado para o cliente:', buyerInfo.email);
    } catch (emailError) {
      console.error('send-ticket-manually: Erro ao enviar email para o cliente:', emailError);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Erro ao enviar email para o cliente: ' + emailError.message }),
      };
    }

    // ETAPA 4: Enviar o e-mail de notificação para o administrador
    try {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: myAdminEmail,
        subject: 'Novo ingresso enviado manualmente!',
        html: `<p>Um novo ingresso foi enviado manualmente para ${buyerInfo.name} (${buyerInfo.email}).</p><p>Código único: ${uniqueCode}</p><p>Telefone: ${buyerInfo.phone || 'Não informado'}</p>`,
      });
      console.log('send-ticket-manually: Email de notificação enviado para o admin:', myAdminEmail);
    } catch (adminEmailError) {
      console.error('send-ticket-manually: Erro ao enviar email para o admin:', adminEmailError);
      // Não retorna erro aqui pois o email principal já foi enviado
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Ingresso enviado com sucesso!', code: uniqueCode }),
    };
  } catch (error) {
    console.error('send-ticket-manually: Erro geral ao enviar ingresso manualmente:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Erro interno do servidor: ' + error.message }),
    };
  }
};

async function createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode) {
  const templatePath = path.join(__dirname, 'ingresso_template.pdf');
  let existingPdfBytes;
  try {
    existingPdfBytes = await fs.readFile(templatePath);
    console.log('send-ticket-manually: Template PDF lido com sucesso.');
  } catch (readError) {
    console.error('send-ticket-manually: Erro ao ler o template PDF:', readError);
    // Se o template não for encontrado, cria um PDF do zero como fallback
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(`Ingresso para Próxima Parada Anos 2000`, { x: 50, y: 700 });
    page.drawText(`Nome: ${buyerInfo.name}`, { x: 50, y: 680 });
    page.drawText(`Email: ${buyerInfo.email}`, { x: 50, y: 660 });
    page.drawText(`Telefone: ${buyerInfo.phone || 'Não informado'}`, { x: 50, y: 640 });
    page.drawText(`Código Único: ${uniqueCode}`, { x: 50, y: 620 });
    page.drawText(`Data: ${new Date().toLocaleDateString()}`, { x: 50, y: 600 });
    
    if (ticketInfo) {
      page.drawText(`Sessão: ${ticketInfo.session || 'Não especificada'}`, { x: 50, y: 580 });
      page.drawText(`Valor: R$ ${ticketInfo.price || '0,00'}`, { x: 50, y: 560 });
    }
    return await pdfDoc.save();
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0]; // Assume que o template tem pelo menos uma página

  // Adicione o conteúdo do ingresso aqui, sobre o template
  firstPage.drawText(`Nome: ${buyerInfo.name}`, { x: 50, y: 680, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Email: ${buyerInfo.email}`, { x: 50, y: 660, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Telefone: ${buyerInfo.phone || 'Não informado'}`, { x: 50, y: 640, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Código Único: ${uniqueCode}`, { x: 50, y: 620, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  firstPage.drawText(`Data: ${new Date().toLocaleDateString()}`, { x: 50, y: 600, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  
  if (ticketInfo) {
    firstPage.drawText(`Sessão: ${ticketInfo.session || 'Não especificada'}`, { x: 50, y: 580, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
    firstPage.drawText(`Valor: R$ ${ticketInfo.price || '0,00'}`, { x: 50, y: 560, font: await pdfDoc.embedFont(StandardFonts.Helvetica) });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
