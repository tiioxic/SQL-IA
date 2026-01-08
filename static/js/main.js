import { dom } from './modules/state.js';
import { loadHistory, loadToEditor, openHistoryModal, closeHistoryModal, copyModalSQL } from './modules/history.js';
import { handleSendMessage } from './modules/chat.js';
import { executeSQL, fixSQL, initDatabase, seedDatabase } from './modules/editor_actions.js';
import { toggleThemePopover, toggleExportMenu, switchTab } from './modules/utils.js';
import { copyRow, copyCell, exportData, sortResults } from './modules/results_render.js';

// --- Global Exports for HTML event handlers ---
window.switchTab = switchTab;
window.handleSendMessage = handleSendMessage;
window.fixSQL = fixSQL;
window.executeSQL = (sql) => executeSQL(sql);
window.loadToEditor = loadToEditor;
window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = closeHistoryModal;
window.copyModalSQL = copyModalSQL;
window.copyRow = copyRow;
window.copyCell = copyCell;
window.exportData = exportData;
window.sortResults = sortResults;
window.toggleExportMenu = toggleExportMenu;
window.toggleThemePopover = toggleThemePopover;
window.setMode = (m) => document.documentElement.setAttribute('data-theme', m);
window.setColor = (c) => document.body.className = `c-${c}`;
window.initDatabase = initDatabase;
window.seedDatabase = seedDatabase;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("IDE Layout Initialized (Modular)");
    loadHistory();

    if (dom.chatInput) {
        dom.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (dom.sendBtn) dom.sendBtn.addEventListener('click', handleSendMessage);
    if (dom.runBtn) dom.runBtn.addEventListener('click', () => executeSQL(dom.sqlEditor.value));
    if (dom.fixBtn) dom.fixBtn.addEventListener('click', fixSQL);

    // Theme logic
    document.addEventListener('click', () => {
        if (dom.themePopover) dom.themePopover.classList.remove('active');
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) exportMenu.classList.remove('active');
    });
    if (dom.themePopover) dom.themePopover.addEventListener('click', (e) => e.stopPropagation());

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
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // --- Resizer Logic ---
    let isResizingX = false;
    let isResizingY = false;

    if (dom.resizer) {
        dom.resizer.addEventListener('mousedown', () => {
            isResizingX = true;
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMoveX);
        });
    }

    if (dom.editorResizer) {
        dom.editorResizer.addEventListener('mousedown', () => {
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
        // Limit width to min 250 and max 70% of screen
        if (width >= 250 && width <= window.innerWidth * 0.7) {
            dom.chatSidebar.style.width = `${width}px`;
        }
    }

    function handleMouseMoveY(e) {
        if (!isResizingY) return;
        const container = document.querySelector('.ide-workspace');
        const rect = container.getBoundingClientRect();
        const height = e.clientY - rect.top;
        if (height >= 100 && height <= rect.height - 100) {
            dom.editorPane.style.height = `${height}px`;
        }
    }

    if (window.lucide) window.lucide.createIcons();
});
