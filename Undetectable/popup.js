document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const optionsBtn = document.getElementById('options-btn');
    const reloadBtn = document.getElementById('reloadPage');

    // Load saved state (enabled toggle + dark mode)
    chrome.storage.local.get(['enabled', 'darkMode'], function (result) {
        toggle.checked = result.enabled !== false;

        if (result.darkMode === true) {
            document.body.classList.add('dark-mode');
        }
    });

    // Toggle enable setting
    toggle.addEventListener('change', function (e) {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    // Open options page
    optionsBtn.addEventListener('click', function () {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Reload current tab
    reloadBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]?.id) {
                chrome.tabs.reload(tabs[0].id);
            }
        });
    });
});
