// DOM Elements
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatMessages = document.getElementById('chat-messages');
const sqlEditor = document.getElementById('sql-editor');
const resultsArea = document.getElementById('results-area');
const resultsCount = document.getElementById('results-count');
const runBtn = document.getElementById('run-btn');
const themePopover = document.getElementById('theme-popover');
const columnStatsArea = document.getElementById('column-stats-area');

// Resize Elements
const chatSidebar = document.getElementById('chat-sidebar');
const resizer = document.getElementById('chat-resizer');

// State
let currentResults = { columns: [], data: [], sortCol: null, sortDir: 1 };

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("IDE Layout Initialized");

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
    if (runBtn) runBtn.addEventListener('click', () => executeSQL(sqlEditor.value));

    // Theme logic
    document.addEventListener('click', () => {
        if (themePopover) themePopover.classList.remove('active');
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) exportMenu.classList.remove('active');
    });
    if (themePopover) themePopover.addEventListener('click', (e) => e.stopPropagation());

    // Sidebar Toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggleBtn.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.setAttribute('data-lucide', 'panel-left-open');
            } else {
                icon.setAttribute('data-lucide', 'panel-left-close');
            }
            lucide.createIcons();
        });
    }

    // --- Resizer Logic ---
    let isResizingX = false;
    let isResizingY = false;
    const editorPane = document.querySelector('.editor-pane');
    const editorResizer = document.getElementById('editor-resizer');

    if (resizer) {
        resizer.addEventListener('mousedown', () => {
            isResizingX = true;
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMoveX);
        });
    }

    if (editorResizer) {
        editorResizer.addEventListener('mousedown', () => {
            isResizingY = true;
            document.body.style.cursor = 'row-resize';
            document.addEventListener('mousemove', handleMouseMoveY);
        });
    }

    document.addEventListener('mouseup', () => {
        isResizingX = false; isResizingY = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMouseMoveX);
        document.removeEventListener('mousemove', handleMouseMoveY);
    });

    function handleMouseMoveX(e) {
        if (!isResizingX) return;
        const width = window.innerWidth - e.clientX;
        if (width >= 250 && width <= window.innerWidth * 0.7) chatSidebar.style.width = `${width}px`;
    }

    function handleMouseMoveY(e) {
        if (!isResizingY) return;
        const container = document.querySelector('.ide-workspace');
        const rect = container.getBoundingClientRect();
        const height = e.clientY - rect.top;
        if (height >= 100 && height <= rect.height - 100) editorPane.style.height = `${height}px`;
    }
});

