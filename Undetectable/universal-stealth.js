(function () {
    const detectionTimestamps = {};
    const detectionCounts = {};

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
            const hostname = window.location.hostname;
            const site = window.location.href;
            const now = Date.now();
            const last = detectionTimestamps[hostname] || 0;
            const count = detectionCounts[hostname] || 0;

            if (now - last >= 60000) {
                const suffix = count > 1 ? ` (${count} detections in the last 60 seconds)` : '';
                const entry = `[${timestamp}] ${site} - ${message}${suffix}`;

                try {
                    if (!chrome?.runtime?.id || !chrome?.storage?.local?.get || !chrome?.storage?.local?.set) {
                        throw new Error('Chrome storage APIs unavailable');
                    }

                    chrome.storage.local.get({ detectionLog: [] }, (data) => {
                        try {
                            if (!data || !chrome.runtime?.id) throw new Error('Chrome context lost');

                            const updatedLog = Array.isArray(data.detectionLog) ? data.detectionLog : [];
                            updatedLog.unshift(entry);

                            chrome.storage.local.set({ detectionLog: updatedLog }, () => {
                                const msg = chrome.runtime?.lastError?.message || '';
                                if (msg.includes('Extension context invalidated')) {
                                    fallbackLog(entry);
                                } else if (msg) {
                                    console.warn('Log write failed:', msg);
                                }
                            });
                        } catch (callbackError) {
                            const err = String(callbackError);
                            if (err.includes('Extension context invalidated')) {
                                fallbackLog(entry);
                            } else {
                                console.warn('Log write failed (callback):', callbackError);
                            }
                        }
                    });
                } catch (outerError) {
                    const err = String(outerError);
                    if (err.includes('Extension context invalidated')) {
                        fallbackLog(entry);
                    } else {
                        console.warn('Log write failed (outer):', outerError);
                    }
                }

                detectionTimestamps[hostname] = now;
                detectionCounts[hostname] = 1;
            } else {
                detectionCounts[hostname] = count + 1;
            }
        }

        function fallbackLog(entry) {
            try {
                const existing = JSON.parse(sessionStorage.getItem('detectionLog') || '[]');
                if (!Array.isArray(existing)) throw new Error('Invalid session log');

                existing.unshift(entry);
                const trimmed = existing.slice(0, 50);
                sessionStorage.setItem('detectionLog', JSON.stringify(trimmed));

                console.info('Fallback log saved in sessionStorage.');
            } catch (err) {
                console.warn('Fallback logging failed:', err);
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

            if (window.location.hostname.includes('peacocktv.com')) {
                const overlay = document.querySelector('.message-overlay');
                if (overlay && overlay.innerText.toLowerCase().includes('ad blocker')) {
                    logAndTrigger('Peacock - Adblock Video Blocker Triggered');
                }

                const specificNotification = document.querySelector('.notification__left-message');
                if (specificNotification && /disable your ad blocker/i.test(specificNotification.innerText)) {
                    logAndTrigger('Matched .notification__left-message warning text');
                    specificNotification.closest('.notification')?.remove();
                    logDetectionAttempt('Removed .notification__left-message warning container');
                }
            }

            // --- Custom user-defined suppressions ---
            chrome.storage.local.get(['customSuppressedDivs', 'customSuppressedIds'], (data) => {
                (data.customSuppressedDivs || []).forEach(cls => {
                    document.querySelectorAll(cls).forEach(el => {
                        el.remove();
                        logDetectionAttempt(`Removed custom class element: ${cls}`);
                    });
                });

                (data.customSuppressedIds || []).forEach(id => {
                    document.querySelectorAll(id).forEach(el => {
                        el.remove();
                        logDetectionAttempt(`Removed custom ID element: ${id}`);
                    });
                });
            });
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

        function triggerDefensiveInjections() {
            injectDecoy();
            injectFakeAdSlot();
            rewriteUnfilledAds();
            killModalPopup();
            spoofGlobals();
            spoofPlugins();
            spoofCanvas();
            spoofPostMessage();
            monitorBaitMutation();
        }

        function injectDecoy() {
            const bait = document.createElement('div');
            bait.className = 'ad adsbox ad-banner adsense adsbygoogle ad-slot';
            bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
            document.body.appendChild(bait);
            setTimeout(() => bait.remove(), 1000);
            logDetectionAttempt('Injected decoy bait');
        }

        function injectFakeAdSlot() {
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

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url) {
                this._url = url;
                return originalOpen.apply(this, arguments);
            };

            const originalSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function () {
                if (this._url?.includes('ads')) {
                    logDetectionAttempt(`Blocked ad-related XHR request: ${this._url}`);
                    return;
                }
                return originalSend.apply(this, arguments);
            };
        }

        function spoofPlugins() {
            try {
                Object.defineProperty(navigator, 'plugins', {
                    get: () => ({
                        length: 3,
                        0: { name: 'Chrome PDF Plugin' },
                        1: { name: 'Chrome PDF Viewer' },
                        2: { name: 'Native Client' }
                    }),
                    configurable: true
                });
                logDetectionAttempt('Spoofed navigator.plugins');
            } catch (e) {
                console.warn('Plugin spoofing failed:', e);
            }
        }

        function spoofCanvas() {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function () {
                logDetectionAttempt('Blocked canvas fingerprinting attempt');
                return originalToDataURL.apply(this, arguments);
            };
        }

        function spoofPostMessage() {
            const originalPostMessage = window.postMessage;
            window.postMessage = function (message, targetOrigin, transfer) {
                if (typeof message === 'string' && /adblock/i.test(message)) {
                    logDetectionAttempt('Blocked suspicious postMessage related to adblock');
                    return;
                }
                return originalPostMessage.apply(this, arguments);
            };
        }

        function monitorBaitMutation() {
            const bait = document.createElement('div');
            bait.className = 'adsbox';
            bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;';
            bait.setAttribute('data-fake', 'true');
            document.body.appendChild(bait);

            const baitObserver = new MutationObserver(() => {
                logDetectionAttempt('Detected bait element mutation');
                baitObserver.disconnect();
            });

            baitObserver.observe(bait, { attributes: true, childList: true, subtree: true });
            setTimeout(() => bait.remove(), 2000);
        }

        const observer = new MutationObserver(checkPageForWarnings);

        function startObserver() {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
                logDetectionAttempt('MutationObserver attached');
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

        setInterval(() => {
            if (document.readyState === 'complete') {
                checkPageForWarnings();
                scanScripts();
            }
        }, 10000);
    }
})();
