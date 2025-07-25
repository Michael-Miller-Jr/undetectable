document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const logContainer = document.getElementById('log');
    const clearBtn = document.getElementById('clearLog');
    const exportBtn = document.getElementById('exportLog');
    const reloadBtn = document.getElementById('reloadPage');
    const showAllToggle = document.getElementById('showAllToggle');
    const customDivsInput = document.getElementById('customClasses');
    const customIdsInput = document.getElementById('customIds');
    const saveCustomBtn = document.getElementById('saveCustomSelectors');
    const saveStatus = document.getElementById('customSaveStatus');
    const darkToggle = document.getElementById('darkModeToggle');

    // Load toggle state
    chrome.storage.local.get(['enabled', 'darkMode'], function (result) {
        toggle.checked = result.enabled !== false;
        const isDark = result.darkMode === true;
        if (darkToggle) {
            darkToggle.checked = isDark;
        }
        document.body.classList.toggle('dark-mode', isDark);
    });

    // Update toggle state
    toggle.addEventListener('change', function (e) {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    // Save dark mode toggle state
    if (darkToggle) {
        darkToggle.addEventListener('change', function () {
            const isDark = this.checked;
            chrome.storage.local.set({ darkMode: isDark });
            document.body.classList.toggle('dark-mode', isDark);
        });
    }

    // Function to load and display log entries (filtered if needed)
    function loadLogEntries(showAll) {
        chrome.storage.local.get(['detectionLog'], function (result) {
            const log = result.detectionLog || [];
            logContainer.innerHTML = '';

            const now = new Date().getTime();
            const filtered = log.filter(entry => {
                if (showAll) return true;
                const match = entry.match(/^\[(.*?)\]/);
                if (match) {
                    const entryTime = new Date(match[1]).getTime();
                    return now - entryTime <= 24 * 60 * 60 * 1000;
                }
                return false;
            });

            if (filtered.length === 0) {
                const li = document.createElement('li');
                li.textContent = showAll
                    ? 'No detection attempts logged yet.'
                    : 'No detection attempts in the last 24 hours.';
                logContainer.appendChild(li);
            } else {
                filtered.forEach(entry => {
                    const li = document.createElement('li');
                    li.textContent = entry;
                    logContainer.appendChild(li);
                });
            }
        });
    }

    // Clear log
    clearBtn?.addEventListener('click', () => {
        chrome.storage.local.set({ detectionLog: [] }, () => {
            loadLogEntries(showAllToggle?.checked);
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

    // Show All toggle
    showAllToggle?.addEventListener('change', function () {
        loadLogEntries(this.checked);
    });

    // Load logs on page load
    loadLogEntries(showAllToggle?.checked);

    // Cleanup logs older than 14 days
    chrome.storage.local.get(['detectionLog'], function (result) {
        const log = result.detectionLog || [];
        const now = new Date().getTime();
        const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
        const filtered = log.filter(entry => {
            const match = entry.match(/^\[(.*?)\]/);
            if (match) {
                const entryTime = new Date(match[1]).getTime();
                return entryTime >= twoWeeksAgo;
            }
            return false;
        });
        if (filtered.length < log.length) {
            chrome.storage.local.set({ detectionLog: filtered });
        }
    });

    // Load saved custom selectors
    chrome.storage.local.get(['customSuppressedDivs', 'customSuppressedIds'], (data) => {
        customDivsInput.value = (data.customSuppressedDivs || []).join('\n');
        customIdsInput.value = (data.customSuppressedIds || []).join('\n');
    });

    // Save custom selectors
    saveCustomBtn?.addEventListener('click', () => {
        const divs = customDivsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
        const ids = customIdsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
        chrome.storage.local.set({
            customSuppressedDivs: divs,
            customSuppressedIds: ids
        }, () => {
            if (saveStatus) {
                saveStatus.textContent = 'Saved!';
                setTimeout(() => {
                    saveStatus.textContent = '';
                }, 1500);
            }
        });
    });
});
