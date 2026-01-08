import { dom } from './state.js';
import { switchTab } from './utils.js';
import { saveToHistory } from './history.js';

export async function handleSendMessage() {
    const query = dom.chatInput.value.trim();
    if (!query) return;
    dom.chatInput.value = '';
    addChatMessage(query, 'user');
    switchTab('ai');
    const loadingId = addChatMessage('Génération du SQL...', 'ai', true);

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        removeChatMessage(loadingId);
        if (data.sql && !data.sql.startsWith("Error:") && data.sql !== "INVALID_QUERY") {
            dom.sqlEditor.value = data.sql;
            addChatMessage(data.explanation || "Requête générée !", 'ai');
            saveToHistory(query, data.sql);
        } else {
            addChatMessage("Désolé, je n'ai pas pu générer cette requête.", 'ai');
        }
    } catch (e) {
        removeChatMessage(loadingId);
        addChatMessage("Erreur de connexion.", 'ai');
    }
}

export function addChatMessage(text, type, isLoading = false) {
    const id = 'msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.id = id;
    msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
    dom.chatMessages.appendChild(msgDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    return id;
}

export function removeChatMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}
