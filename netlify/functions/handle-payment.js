// netlify/functions/handle-payment.js
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const paymentData = JSON.parse(event.body);

  if (paymentData.action === 'payment.updated' && paymentData.data.id) {
    try {
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      const resendApiKey = process.env.RESEND_API_KEY;

      const paymentInfoResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentData.data.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const paymentInfo = await paymentInfoResponse.json();

      if (paymentInfo.status === 'approved') {
        const externalRef = JSON.parse(paymentInfo.external_reference);
        const { nome, email, sessao, qtdInteira, qtdMeia, total } = externalRef;

        const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
        const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
        const ticketCode = `A2K-${timestamp}-${randomPart}`;

        const emailHtml = ` <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h1 style="color: #F81894;">Vc está dentro! ✨</h1>
        <p>Olá, ${nome}!</p>
        <p>Seu pré-cadastro para a peça <strong>Próxima Parada: Anos 2000</strong> foi um sucesso! 🎉</p>
        <p>Aqui estão os detalhes do seu pedido e o seu código de bilhete único. O seu bilhete oficial também está em anexo neste e-mail.</p>
        <div style="background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h2 style="color: #00008B;">Seu Bilhete</h2>
          <p><strong>Sessão:</strong> ${sessao_escolhida}</p>
          <p><strong>Ingressos:</strong> ${ingressos_inteira_final} Inteira(s), ${ingressos_meia_final} Meia(s)</p>
          <p><strong>Valor Total (referência):</strong> R$ ${valor_total_final}</p>
          <p style="font-size: 1.5em; font-weight: bold; color: #F81894; text-align: center; margin: 20px 0; border: 2px dashed #F81894; padding: 10px;">
            CÓDIGO: ${ticketCode}
          </p>
        </div>
        <p style="margin-top: 25px;"><strong>Importante:</strong> Este e-mail confirma o seu bilhete. Se o pagamento ainda não foi efetuado, por favor, realize-o e envie o comprovativo para <a href="mailto:auriemcompany@gmail.com">auriemcompany@gmail.com</a> para validar a sua entrada.</p>
        <p>Nos vemos no teatro!</p>
        <p><em>- Auriem Produções Artísticas</em></p>
      </div>
    `;`; //

        const pdfUrl = `https://proximaparadaanos2000.netlify.app/assets/modelo_ingresso.pdf`;
        const pdfResponse = await fetch(pdfUrl);
        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfArrayBuffer).toString('base64');

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'Próxima Parada 2000 <onboarding@resend.dev>',
            to: [email],
            subject: `<https://proximaparadaanos2000.netlify.app/assets/modelo_ingresso.pdf' border='0' alt='modelo-ingresso'/></a>`,
            html: emailHtml,
            attachments: [{ filename: 'Seu_Ingresso.pdf', content: pdfBase64 }],
          }),
        });
      }
      return { statusCode: 200, body: 'OK' };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }
  return { statusCode: 200, body: 'Not a payment update' };
};
