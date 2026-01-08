import { state, dom } from './state.js';
import { renderResultsTable, renderStats } from './results_render.js';
import { saveToHistory } from './history.js';
import { addChatMessage } from './chat.js';
import { showToast } from './utils.js';

export async function executeSQL(sql) {
    if (!sql.trim()) return;

    // --- VALIDATION SÉCURITÉ ---
    const forbidden = ["DROP", "DELETE", "TRUNCATE", "UPDATE", "ALTER", "CREATE", "GRANT", "REVOKE", "INSERT"];
    const sqlUpper = sql.toUpperCase();
    for (const kw of forbidden) {
        if (new RegExp(`\\b${kw}\\b`).test(sqlUpper)) {
            dom.resultsArea.innerHTML = `<div style="color:#ef4444; padding:1rem; border:1px solid #ef4444; border-radius:8px; background:rgba(239, 68, 68, 0.05);">
                <strong>Sécurité :</strong> L'instruction <code>${kw}</code> est bloquée. Cet éditeur est configuré en mode consultation uniquement.
            </div>`;
            state.lastOracleError = null;
            // fixBtn always visible but logic cleans error state
            return;
        }
    }

    const oldBtn = dom.runBtn.innerHTML;
    dom.runBtn.disabled = true;
    dom.runBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>';
    if (window.lucide) window.lucide.createIcons();
    dom.resultsArea.innerHTML = '<div class="empty-stats">Exécution...</div>';

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
        if (data.execution_time) {
            if (mTime) mTime.style.display = 'flex';
            if (eTime) eTime.innerText = `${data.execution_time}ms`;
        }

        if (data.error) {
            dom.resultsArea.innerHTML = `<div style="color:#ef4444; padding:1rem;">Erreur : ${data.error}</div>`;
            if (mRows) mRows.style.display = 'none';
            state.lastOracleError = data.error;
        } else if (data.columns && data.data) {
            state.currentResults.columns = data.columns;
            state.currentResults.data = data.data;
            state.currentResults.sortCol = null;
            state.currentResults.sortDir = 1;

            renderResultsTable();
            if (mRows) mRows.style.display = 'flex';
            if (dom.resultsCount) dom.resultsCount.innerText = `${data.data.length} ligne${data.data.length > 1 ? 's' : ''}`;
            if (data.stats) renderStats(data.stats);

            saveToHistory(sql.substring(0, 30) + (sql.length > 30 ? '...' : ''), sql);
            state.lastOracleError = null;
        } else {
            dom.resultsArea.innerHTML = `<div style="color:#10b981; padding:1rem;">${data.message || 'Succès'}</div>`;
            if (mRows) mRows.style.display = 'none';
            state.lastOracleError = null;
        }
    } catch (e) {
        dom.resultsArea.innerHTML = '<div style="color:#ef4444; padding:1rem;">Erreur serveur.</div>';
        state.lastOracleError = e.message || 'Erreur serveur.';
    }
    finally {
        dom.runBtn.disabled = false;
        dom.runBtn.innerHTML = oldBtn;
        if (window.lucide) window.lucide.createIcons();
    }
}

export async function fixSQL() {
    const sql = dom.sqlEditor.value.trim();
    if (!sql) {
        showToast("Aucune requête à corriger.");
        return;
    }
    // CHANGED: If no error detected, prompt user or send generic request
    if (!state.lastOracleError) {
        // Fallback: Si pas d'erreur Oracle capturée, on peut essayer d'envoyer la dernière erreur visible (si on parsait le DOM)
        // Mais ici, on va supposer que l'utilisateur veut optimiser ou vérifier
        showToast("Pas d'erreur récente détectée. (Exécutez d'abord)");
        return;
    }

    const oldBtn = dom.fixBtn.innerHTML;
    dom.fixBtn.disabled = true;
    dom.fixBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Correction...';
    if (window.lucide) window.lucide.createIcons();

    try {
        const response = await fetch('/api/fix_sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, error: state.lastOracleError })
        });
        const data = await response.json();
        if (data.fixed_sql) {
            dom.sqlEditor.value = data.fixed_sql;
            addChatMessage(data.explanation || "Requête corrigée par l'IA.", 'ai');
            state.lastOracleError = null;
        } else {
            addChatMessage("Désolé, je n'ai pas pu corriger cette requête.", 'ai');
        }
    } catch (e) {
        addChatMessage("Erreur lors de la correction.", 'ai');
    } finally {
        dom.fixBtn.disabled = false;
        dom.fixBtn.innerHTML = oldBtn;
        if (window.lucide) window.lucide.createIcons();
    }
}

export async function initDatabase() {
    if (!confirm("Initialiser ?")) return;
    try { const r = await fetch('/api/init_db', { method: 'POST' }); const d = await r.json(); alert(d.message || d.error); } catch (e) { alert("Erreur."); }
}

export async function seedDatabase() {
    if (!confirm("Alimenter ?")) return;
    try { const r = await fetch('/api/seed_db', { method: 'POST' }); const d = await r.json(); alert(d.message || d.error); } catch (e) { alert("Erreur."); }
}
