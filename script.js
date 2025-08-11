document.addEventListener('DOMContentLoaded', () => {
    // Cole sua CHAVE PÚBLICA do Mercado Pago aqui. Ela é segura para ficar no frontend.
    const mercadoPagoPublicKey = "APP_USR-0fc1f9b5-1a9e-41d5-929e-f25aefa4c837"; 
    const mp = new MercadoPago(mercadoPagoPublicKey);

    const buyButton = document.getElementById('buy-button');
    const errorMessage = document.getElementById('error-message');

    buyButton.addEventListener('click', async () => {
        const buyerName = document.getElementById('buyer-name').value;
        const buyerEmail = document.getElementById('buyer-email').value;

        if (!buyerName || !buyerEmail) {
            errorMessage.textContent = 'Por favor, preencha seu nome e e-mail.';
            return;
        }

        buyButton.disabled = true;
        buyButton.textContent = 'Aguarde...';
        errorMessage.textContent = '';

        try {
            // 1. Chamar nosso backend para criar a preferência de pagamento
            const response = await fetch('/api/1-create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: 'Ingresso: Uma Noite Estrelada',
                    price: 50.00,
                    buyerName: buyerName,
                    buyerEmail: buyerEmail
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao criar a preferência de pagamento.');
            }

            const preference = await response.json();
            
            // 2. Usar o ID da preferência para renderizar o botão de pagamento
            createCheckoutButton(preference.preferenceId);
            buyButton.style.display = 'none'; // Esconde o botão original

        } catch (error) {
            errorMessage.textContent = 'Ocorreu um erro. Tente novamente.';
            console.error(error);
            buyButton.disabled = false;
            buyButton.textContent = 'Comprar Ingresso';
        }
    });

    function createCheckoutButton(preferenceId) {
        const bricksBuilder = mp.bricks();
        bricksBuilder.create("wallet", "wallet_container", {
            initialization: {
                preferenceId: preferenceId,
            },
            customization: {
                texts: { valueProp: 'smart_option' }
            }
        });
    }
});