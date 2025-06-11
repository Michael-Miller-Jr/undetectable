document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const logContainer = document.getElementById('log');
    const clearBtn = document.getElementById('clearLog');
    const exportBtn = document.getElementById('exportLog');
    const reloadBtn = document.getElementById('reloadPage');

    // Load toggle state
    chrome.storage.local.get(['enabled'], function (result) {
        toggle.checked = result.enabled !== false;
    });

    // Update toggle state
    toggle.addEventListener('change', function (e) {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    // Load and display log entries
    chrome.storage.local.get(['detectionLog'], function (result) {
        const log = result.detectionLog || [];
        logContainer.innerHTML = '';
        if (log.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No detection attempts logged yet.';
            logContainer.appendChild(li);
        } else {
            log.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = entry;
                logContainer.appendChild(li);
            });
        }
    });

    // Clear log
    clearBtn?.addEventListener('click', () => {
        chrome.storage.local.set({ detectionLog: [] }, () => {
            location.reload();
        });
    });

    // Export log
    exportBtn?.addEventListener('click', () => {
        chrome.storage.local.get(['detectionLog'], function (result) {
            const log = result.detectionLog || [];
            const blob = new Blob([log.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'undetectable-detection-log.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    });

    // Reload page
    reloadBtn?.addEventListener('click', () => {
        location.reload();
    });
});
