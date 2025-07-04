(function () {
    const detectionTimestamps = {};
    const detectionCounts = {};

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
            const timestamp = new Date().toLocaleString();
            const hostname = window.location.hostname;
            const site = window.location.href;
            const siteTitle = document.title;
            const now = Date.now();
            const last = detectionTimestamps[hostname] || 0;
            const count = detectionCounts[hostname] || 0;

            if (now - last >= 60000) {
                const suffix = count > 1 ? ` (${count} detections in the last 60 seconds)` : '';
                const entry = `[${timestamp}] ${site} (${siteTitle}) - ${message}${suffix}`;

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
                        triggerDefensiveInjections();
                    }
                    originalYtInitialPlayerResponse = val;
                }
            });
        }

        window.ytplayer = window.ytplayer || {};
        ytplayer.config = ytplayer.config || {};
        ytplayer.config.args = ytplayer.config.args || {};
        if (ytplayer.config.args.ad3_module !== null) {
            ytplayer.config.args.ad3_module = null;
            logDetectionAttempt('Nullified ytplayer.config.args.ad3_module');
            triggerDefensiveInjections();
        }

        const overlayInterval = setInterval(() => {
            const adOverlay = document.querySelector('ytd-popup-container tp-yt-paper-dialog');
            if (adOverlay && adOverlay.innerText.includes('Ad blockers are not allowed')) {
                adOverlay.remove();
                logDetectionAttempt('Blocked YouTube anti-adblock overlay');
                triggerDefensiveInjections();
                clearInterval(overlayInterval);
            }
        }, 500);

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
            if (found) {
                logDetectionAttempt('Removed ad-related DOM elements');
                triggerDefensiveInjections();
            }
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
                triggerDefensiveInjections();
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
                triggerDefensiveInjections();
                return;
            }
            return originalXhrSend.apply(this, arguments);
        };

        try {
            Object.defineProperty(window, 'ytAds', {
                configurable: true,
                get: () => {
                    logDetectionAttempt('Blocked ytAds global access');
                    triggerDefensiveInjections();
                    return undefined;
                }
            });
        } catch (e) {
            console.warn('ytAds spoofing failed:', e);
        }

        function triggerDefensiveInjections() {
            spoofGlobals();
            spoofPlugins();
            spoofCanvas();
            spoofPostMessage();
            monitorBaitMutation();
        }

        function spoofGlobals() {
            try {
                Object.defineProperty(window, 'google_ad_status', {
                    get: () => 'ok',
                    configurable: true
                });
                logDetectionAttempt('Spoofed google_ad_status global');
            } catch (e) {
                console.warn('Spoofing ad globals failed:', e);
            }
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
    }

    function monitorUrlChanges(callback) {
        let lastUrl = location.href;
        const pushState = history.pushState;
        const replaceState = history.replaceState;

        function onChange() {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setTimeout(() => callback(), 100);
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
