import { state, dom } from './state.js';
import { showToast } from './utils.js';

export async function loadHistory() {
    try {
        const resp = await fetch('/api/history');
        const data = await resp.json();
        state.historyData = data; // Update state directly
        renderHistory(data);
    } catch (e) { console.error('History failed', e); }
}

export function renderHistory(history) {
    if (!dom.historyList) return;
    dom.historyList.innerHTML = history.map((item, idx) => `
        <div class="history-item">
            <div class="history-item-content" onclick="window.loadToEditor(\`${item.sql.replace(/`/g, "\\`").replace(/\n/g, "\\n")}\`)">
                <i data-lucide="terminal" style="width:14px; height:14px;"></i>
                <span>${item.query}</span>
            </div>
            <button class="history-details-btn" onclick="window.openHistoryModal(event, ${idx})">
                <i data-lucide="more-horizontal"></i>
            </button>
        </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons();
}

export function saveToHistory(query, sql) {
    fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sql })
    }).then(() => loadHistory());
}

export function loadToEditor(sql) {
    dom.sqlEditor.value = sql;
    showToast("Requête chargée");
}

export function openHistoryModal(e, idx) {
    e.stopPropagation();
    const item = state.historyData[idx];
    if (!item) return;

    const elContent = document.getElementById('modal-sql-content');
    if (elContent) elContent.innerText = item.sql;

    const dt = new Date(item.timestamp);
    const elDate = document.getElementById('modal-date');
    if (elDate) elDate.innerText = dt.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const elTime = document.getElementById('modal-time-detail');
    if (elTime) elTime.innerText = dt.toLocaleTimeString('fr-FR');

    const modal = document.getElementById('history-modal');
    if (modal) modal.classList.add('active');
}

export function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    if (modal) modal.classList.remove('active');
}

export function copyModalSQL() {
    const sql = document.getElementById('modal-sql-content').innerText;
    navigator.clipboard.writeText(sql).then(() => {
        showToast("SQL copié !");
    });
}
