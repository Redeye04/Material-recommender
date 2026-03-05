// Floating n8n chat widget integration
(function () {
    const config = window.N8N_WIDGET_CONFIG || {
        webhookUrl: 'http://localhost:5678/webhook/58c45b0a-08c7-42b7-a402-c7b865917b98/chat',
        route: 'general'
    };

    const widgetButton = document.getElementById('n8n-chat-widget-button');
    const widgetContainer = document.getElementById('n8n-chat-widget-container');
    const widgetClose = document.getElementById('n8n-chat-widget-close');
    const sendButton = document.getElementById('n8n-chat-widget-send');
    const input = document.getElementById('n8n-chat-widget-input');
    const body = document.getElementById('n8n-chat-widget-body');

    if (!widgetButton || !widgetContainer || !sendButton || !input || !body) {
        return;
    }

    function getChatId() {
        let chatId = sessionStorage.getItem('n8nChatId');
        if (!chatId) {
            chatId = 'chat_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('n8nChatId', chatId);
        }
        return chatId;
    }

    function toggleWidget(open) {
        widgetContainer.style.display = open ? 'flex' : 'none';
        widgetButton.style.display = open ? 'none' : 'flex';
        if (open) {
            input.focus();
        }
    }

    function appendMessage(text, isBot) {
        const message = document.createElement('p');
        message.textContent = text;
        if (isBot) {
            message.classList.add('bot-message');
        }
        body.appendChild(message);
        body.scrollTop = body.scrollHeight;
    }

    async function sendMessage() {
        const message = input.value.trim();
        if (!message) return;

        appendMessage(message, false);
        input.value = '';
        sendButton.disabled = true;

        try {
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: getChatId(),
                    message,
                    route: config.route
                })
            });

            const data = await response.json();
            appendMessage(data.output || 'Sorry, I could not understand that.', true);
        } catch (error) {
            console.error('n8n widget error:', error);
            appendMessage('Something went wrong. Please try again.', true);
        } finally {
            sendButton.disabled = false;
            input.focus();
        }
    }

    widgetButton.addEventListener('click', () => toggleWidget(true));
    widgetClose.addEventListener('click', () => toggleWidget(false));
    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
})();
