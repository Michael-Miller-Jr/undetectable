(function () {
    chrome.storage.local.get({ enabled: true }, (data) => {
        if (!data.enabled) {
            console.log('Universal Stealth is disabled via user toggle.');
            return;
        }

        runStealthDetection();
    });

    function runStealthDetection() {
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

        // --- Detection Lists ---
        const phrases = [
            'disable your ad blocker',
            'ad blocker detected',
            'whitelist this site',
            'please turn off your ad blocker',
            'video is unavailable because of ad blocker',
            'ad blocking interferes',
            'please allow ads on our site'
        ];

        const suspiciousClasses = [
            'adblock-warning', 'adblock-message', 'adblock-detected', 'adblock-overlay',
            'please-disable-adblock', 'adblock-notice', 'adblock-popup',
            'fc-ab-root', 'fc-dialog-headline-text'
        ];

        const suspiciousIds = ['adblock', 'ad_blocker_message'];
        const suspiciousAttributes = ['data-adblock', 'data-ad-block'];

        let detectionTriggered = false;

        function logAndTrigger(msg) {
            logDetectionAttempt(msg);
            if (!detectionTriggered) {
                detectionTriggered = true;
                triggerDefensiveInjections();
            }
        }

        // --- Detection Checks ---
        function checkPageForWarnings() {
            const bodyText = document.body?.innerText?.toLowerCase() || '';
            if (phrases.some(p => bodyText.includes(p))) {
                logAndTrigger('Ad blocker warning text found');
            }

            suspiciousClasses.forEach(cls => {
                if (document.querySelector(`.${cls}`)) {
                    logAndTrigger(`Suspicious class detected: .${cls}`);
                }
            });

            suspiciousIds.forEach(id => {
                if (document.getElementById(id)) {
                    logAndTrigger(`Suspicious ID detected: #${id}`);
                }
            });

            suspiciousAttributes.forEach(attr => {
                if (document.querySelector(`[${attr}]`)) {
                    logAndTrigger(`Suspicious attribute detected: [${attr}]`);
                }
            });

            // Detect and remove .notification__left-message warning
            const specificNotification = document.querySelector('.notification__left-message');
            if (specificNotification && /disable your ad blocker/i.test(specificNotification.innerText)) {
                logAndTrigger('Matched .notification__left-message warning text');
                specificNotification.closest('.notification')?.remove();
                logDetectionAttempt('Removed .notification__left-message warning container');
            }
        }

        function scanScripts() {
            const patterns = ['fuckadblock', 'blockadblock', 'adblock', 'detectAdBlock', 'adsbygoogle'];
            document.querySelectorAll('script').forEach(script => {
                const content = script.innerText.toLowerCase() || '';
                const src = script.src?.toLowerCase() || '';
                if (patterns.some(p => content.includes(p))) {
                    logAndTrigger('Anti-adblock script detected in inline JS');
                }
                if (src && patterns.some(p => src.includes(p))) {
                    logAndTrigger(`Anti-adblock script file: ${src}`);
                }
            });
        }

        // --- Defensive Injections ---
        function triggerDefensiveInjections() {
            injectDecoy();
            injectFakeAdSlot();
            rewriteUnfilledAds();
            killModalPopup();
            spoofGlobals();
        }

        function injectDecoy() {
            if (!document.body) return;
            const bait = document.createElement('div');
            bait.className = 'ad adsbox ad-banner adsense adsbygoogle ad-slot';
            bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
            document.body.appendChild(bait);
            setTimeout(() => bait.remove(), 1000);
            logDetectionAttempt('Injected decoy bait');
        }

        function injectFakeAdSlot() {
            if (!document.body) return;
            const fakeAd = document.createElement('ins');
            fakeAd.className = 'adsbygoogle adsbygoogle-noablate';
            fakeAd.style.cssText = 'display:block !important; width:1px; height:1px;';
            fakeAd.setAttribute('data-ad-status', 'filled');
            document.body.appendChild(fakeAd);
            logDetectionAttempt('Injected fake ad slot');
        }

        function rewriteUnfilledAds() {
            document.querySelectorAll('[data-ad-status="unfilled"]').forEach(el => {
                el.setAttribute('data-ad-status', 'filled');
                logDetectionAttempt('Overrode unfilled ad slot');
            });
        }

        function killModalPopup() {
            const modal = document.querySelector('.fc-ab-root');
            if (modal) {
                modal.remove();
                logDetectionAttempt('Removed adblock modal (.fc-ab-root)');
            }
        }

        function spoofGlobals() {
            try {
                window.adsbygoogle = window.adsbygoogle || [{}];
                Object.defineProperty(window, 'google_ad_status', {
                    get: () => 'ok',
                    configurable: true
                });
                logDetectionAttempt('Spoofed global ad environment');
            } catch (e) {
                console.warn('Spoofing ad globals failed:', e);
            }

            const originalFetch = window.fetch;
            window.fetch = function (input, init) {
                const url = typeof input === 'string' ? input : input?.url || '';
                if (url.includes('ads')) {
                    logDetectionAttempt(`Blocked ad-related fetch request: ${url}`);
                    return Promise.resolve(new Response('{}', { status: 204 }));
                }
                return originalFetch.apply(this, arguments);
            };

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
        }

        // --- Mutation Observer ---
        const observer = new MutationObserver(checkPageForWarnings);

        function startObserver() {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                logDetectionAttempt('MutationObserver attached immediately');
                checkPageForWarnings();
            } else {
                const wait = setInterval(() => {
                    if (document.body) {
                        observer.observe(document.body, { childList: true, subtree: true });
                        logDetectionAttempt('MutationObserver attached after polling for body');
                        checkPageForWarnings();
                        clearInterval(wait);
                    }
                }, 50);
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startObserver();
                scanScripts();
            });
        } else {
            startObserver();
            scanScripts();
        }

        // Periodic re-check for dynamic content
        setInterval(() => {
            if (document.readyState === 'complete') {
                checkPageForWarnings();
                scanScripts();
            }
        }, 10000);
    }
})();
