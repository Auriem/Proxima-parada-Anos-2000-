import { Resend } from 'resend';
import { PDFDocument } from 'pdf-lib';

export const handler = async (event) => {
  try {
    console.log('Função send-ticket-manually chamada');
    console.log('Event body:', event.body);
    
    // ETAPA 1: Verificar as variáveis de ambiente
    const resendApiKey = process.env.RESEND_API_KEY;
    const myAdminEmail = process.env.MY_ADMIN_EMAIL;

    if (!resendApiKey) {
      console.error('RESEND_API_KEY não configurada');
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'CONFIGURAÇÃO FALTANDO: A variável de ambiente RESEND_API_KEY não foi encontrada no Netlify.' }),
      };
    }
    if (!myAdminEmail) {
      console.error('MY_ADMIN_EMAIL não configurada');
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
      console.log('Dados recebidos:', { buyerInfo, ticketInfo });
    } catch (parseError) {
      console.error('Erro ao fazer parse dos dados:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dados inválidos recebidos' }),
      };
    }

    if (!buyerInfo || !buyerInfo.name || !buyerInfo.email) {
      console.error('Dados do comprador incompletos:', buyerInfo);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Dados do comprador incompletos' }),
      };
    }

    const uniqueCode = `PP2000-${Date.now().toString(36).toUpperCase()}`;
    console.log('Código único gerado:', uniqueCode);

    // ETAPA 2: Tentar ler e modificar o arquivo PDF
    let pdfBytes;
    try {
      pdfBytes = await createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode);
      console.log('PDF gerado com sucesso');
    } catch (pdfError) {
      console.error('ERRO NO ARQUIVO PDF:', pdfError);
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
      console.log('Email enviado para o cliente:', buyerInfo.email);
    } catch (emailError) {
      console.error('Erro ao enviar email para o cliente:', emailError);
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
      console.log('Email de notificação enviado para o admin:', myAdminEmail);
    } catch (adminEmailError) {
      console.error('Erro ao enviar email para o admin:', adminEmailError);
      // Não retorna erro aqui pois o email principal já foi enviado
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Ingresso enviado com sucesso!', code: uniqueCode }),
    };
  } catch (error) {
    console.error('Erro geral ao enviar ingresso manualmente:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Erro interno do servidor: ' + error.message }),
    };
  }
};

async function createTicketFromTemplate(buyerInfo, ticketInfo, uniqueCode) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  // Adicione o conteúdo do ingresso aqui
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

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

