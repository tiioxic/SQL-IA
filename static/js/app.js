// App State
let currentHistory = [];

// DOM Elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const historyList = document.getElementById('history-list');
const themeBtn = document.getElementById('theme-btn');
const themePopover = document.getElementById('theme-popover');
const newChatBtn = document.getElementById('new-chat-btn');
const importInput = document.getElementById('import-schema-input');

window.toggleThemePopover = function (e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('theme-popover');
    if (popover) {
        popover.classList.toggle('active');
        console.log("Popover status:", popover.classList.contains('active'));
    } else {
        console.error("Theme popover element not found!");
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("App Initialized in Dark Mode");

    // Assurer le Dark Mode par défaut
    if (!document.documentElement.getAttribute('data-theme')) {
        window.setMode('dark');
    }

    loadHistory();

    if (chatInput) {
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    document.addEventListener('click', () => {
        if (themePopover) themePopover.classList.remove('active');
    });

    if (themePopover) {
        themePopover.addEventListener('click', (e) => e.stopPropagation());
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }

    // Sidebar Toggle Logic
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');

            // Change Icon
            const icon = toggleBtn.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.setAttribute('data-lucide', 'panel-left-open');
            } else {
                icon.setAttribute('data-lucide', 'panel-left-close');
            }
            lucide.createIcons();
        });
    }

    if (importInput) {
        importInput.addEventListener('change', async function () {
            if (this.files && this.files[0]) {
                const formData = new FormData();
                formData.append('file', this.files[0]);

                try {
                    addMessage("Importation du nouveau schéma...", 'user');
                    const resp = await fetch('/api/upload_schema', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await resp.json();
                    if (data.status) {
                        addMessage("✅ " + data.status, 'ai');
                    } else {
                        addMessage("❌ Erreur : " + data.error, 'ai');
                    }
                } catch (e) {
                    addMessage("❌ Erreur réseau lors de l'import.", 'ai');
                }
            }
        });
    }
});

// --- Chat Logic ---

async function handleSendMessage() {
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    addMessage(query, 'user');
    const loadingId = addMessage('Génération SQL en cours...', 'ai', true);

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, mode: 'chat' })
        });
        const data = await response.json();

        removeMessage(loadingId);

        if (data.sql === "INVALID_QUERY") {
            addMessage("Désolé, votre demande ne semble pas être une question valide pour la base de données. Veuillez reformuler.", 'ai');
            return;
        }

        if (data.sql && !data.sql.startsWith("Error:")) {
            addAIMessage(query, data.sql);
            // Save to history (on ne sauvegarde que si ça a marché)
            saveToHistory(query, data.sql);
        } else if (data.sql && data.sql.startsWith("Error:")) {
            addMessage(`Erreur : ${data.sql}`, 'ai');
        } else {
            addMessage("Désolé, je n'ai pas pu générer une requête. Vérifiez Ollama.", 'ai');
        }
    } catch (error) {
        removeMessage(loadingId);
        addMessage("Erreur : Impossible de contacter le serveur.", 'ai');
    }
}

function addMessage(text, type, isLoading = false) {
    const id = 'msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.id = id;

    msgDiv.innerHTML = `
        <div class="message-label">${type === 'user' ? 'Vous' : 'SQLIA Assistant'}</div>
        <div class="message-bubble">${text}</div>
    `;

    chatMessages.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function addAIMessage(query, sql) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message ai';

    const escapedSql = escapeHtml(sql);

    msgDiv.innerHTML = `
        <div class="message-label">SQLIA Assistant</div>
        <div class="message-bubble">
            Voici la requête SQL générée :
            <div class="code-block">
                <div class="code-header">
                    <span>ORACLE SQL</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-copy" style="background: rgba(255,255,255,0.1); border:none; color:var(--text-muted); padding: 0.3rem 0.6rem; border-radius: 4px; cursor:pointer; font-size:0.7rem; display:flex; align-items:center; gap:4px;">
                            <i data-lucide="copy" style="width:12px; height:12px;"></i> Copier
                        </button>
                        <button class="btn-edit" style="background: var(--primary-color); border:none; color:white; padding: 0.3rem 0.6rem; border-radius: 4px; cursor:pointer; font-size:0.7rem; display:flex; align-items:center; gap:4px;">
                            <i data-lucide="edit-2" style="width:12px; height:12px;"></i> Modifier
                        </button>
                        <button class="btn-execute" style="background: #10b981; border:none; color:white; padding: 0.3rem 0.6rem; border-radius: 4px; cursor:pointer; font-size:0.7rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                            <i data-lucide="play" style="width:12px; height:12px;"></i> Exécuter
                        </button>
                    </div>
                </div>
                <pre class="code-content" contenteditable="false"><code class="language-sql">${escapedSql}</code></pre>
            </div>
            <div class="results-area"></div>
        </div>
    `;

    chatMessages.appendChild(msgDiv);

    const btnExec = msgDiv.querySelector('.btn-execute');
    const btnEdit = msgDiv.querySelector('.btn-edit');
    const btnCopy = msgDiv.querySelector('.btn-copy');
    const codeBlock = msgDiv.querySelector('.code-content');

    btnExec.addEventListener('click', () => executeSQL(btnExec, codeBlock.innerText));

    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            const oldHtml = btnCopy.innerHTML;
            btnCopy.innerHTML = '<i data-lucide="check" style="width:12px; height:12px;"></i> Copié !';
            lucide.createIcons();
            setTimeout(() => {
                btnCopy.innerHTML = oldHtml;
                lucide.createIcons();
            }, 2000);
        });
    });

    btnEdit.addEventListener('click', () => {
        const isEditable = codeBlock.getAttribute('contenteditable') === 'true';
        if (isEditable) {
            codeBlock.setAttribute('contenteditable', 'false');
            btnEdit.innerHTML = '<i data-lucide="edit-2" style="width:12px; height:12px;"></i> Modifier';
            btnEdit.style.background = 'var(--primary-color)';
            Prism.highlightElement(codeBlock.querySelector('code'));
        } else {
            codeBlock.setAttribute('contenteditable', 'true');
            btnEdit.innerHTML = '<i data-lucide="save" style="width:12px; height:12px;"></i> Sauvegarder';
            btnEdit.style.background = '#10b981';
            codeBlock.focus();
        }
        lucide.createIcons();
    });

    Prism.highlightAll();
    scrollToBottom();
}

