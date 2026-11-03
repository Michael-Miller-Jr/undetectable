document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('toggle');
    const optionsBtn = document.getElementById('options-btn');
    const reloadBtn = document.getElementById('reloadPage');
    const themeToggle = document.getElementById('theme-toggle');
    const yearSpan = document.getElementById('copyright-year');

    // --- Dynamic Copyright Year ---
    const startYear = 2025;
    const currentYear = new Date().getFullYear();
    // Displays "2025" if it's 2025, or "2025 - 2026" if it's 2026+
    yearSpan.textContent = currentYear > startYear
        ? `${startYear} - ${currentYear}`
        : `${startYear}`;

    // Load saved state (enabled toggle + dark mode)
    chrome.storage.local.get(['enabled', 'darkMode'], function (result) {
        toggle.checked = result.enabled !== false;

        if (result.darkMode === true) {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    });

    // Toggle enable setting
    toggle.addEventListener('change', function (e) {
        chrome.storage.local.set({ enabled: e.target.checked });
    });

    // Theme Toggle logic
    themeToggle.addEventListener('click', function () {
        const isDark = document.body.classList.toggle('dark-mode');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        chrome.storage.local.set({ darkMode: isDark });
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