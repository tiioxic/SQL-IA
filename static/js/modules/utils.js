export function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'copy-toast';
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Safety check in case elements don't exist
    const btn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`) || document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    const content = document.getElementById(`${tabId}-content`);
    if (content) content.classList.add('active');

    if (window.lucide) window.lucide.createIcons();
}

export function toggleThemePopover(e) {
    e.stopPropagation();
    const popover = document.getElementById('theme-popover');
    if (popover) popover.classList.toggle('active');
}

export function toggleExportMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('export-menu');
    if (menu) menu.classList.toggle('active');
}