async function executeSQL(btn, sql) {
    const resultsArea = btn.closest('.message-bubble').querySelector('.results-area');
    const oldText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '...';

    resultsArea.innerHTML = '<div style="margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">Exécution Oracle...</div>';

    try {
        const response = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const data = await response.json();

        if (data.error) {
            resultsArea.innerHTML = `<div style="margin-top: 1rem; color: #ef4444; background: rgba(239,68,68,0.1); padding: 0.5rem; border-radius: 4px; font-size: 0.8rem;">Erreur : ${data.error}</div>`;
        } else if (data.columns && data.data) {
            renderTable(resultsArea, data.columns, data.data);
        } else {
            resultsArea.innerHTML = `<div style="margin-top: 1rem; color: #10b981; font-size: 0.8rem;">${data.message || 'Succès (Aucune ligne retournée)'}</div>`;
        }
    } catch (error) {
        resultsArea.innerHTML = `<div style="margin-top: 1rem; color: #ef4444; font-size: 0.8rem;">Erreur de connexion.</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = oldText;
    }
}

function renderTable(container, columns, data) {
    if (data.length === 0) {
        container.innerHTML = '<div style="margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">Aucun résultat.</div>';
        return;
    }

    let html = `
        <div class="results-container">
            <table>
                <thead>
                    <tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.slice(0, 50).map(row => `
                        <tr>${row.map(cell => `<td>${cell !== null ? cell : '-'}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${data.length > 50 ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.4rem;">50 premières lignes sur ${data.length}</div>` : ''}
    `;
    container.innerHTML = html;
}

// --- History ---

async function loadHistory() {
    try {
        const resp = await fetch('/api/history');
        const history = await resp.json();
        renderHistory(history);
    } catch (e) { console.error('History failed', e); }
}

function renderHistory(history) {
    if (!historyList) return;
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem;">Aucun historique</div>';
        return;
    }
    historyList.innerHTML = history.map(item => {
        const safeSql = item.sql ? item.sql.replace(/`/g, '\\`') : '';
        const safeQuery = escapeHtml(item.query);
        return `
            <div class="history-item" data-id="${item.id}" data-query="${safeQuery}" data-sql="${safeSql}">
                <div class="history-item-content">
                    <i data-lucide="message-square" style="width:18px; height:18px;"></i>
                    <span>${item.query}</span>
                </div>
                <div class="delete-btn" title="Supprimer">
                    <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();

    historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            loadFromHistory(el.getAttribute('data-query'), el.getAttribute('data-sql'));
        });

        const delBtn = el.querySelector('.delete-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteModal(el.getAttribute('data-id'));
        });
    });
}

function saveToHistory(query, sql) {
    fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sql })
    }).then(() => loadHistory());
}

function loadFromHistory(query, sql) {
    addMessage(query, 'user');
    addAIMessage(query, sql);
}

// --- Modals & Theme ---

let itemToDelete = null;
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

function showDeleteModal(id) {
    itemToDelete = id;
    deleteModal.classList.add('active');
}

window.closeDeleteModal = function () {
    itemToDelete = null;
    deleteModal.classList.remove('active');
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!itemToDelete) return;
        await fetch('/api/history/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: itemToDelete })
        });
        loadHistory();
        closeDeleteModal();
    });
}

window.setMode = function (mode) {
    document.documentElement.setAttribute('data-theme', mode);
}

window.setColor = function (color) {
    document.body.className = `c-${color}`;
}

window.initDatabase = async function () {
    if (!confirm("Voulez-vous vraiment initialiser la base de données ? Cela va créer les tables et vues définies dans init_schema.sql.")) return;

    try {
        const resp = await fetch('/api/init_db', { method: 'POST' });
        const data = await resp.json();
        if (data.status === 'success') {
            alert("✅ " + data.message);
        } else if (data.status === 'partial_success') {
            alert("⚠️ " + data.message + "\n\nQuelques erreurs sont survenues (les tables existent peut-être déjà).");
            console.warn(data.errors);
        } else {
            alert("❌ Erreur : " + data.error);
        }
    } catch (e) {
        alert("❌ Erreur de connexion au serveur.");
    }
}

window.seedDatabase = async function () {
    if (!confirm("Voulez-vous alimenter la base de données avec des données fictives (Faker) ?")) return;

    try {
        const resp = await fetch('/api/seed_db', { method: 'POST' });
        const data = await resp.json();
        if (data.status === 'success') {
            alert("✅ " + data.message);
        } else {
            alert("❌ Erreur : " + data.error);
        }
    } catch (e) {
        alert("❌ Erreur de connexion au serveur.");
    }
}

function scrollToBottom() {
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
