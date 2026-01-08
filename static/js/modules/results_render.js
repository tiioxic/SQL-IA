import { state, dom } from './state.js';
import { showToast } from './utils.js';

export function renderResultsTable() {
    const { columns, data, sortCol, sortDir } = state.currentResults;
    if (!data.length) {
        dom.resultsArea.innerHTML = '<div style="padding:1rem;">Aucun résultat.</div>';
        return;
    }

    const colTypes = columns.map((_, i) => {
        const val = data.find(r => r[i] !== null)?.[i];
        if (typeof val === 'number') return { icon: 'hash' };
        if (val && !isNaN(Date.parse(val)) && String(val).length > 10) return { icon: 'calendar' };
        return { icon: 'type' };
    });

    let html = `<table><thead><tr><th class="col-copy-header"></th>`;
    columns.forEach((col, i) => {
        const sorted = sortCol === i ? (sortDir === 1 ? 'sort-asc' : 'sort-desc') : '';
        // Note: added data-idx for cleaner event delegation if needed, but keeping onclick for now via global exposure in main
        html += `<th onclick="window.sortResults(${i})" class="${sorted}"><div class="th-content">
            <i data-lucide="${colTypes[i].icon}" class="type-icon"></i><span>${col}</span>
            ${sortCol === i ? `<i data-lucide="${sortDir === 1 ? 'chevron-up' : 'chevron-down'}" style="width:12px;height:12px"></i>` : ''}
        </div></th>`;
    });
    html += '</tr></thead><tbody>';
    html += data.map((row, rIdx) => `<tr><td class="col-copy" onclick="window.copyRow(${rIdx})"><i data-lucide="copy"></i></td>
        ${row.map(c => `<td ondblclick="window.copyCell(this)" title="Double-clic pour copier">
            ${c !== null ? String(c).replace(/&/g, "&amp;").replace(/</g, "&lt;") : '<span style="opacity:0.3">NULL</span>'}
        </td>`).join('')}</tr>`).join('');
    html += '</tbody></table>';
    dom.resultsArea.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
}

export function renderStats(stats) {
    if (!dom.columnStatsArea || !stats) return;
    dom.columnStatsArea.innerHTML = stats.map(s => `
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
    if (window.lucide) window.lucide.createIcons();
}

export function copyRow(idx) {
    const text = state.currentResults.data[idx].join('\t');
    navigator.clipboard.writeText(text).then(() => showToast("Ligne copiée !"));
}

export function copyCell(td) {
    const text = td.innerText === 'NULL' ? '' : td.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Cellule copiée !");
        td.style.background = 'var(--primary-soft)';
        setTimeout(() => td.style.background = '', 400);
    });
}

export function sortResults(idx) {
    if (state.currentResults.sortCol === idx) state.currentResults.sortDir *= -1;
    else { state.currentResults.sortCol = idx; state.currentResults.sortDir = 1; }

    state.currentResults.data.sort((a, b) => {
        let vA = a[idx], vB = b[idx];
        if (vA === null) return 1; if (vB === null) return -1;
        if (typeof vA === 'string') return vA.localeCompare(vB) * state.currentResults.sortDir;
        return (vA - vB) * state.currentResults.sortDir;
    });
    renderResultsTable();
}

export function exportData(format) {
    const { columns, data } = state.currentResults;
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
}
