(function () {
    function logDetectionAttempt(message) {
        const timestamp = new Date().toLocaleString();
        const site = window.location.href;
        const entry = `[${timestamp}] ${site} - ${message}`;
        chrome.storage.local.get({ detectionLog: [] }, (data) => {
            const updatedLog = data.detectionLog;
            updatedLog.unshift(entry);
            chrome.storage.local.set({ detectionLog: updatedLog.slice(0, 50) });
        });
    }

    // 1. Remove YouTube's anti-adblock overlay
    setInterval(() => {
        const adOverlay = document.querySelector('ytd-popup-container tp-yt-paper-dialog');
        if (adOverlay && adOverlay.innerText.includes('Ad blockers are not allowed')) {
            adOverlay.remove();
            logDetectionAttempt('Blocked YouTube anti-adblock overlay');
        }
    }, 500);

    // 2. Spoof ytInitialPlayerResponse to strip ad info
    let originalYtInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
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

    // 3. Disable known ad-related globals
    try {
        Object.defineProperty(window, 'ytAds', {
            get: () => {
                logDetectionAttempt('Blocked ytAds global access');
                return undefined;
            }
        });
    } catch (e) { }

    window.ytplayer = window.ytplayer || {};
    ytplayer.config = ytplayer.config || {};
    ytplayer.config.args = ytplayer.config.args || {};
    if (ytplayer.config.args.ad3_module !== null) {
        ytplayer.config.args.ad3_module = null;
        logDetectionAttempt('Nullified ytplayer.config.args.ad3_module');
    }

    // 4. Remove DOM ad containers dynamically
    const adSelectors = [
        '#player-ads',
        '.ytp-ad-module',
        '.video-ads',
        '.ytp-ad-player-overlay',
        'ytd-companion-slot-renderer',
        '.ytp-ad-overlay-container',
        'div[class^="ad-showing"]'
    ];

    const adRemover = () => {
        let removed = false;
        adSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.remove();
                removed = true;
            });
        });
        if (removed) logDetectionAttempt('Removed ad-related DOM elements');
    };

    const observer = new MutationObserver(adRemover);
    observer.observe(document, { childList: true, subtree: true });

    // 5. Patch fetch to block ad pings
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        if (typeof input === 'string' && input.includes('ads')) {
            logDetectionAttempt('Blocked ad-related fetch request');
            return new Promise(res => res(new Response('{}', { status: 204 })));
        }
        return originalFetch.apply(this, arguments);
    };

    // 6. Patch XHR to silently cancel ad URLs
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
        if (url.includes('ads')) {
            logDetectionAttempt('Blocked ad-related XHR request');
            this.abort();
        } else {
            originalXhrOpen.apply(this, arguments);
        }
    };
})();
