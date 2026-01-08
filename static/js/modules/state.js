export const state = {
    currentResults: { columns: [], data: [], sortCol: null, sortDir: 1 },
    lastOracleError: null,
    historyData: []
};

export const dom = {
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    chatMessages: document.getElementById('chat-messages'),
    sqlEditor: document.getElementById('sql-editor'),
    resultsArea: document.getElementById('results-area'),
    resultsCount: document.getElementById('results-count'),
    runBtn: document.getElementById('run-btn'),
    fixBtn: document.getElementById('fix-btn'),
    themePopover: document.getElementById('theme-popover'),
    columnStatsArea: document.getElementById('column-stats-area'),
    historyList: document.getElementById('history-list'),
    chatSidebar: document.getElementById('chat-sidebar'),
    resizer: document.getElementById('chat-resizer'),
    editorResizer: document.getElementById('editor-resizer'),
    editorPane: document.querySelector('.editor-pane')
};
