(function () {
    // Check if detection is enabled before executing logic
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
            const timestamp = new Date().toLocaleString();
            const site = window.location.href;
            const entry = `[${timestamp}] ${site} - ${message}`;
            chrome.storage.local.get({ detectionLog: [] }, (data) => {
                const updatedLog = data.detectionLog;
                updatedLog.unshift(entry);
                chrome.storage.local.set({ detectionLog: updatedLog.slice(0, 50) });
            });
        }

        function logDetection(message) {
            console.warn('Adblock detection spoof triggered:', message);
            logDetectionAttempt(message);
        }

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

        // --- Page Check Logic ---
        function checkPageForWarnings() {
            const bodyText = document.body?.innerText?.toLowerCase() || '';
            if (phrases.some(p => bodyText.includes(p))) {
                logDetection('Ad blocker warning text found');
            }

            suspiciousClasses.forEach(cls => {
                if (document.querySelector(`.${cls}`)) {
                    logDetection(`Suspicious class detected: .${cls}`);
                }
            });

            suspiciousIds.forEach(id => {
                if (document.getElementById(id)) {
                    logDetection(`Suspicious ID detected: #${id}`);
                }
            });

            suspiciousAttributes.forEach(attr => {
                if (document.querySelector(`[${attr}]`)) {
                    logDetection(`Suspicious attribute detected: [${attr}]`);
                }
            });
        }

        // --- Script Scanner ---
        function scanScripts() {
            const suspectPatterns = ['fuckadblock', 'blockadblock', 'adblock', 'detectAdBlock', 'adsbygoogle'];
            document.querySelectorAll('script').forEach(script => {
                const content = script.innerText.toLowerCase() || '';
                if (suspectPatterns.some(p => content.includes(p))) {
                    logDetection('Anti-adblock script detected in inline JS');
                }

                const src = script.src?.toLowerCase() || '';
                if (src && suspectPatterns.some(p => src.includes(p))) {
                    logDetection(`Anti-adblock script file: ${src}`);
                }
            });
        }

        // --- Decoy Injection ---
        function injectDecoy() {
            const bait = document.createElement('div');
            bait.className = 'ad adsbox ad-banner adsense adsbygoogle ad-slot';
            bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
            document.body.appendChild(bait);
            setTimeout(() => bait.remove(), 1000);
        }

        // --- Fake Ad Slot Injection ---
        function injectFakeAdSlot() {
            const fakeAd = document.createElement('ins');
            fakeAd.className = 'adsbygoogle adsbygoogle-noablate';
            fakeAd.style.cssText = 'display:block !important; width:1px; height:1px;';
            fakeAd.setAttribute('data-ad-status', 'filled');
            document.body.appendChild(fakeAd);
            logDetection('Injected fake ad slot');
        }

        // --- Spoof Global Ad Variables ---
        try {
            window.adsbygoogle = window.adsbygoogle || [{}];
            Object.defineProperty(window, 'google_ad_status', {
                get: () => 'ok',
                configurable: true
            });
            logDetection('Spoofed global ad environment');
        } catch (e) {
            console.warn('Spoofing ad globals failed:', e);
        }

        // --- Fix Unfilled Ad Slots ---
        function rewriteUnfilledAds() {
            document.querySelectorAll('[data-ad-status="unfilled"]').forEach(el => {
                el.setAttribute('data-ad-status', 'filled');
                logDetection('Overrode unfilled ad slot');
            });
        }

        // --- Remove or Hide Adblock Modal ---
        function killModalPopup() {
            const modal = document.querySelector('.fc-ab-root');
            if (modal) {
                modal.remove();
                logDetection('Removed adblock modal (.fc-ab-root)');
            }
        }

        // --- XHR and Fetch Patching ---
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            if (typeof input === 'string' && input.includes('ads')) {
                logDetection(`Blocked ad-related fetch request: ${input}`);
            }
            return originalFetch.apply(this, arguments);
        };

        const originalXhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url) {
            if (url.includes('ads')) {
                logDetection(`Blocked ad-related XHR request: ${url}`);
            }
            return originalXhrOpen.apply(this, arguments);
        };

        // --- Mutation Observer Setup ---
        const observer = new MutationObserver(checkPageForWarnings);

        function startObserver() {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                checkPageForWarnings();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startObserver();
                injectFakeAdSlot();
                rewriteUnfilledAds();
                killModalPopup();
            });
        } else {
            startObserver();
            injectFakeAdSlot();
            rewriteUnfilledAds();
            killModalPopup();
        }

        // --- Timed Rechecks ---
        setInterval(() => {
            if (document.readyState === 'complete') {
                injectDecoy();
                injectFakeAdSlot();
                rewriteUnfilledAds();
                killModalPopup();
            }
        }, 5000);

        window.addEventListener('load', scanScripts);
    }
})();
