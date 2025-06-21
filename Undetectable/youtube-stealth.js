(function () {
    chrome.storage.local.get({ enabled: true }, (data) => {
        if (!data.enabled) {
            console.log('YouTube Stealth is disabled via user toggle.');
            return;
        }

        runYouTubeStealth();
        monitorUrlChanges(runYouTubeStealth);
    });

    function runYouTubeStealth() {
        // --- Logging Utilities ---
        function logDetectionAttempt(message) {
            try {
                const timestamp = new Date().toLocaleString();
                const site = window.location.href;
                const entry = `[${timestamp}] ${site} - ${message}`;
                chrome.storage.local.get({ detectionLog: [] }, (data) => {
                    const updatedLog = data.detectionLog || [];
                    updatedLog.unshift(entry);
                    chrome.storage.local.set({ detectionLog: updatedLog });
                });
            } catch (e) {
                console.warn('Log write failed:', e);
            }
        }

        function cleanupOldLogs() {
            chrome.storage.local.get({ detectionLog: [] }, (data) => {
                const now = Date.now();
                const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
                const filtered = data.detectionLog.filter(entry => {
                    const match = entry.match(/^\[(.*?)\]/);
                    return match && new Date(match[1]).getTime() >= twoWeeksAgo;
                });
                chrome.storage.local.set({ detectionLog: filtered });
            });
        }

        cleanupOldLogs();

        // --- Strip ads from ytInitialPlayerResponse ---
        if (!Object.getOwnPropertyDescriptor(window, 'ytInitialPlayerResponse')) {
            let originalYtInitialPlayerResponse;
            Object.defineProperty(window, 'ytInitialPlayerResponse', {
                configurable: true,
                get() {
                    return originalYtInitialPlayerResponse || {};
                },
                set(val) {
                    if (val && (val.adPlacements || val.playerAds)) {
                        delete val.adPlacements;
                        delete val.playerAds;
                        logDetectionAttempt('Stripped ad references from ytInitialPlayerResponse');
                    }
                    originalYtInitialPlayerResponse = val;
                }
            });
        }

        // --- Nullify ad3_module if present ---
        window.ytplayer = window.ytplayer || {};
        ytplayer.config = ytplayer.config || {};
        ytplayer.config.args = ytplayer.config.args || {};
        if (ytplayer.config.args.ad3_module !== null) {
            ytplayer.config.args.ad3_module = null;
            logDetectionAttempt('Nullified ytplayer.config.args.ad3_module');
        }

        // --- Block YouTube ad overlay ---
        const overlayInterval = setInterval(() => {
            const adOverlay = document.querySelector('ytd-popup-container tp-yt-paper-dialog');
            if (adOverlay && adOverlay.innerText.includes('Ad blockers are not allowed')) {
                adOverlay.remove();
                logDetectionAttempt('Blocked YouTube anti-adblock overlay');
                clearInterval(overlayInterval);
            }
        }, 500);

        // --- Remove ad-related DOM elements ---
        const adSelectors = [
            '#player-ads',
            '.ytp-ad-module',
            '.video-ads',
            '.ytp-ad-player-overlay',
            'ytd-companion-slot-renderer',
            '.ytp-ad-overlay-container',
            'div[class^="ad-showing"]'
        ];

        const observer = new MutationObserver(() => {
            let found = false;
            adSelectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                    el.remove();
                    found = true;
                });
            });
            if (found) logDetectionAttempt('Removed ad-related DOM elements');
        });

        function startObserver() {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                logDetectionAttempt('MutationObserver attached');
            } else {
                const waitForBody = setInterval(() => {
                    if (document.body) {
                        observer.observe(document.body, { childList: true, subtree: true });
                        logDetectionAttempt('MutationObserver attached after polling for body');
                        clearInterval(waitForBody);
                    }
                }, 50);
            }
        }

        startObserver();

        // --- Block fetch requests containing "ads" ---
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            let url = '';
            try {
                url = typeof input === 'string' ? input : (input?.url || '');
            } catch (e) {
                url = '';
            }

            if (url.includes('ads')) {
                logDetectionAttempt(`Blocked ad-related fetch request: ${url}`);
                return Promise.resolve(new Response('{}', { status: 204 }));
            }

            return originalFetch.apply(this, arguments);
        };

        // --- Block XHR requests containing "ads" ---
        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url;
            return originalXhrOpen.apply(this, arguments);
        };

        const originalXhrSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function () {
            if (this._url?.includes('ads')) {
                logDetectionAttempt(`Blocked ad-related XHR request: ${this._url}`);
                return;
            }
            return originalXhrSend.apply(this, arguments);
        };

        // --- Prevent access to ytAds global ---
        try {
            Object.defineProperty(window, 'ytAds', {
                configurable: true,
                get: () => {
                    logDetectionAttempt('Blocked ytAds global access');
                    return undefined;
                }
            });
        } catch (e) {
            console.warn('ytAds spoofing failed:', e);
        }
    }

    // --- SPA-aware URL Change Detection ---
    function monitorUrlChanges(callback) {
        let lastUrl = location.href;
        const pushState = history.pushState;
        const replaceState = history.replaceState;

        function onChange() {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setTimeout(() => callback(), 100); // debounce
            }
        }

        history.pushState = function () {
            pushState.apply(this, arguments);
            onChange();
        };

        history.replaceState = function () {
            replaceState.apply(this, arguments);
            onChange();
        };

        window.addEventListener('popstate', onChange);
    }
})();
