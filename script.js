document.addEventListener('DOMContentLoaded', function() {
    // --- DADOS ESTÁTICOS (DADOS REAIS) ---
    const sessoes = [
        { id: 'sessao-251003-2030', data: '2025-10-03T20:30:00', precoInteira: 50.00, precoMeia: 25.00, esgotado: false },
        { id: 'sessao-251004-1730', data: '2025-10-04T17:30:00', precoInteira: 50.00, precoMeia: 25.00, esgotado: false },
        { id: 'sessao-251004-2030', data: '2025-10-04T20:30:00', precoInteira: 50.00, precoMeia: 25.00, esgotado: false },
        { id: 'sessao-251005-1730', data: '2025-10-05T17:30:00', precoInteira: 50.00, precoMeia: 25.00, esgotado: false },
        { id: 'sessao-251005-2030', data: '2025-10-05T20:30:00', precoInteira: 50.00, precoMeia: 25.00, esgotado: false },
    ];

    const elenco = [
        { nome: 'Antônia Montemezzo', personagem: 'Juliana', foto: 'https://i.postimg.cc/x8HYSWpL/Ant-nia-Montemezzo.jpg' },
        { nome: 'Evelyn Muller', personagem: 'Luana', foto: 'https://i.postimg.cc/9XqcT7Xz/Evelyn-Muller.jpg' },
        { nome: 'Carolina Ribas', personagem: 'Raquel', foto: 'https://i.postimg.cc/Pxvnmgj0/IMG-0898.jpg' },
        { nome: 'Jessica Nayara', personagem: 'Sofia', foto: 'https://i.postimg.cc/qq8fF2gL/Jessica-Nayara.jpg' },
        { nome: 'Aquiles Amendola', personagem: 'Fernando', foto: 'https://i.postimg.cc/Vksy7rwq/Aquiles-Amendola.jpg' },
        { nome: 'Anthony Braga', personagem: 'Bruno', foto: 'https://i.postimg.cc/SQcwk7NL/IMG-1979.jpg' },
        { nome: 'Pedro Ferraz', personagem: 'Marcelo', foto: 'https://i.postimg.cc/66V1DWYY/Pedro-Ferraz.jpg' },
    ];

    // --- CONFIGURAÇÃO DO MERCADO PAGO ---
    // !!! IMPORTANTE !!! Coloque sua CHAVE PÚBLICA (PUBLIC KEY) aqui. Ela é segura para ficar no frontend.
    // A chave PÚBLICA geralmente começa com "APP_" ou "TEST_" e NÃO contém "-USR-".
    const mp = new MercadoPago('APP_USR-0fc1f9b5-1a9e-41d5-929e-f25aefa4c837');

    // --- ELEMENTOS DO DOM ---
    const modal = document.getElementById('purchase-modal');
    const payButton = document.getElementById('pay-button');
    const paymentSection = document.getElementById('payment-section');

    let selectedSession = null;
    let walletBrickController = null; // Controlador para o botão de pagamento

    // --- FUNÇÃO PARA RENDERIZAR CONTEÚDO DINÂMICO (Mantida como a sua) ---
    function renderContent() {
        // ... (seu código de renderização de eventos e elenco continua aqui, sem alterações) ...
        const eventsContainer = document.getElementById('events-list-container');
        eventsContainer.innerHTML = '';
        sessoes.forEach(sessao => {
            const dataObj = new Date(sessao.data);
            const diaDaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <h3 class="event-title">${diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1)}, ${dataFormatada}</h3>
                <p class="event-date">${horaFormatada}h</p>
                <p class="event-price">A partir de R$ ${sessao.precoMeia.toFixed(2).replace('.',',')}</p>
                <button class="event-button" data-session-id="${sessao.id}" ${sessao.esgotado ? 'disabled' : ''}>
                    ${sessao.esgotado ? 'ESGOTADO' : 'COMPRAR INGRESSO'}
                </button>
            `;
            eventsContainer.appendChild(card);
        });

        const castContainer = document.getElementById('cast-grid-container');
        castContainer.innerHTML = '';
        elenco.forEach(membro => {
            const card = document.createElement('div');
            card.className = 'cast-card';
            card.innerHTML = `
                <img src="${membro.foto}" alt="${membro.nome}" class="cast-photo ${membro.nome === 'Aquiles Amendola' ? 'aquiles' : ''}">
                <h3 class="cast-name">${membro.nome}</h3>
                <p class="cast-character">${membro.personagem}</p>
            `;
            castContainer.appendChild(card);
        });
        
        const gifCard = document.createElement('div');
        gifCard.className = 'cast-card';
        gifCard.innerHTML = `
            <a href="https://postimages.org/" target="_blank">
                <img src="https://i.postimg.cc/g2pMsfv1/original-720d9864401760525b4ddf084f3dc161.gif" alt="TV Retrô GIF" style="width:120px; height:120px; border-radius:10px; border:3px solid var(--neon-pink);">
            </a>
        `;
        castContainer.appendChild(gifCard);
    }

    // --- CONTADOR E PARTÍCULAS (Mantidos como os seus) ---
    // ... (seu código do countdown e partículas continua aqui, sem alterações) ...
    function updateCountdown() {
        const proximaSessao = sessoes.find(s => new Date(s.data) > new Date());
        if (!proximaSessao) return;

        const targetDate = new Date(proximaSessao.data);
        const now = new Date();
        const difference = targetDate - now;

        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        }
    }
    function createParticles() {
        const container = document.getElementById('particles-container');
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            container.appendChild(particle);
        }
    }


    // --- MODAL DE COMPRA E VALIDAÇÃO (Seu código com pequenas melhorias) ---
    const closeBtn = document.getElementById('modal-close-btn');
    const continueBtn = document.getElementById('continue-to-payment');
    const personalDataForm = document.getElementById('personal-data-form');

    function openModal(sessionId) {
        selectedSession = sessoes.find(s => s.id === sessionId);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        updateTotalAmount();
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Limpa e reseta o modal para o estado inicial
        paymentSection.style.display = 'none';
        personalDataForm.style.display = 'block';
        if (document.getElementById('wallet_container')) {
            document.getElementById('wallet_container').innerHTML = '';
        }
        payButton.style.display = 'block';
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });

    continueBtn.addEventListener('click', function() {
        // Validação do formulário...
        const fullName = document.getElementById('full-name');
        const email = document.getElementById('email');
        const qtyInteira = document.getElementById('qty-inteira');
        const qtyMeia = document.getElementById('qty-meia');
        
        let isValid = true;
        [fullName, email].forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = 'red'; isValid = false;
            } else {
                field.style.borderColor = '';
            }
        });

        if (parseInt(qtyInteira.value, 10) === 0 && parseInt(qtyMeia.value, 10) === 0) {
            alert('Você precisa selecionar pelo menos um ingresso.');
            isValid = false;
        }

        if (isValid) {
            personalDataForm.style.display = 'none';
            paymentSection.style.display = 'block';
            payButton.style.display = 'block'; // Mostra o botão para gerar o pagamento
             if (document.getElementById('wallet_container')) {
                document.getElementById('wallet_container').innerHTML = ''; // Limpa o container
            }
        } else {
            alert('Por favor, preencha todos os campos e selecione ao menos um ingresso.');
        }
    });

    // --- CÁLCULO DE PREÇO (Mantido como o seu) ---
    const qtyInteira = document.getElementById('qty-inteira');
    const qtyMeia = document.getElementById('qty-meia');
    const totalAmountDiv = document.getElementById('total-amount');

    function updateTotalAmount() {
        if (!selectedSession) return;
        const total = (qtyInteira.value * selectedSession.precoInteira) + (qtyMeia.value * selectedSession.precoMeia);
        totalAmountDiv.textContent = `R$ ${total.toFixed(2)}`;
    }

    qtyInteira.addEventListener('input', updateTotalAmount);
    qtyMeia.addEventListener('input', updateTotalAmount);
    
    // --- LÓGICA DE PAGAMENTO (CÓDIGO NOVO E ATUALIZADO) ---
    payButton.addEventListener('click', handlePayment);

    async function handlePayment() {
        payButton.disabled = true;
        payButton.textContent = 'CARREGANDO...';

        const qtyInteiraValue = parseInt(qtyInteira.value, 10);
        const qtyMeiaValue = parseInt(qtyMeia.value, 10);
        
        // Monta o objeto com os itens do carrinho
        const items = [];
        if(qtyInteiraValue > 0) {
            items.push({
                title: 'Ingresso Inteira - Próxima Parada: Anos 2000',
                quantity: qtyInteiraValue,
                unit_price: selectedSession.precoInteira
            });
        }
        if(qtyMeiaValue > 0) {
            items.push({
                title: 'Ingresso Meia - Próxima Parada: Anos 2000',
                quantity: qtyMeiaValue,
                unit_price: selectedSession.precoMeia
            });
        }
        
        try {
            // 1. Chama nosso backend para criar a preferência de pagamento
            const response = await fetch('/api/1-create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items,
                    payer: {
                        fullName: document.getElementById('full-name').value,
                        email: document.getElementById('email').value,
                        phone: document.getElementById('phone').value
                    },
                    metadata: { // Dados extras que queremos salvar
                        sessionId: selectedSession.id
                    }
                })
            });

            if (!response.ok) throw new Error('Falha ao criar a preferência de pagamento.');
            
            const preference = await response.json();
            
            // 2. Esconde o botão e renderiza o Checkout do Mercado Pago
            payButton.style.display = 'none';
            renderWalletBrick(preference.preferenceId);

        } catch (error) {
            alert('Erro ao iniciar o pagamento. Tente novamente.');
            console.error(error);
            payButton.disabled = false;
            payButton.textContent = 'Finalizar Compra';
        }
    }

    async function renderWalletBrick(preferenceId) {
        const bricksBuilder = mp.bricks();
        
        // Remove o botão anterior se existir
        if (walletBrickController) {
            walletBrickController.unmount();
        }

        // Cria um novo container para o botão se não existir
        let brickContainer = document.getElementById('wallet_container');
        if (!brickContainer) {
            brickContainer = document.createElement('div');
            brickContainer.id = 'wallet_container';
            paymentSection.appendChild(brickContainer);
        }

        walletBrickController = await bricksBuilder.create('wallet', 'wallet_container', {
            initialization: {
                preferenceId: preferenceId,
            },
            customization: {
                texts: {
                    valueProp: 'smart_option',
                },
            },
        });
    }

    // --- GERADOR DE SCRAP e OUTROS (Seu código, sem alterações) ---
    // ... (seu código do gerador de scrap, event listeners, e inicialização continua aqui) ...
     const scrapButton = document.getElementById('scrap-button');
     const scrapInput = document.getElementById('scrap-input');
     const scrapResult = document.getElementById('scrap-result');
     const scrapLoading = document.getElementById('scrap-loading');

     scrapButton.addEventListener('click', async function() {
        // Esta função de scrap parece depender de uma função de backend que não criamos.
        // Você precisará criá-la em /netlify/functions/generate-scrap.js
        // Por enquanto, a lógica de chamada está aqui.
         const prompt = scrapInput.value.trim();
         if (!prompt) {
             alert('Por favor, digite algo sobre os anos 2000!');
             return;
         }

         scrapLoading.style.display = 'block';
         scrapResult.style.display = 'none';

         try {
             const response = await fetch('/api/generate-scrap', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ prompt: `Crie um scrap nostálgico sobre os anos 2000 baseado em: ${prompt}` })
             });
             const result = await response.json();
             // ...
         } catch(error) {
             console.log("Função de Scrap não implementada.");
         } finally {
            scrapLoading.style.display = 'none';
         }

     });

     document.addEventListener('click', function(e) {
         if (e.target.classList.contains('event-button') && !e.target.disabled) {
             const sessionId = e.target.dataset.sessionId;
             openModal(sessionId);
         }
     });

    function addClickEffect(element) {
        element.addEventListener('click', function() {
            this.classList.add('clicked');
            setTimeout(() => { this.classList.remove('clicked'); }, 300);
        });
    }
     document.querySelectorAll('.action-button, .nav-button, .event-button').forEach(addClickEffect);

     renderContent();
     createParticles();
     updateCountdown();
     setInterval(updateCountdown, 1000);
     
     document.querySelectorAll('a[href^="#"]').forEach(anchor => {
         anchor.addEventListener('click', function (e) {
             e.preventDefault();
             const target = document.querySelector(this.getAttribute('href'));
             if (target) {
                 target.scrollIntoView({ behavior: 'smooth', block: 'start' });
             }
         });
     });

});