// --- Tab Switching ---
window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`).classList.add('active');
    document.getElementById(`${tabId}-content`).classList.add('active');
    lucide.createIcons();
};

// --- Chat Logic ---
async function handleSendMessage() {
    const query = chatInput.value.trim();
    if (!query) return;
    chatInput.value = '';
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
            sqlEditor.value = data.sql;
            addChatMessage("Requête générée !", 'ai');
        } else {
            addChatMessage("Désolé, je n'ai pas pu générer cette requête.", 'ai');
        }
    } catch (e) {
        removeChatMessage(loadingId);
        addChatMessage("Erreur de connexion.", 'ai');
    }
}

function addChatMessage(text, type, isLoading = false) {
    const id = 'msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.id = id;
    msgDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeChatMessage(id) { const el = document.getElementById(id); if (el) el.remove(); }

// --- SQL Execution Logic ---
async function executeSQL(sql) {
    if (!sql.trim()) return;
    const oldBtn = runBtn.innerHTML;
    runBtn.disabled = true;
    runBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
    lucide.createIcons();
    resultsArea.innerHTML = '<div class="empty-stats">Exécution...</div>';

    const mTime = document.getElementById('meta-time');
    const mRows = document.getElementById('meta-rows');
    const eTime = document.getElementById('exec-time');

    try {
        const resp = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const data = await resp.json();
        if (data.execution_time) { mTime.style.display = 'flex'; eTime.innerText = `${data.execution_time}ms`; }

        if (data.error) {
            resultsArea.innerHTML = `<div style="color:#ef4444; padding:1rem;">Erreur : ${data.error}</div>`;
            mRows.style.display = 'none';
        } else if (data.columns && data.data) {
            currentResults = { columns: data.columns, data: data.data, sortCol: null, sortDir: 1 };
            renderResultsTable();
            mRows.style.display = 'flex';
            resultsCount.innerText = `${data.data.length} ligne${data.data.length > 1 ? 's' : ''}`;
            if (data.stats) renderStats(data.stats);
        } else {
            resultsArea.innerHTML = `<div style="color:#10b981; padding:1rem;">${data.message || 'Succès'}</div>`;
            mRows.style.display = 'none';
        }
    } catch (e) { resultsArea.innerHTML = '<div style="color:#ef4444; padding:1rem;">Erreur serveur.</div>'; }
    finally { runBtn.disabled = false; runBtn.innerHTML = oldBtn; lucide.createIcons(); }
}

function renderResultsTable() {
    const { columns, data, sortCol, sortDir } = currentResults;
    if (!data.length) { resultsArea.innerHTML = '<div style="padding:1rem;">Aucun résultat.</div>'; return; }

    const colTypes = columns.map((_, i) => {
        const val = data.find(r => r[i] !== null)?.[i];
        if (typeof val === 'number') return { icon: 'hash' };
        if (val && !isNaN(Date.parse(val)) && String(val).length > 10) return { icon: 'calendar' };
        return { icon: 'type' };
    });

    let html = `<table><thead><tr><th style="width:32px; border-right:1px solid var(--border-color);"></th>`;
    columns.forEach((col, i) => {
        const sorted = sortCol === i ? (sortDir === 1 ? 'sort-asc' : 'sort-desc') : '';
        html += `<th onclick="sortResults(${i})" class="${sorted}"><div class="th-content">
            <i data-lucide="${colTypes[i].icon}" class="type-icon"></i><span>${col}</span>
            ${sortCol === i ? `<i data-lucide="${sortDir === 1 ? 'chevron-up' : 'chevron-down'}" style="width:12px;height:12px"></i>` : ''}
        </div></th>`;
    });
    html += '</tr></thead><tbody>';
    html += data.map((row, rIdx) => `<tr><td class="col-copy" onclick="copyRow(${rIdx})"><i data-lucide="copy"></i></td>
        ${row.map(c => `<td ondblclick="copyCell(this)" title="Double-clic pour copier">
            ${c !== null ? String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;") : '<span style="opacity:0.3">NULL</span>'}
        </td>`).join('')}</tr>`).join('');
    html += '</tbody></table>';
    resultsArea.innerHTML = html;
    lucide.createIcons();
}

window.copyRow = (idx) => {
    const text = currentResults.data[idx].join('\t');
    navigator.clipboard.writeText(text).then(() => showToast("Ligne copiée !"));
};

window.copyCell = (td) => {
    const text = td.innerText === 'NULL' ? '' : td.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Cellule copiée !");
        td.style.background = 'var(--primary-soft)';
        setTimeout(() => td.style.background = '', 400);
    });
};

window.toggleExportMenu = (e) => { e.stopPropagation(); document.getElementById('export-menu').classList.toggle('active'); };

window.exportData = (format) => {
    const { columns, data } = currentResults;
    if (!data.length) return;
    let content = '', filename = `export_${Date.now()}`;
    if (format === 'csv') {
        content = [columns.join(','), ...data.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        filename += '.csv';
    } else {
        content = [columns.join('|'), ...data.map(r => r.join('|'))].join('\n');
        filename += '.txt';
    }
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

window.sortResults = (idx) => {
    if (currentResults.sortCol === idx) currentResults.sortDir *= -1;
    else { currentResults.sortCol = idx; currentResults.sortDir = 1; }
    currentResults.data.sort((a, b) => {
        let vA = a[idx], vB = b[idx];
        if (vA === null) return 1; if (vB === null) return -1;
        if (typeof vA === 'string') return vA.localeCompare(vB) * currentResults.sortDir;
        return (vA - vB) * currentResults.sortDir;
    });
    renderResultsTable();
};

function showToast(msg) {
    const t = document.createElement('div'); t.className = 'copy-toast'; t.innerText = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

function renderStats(stats) {
    if (!columnStatsArea || !stats) return;
    columnStatsArea.innerHTML = stats.map(s => `
        <div class="col-stat-card">
            <div class="col-stat-header"><span class="col-name">${s.column}</span><span class="col-type">${s.type}</span></div>
            <div class="stat-body">
                <div class="stat-row"><span>Uniques</span><span class="stat-value">${s.unique_count}</span></div>
                <div class="stat-row"><span>Nuls</span><span class="stat-value">${s.null_count} (${s.null_percentage}%)</span></div>
                ${s.mean ? `<div class="stat-row"><span>Moyenne</span><span class="stat-value">${Math.round(s.mean * 100) / 100}</span></div>` : ''}
                <div class="dist-bar-container">${s.top_values.map(tv => `
                    <div class="dist-item"><div class="dist-label"><span class="dist-val">${tv.value}</span><span>${tv.percentage}%</span></div>
                    <div class="dist-bar-bg"><div class="dist-bar-fill" style="width:${tv.percentage}%"></div></div></div>
                `).join('')}</div>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

// Global actions
window.toggleThemePopover = (e) => { e.stopPropagation(); themePopover.classList.toggle('active'); };
window.setMode = (m) => document.documentElement.setAttribute('data-theme', m);
window.setColor = (c) => document.body.className = `c-${c}`;
window.initDatabase = async () => {
    if (!confirm("Initialiser ?")) return;
    try { const r = await fetch('/api/init_db', { method: 'POST' }); const d = await r.json(); alert(d.message || d.error); } catch (e) { alert("Erreur."); }
};
window.seedDatabase = async () => {
    if (!confirm("Alimenter ?")) return;
    try { const r = await fetch('/api/seed_db', { method: 'POST' }); const d = await r.json(); alert(d.message || d.error); } catch (e) { alert("Erreur."); }
};
