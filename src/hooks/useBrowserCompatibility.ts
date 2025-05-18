import { useState, useEffect } from 'react';

// Define types for the hook's return value
export interface BrowserSupportState {
  hasGetUserMedia: boolean;
  browser: string | null;
  version: string | null;
  os: string | null;
  osVersion: string | null;
  isDesktop: boolean;
}

export interface BrowserCompatibilityInfo {
  support: BrowserSupportState;
  messages: { type: 'info' | 'warning' | 'error'; text: string; description?: string }[];
}

// Define the custom hook
export const useBrowserCompatibility = (): BrowserCompatibilityInfo => {
  const [support, setSupport] = useState<BrowserSupportState>({
    hasGetUserMedia: false,
    browser: null,
    version: null,
    os: null,
    osVersion: null,
    isDesktop: true,
  });
  const [messages, setMessages] = useState<{ type: 'info' | 'warning' | 'error'; text: string; description?: string }[]>([]);

  useEffect(() => {
    // --- Helper Functions (Moved from ScanAnalysis) ---

    const detectBrowser = (userAgent: string) => {
        let browser = null;
        let version = null;
        let isDesktop = !/Mobi|Android|iPhone|iPad|iPod|webOS|IEMobile|Opera Mini/i.test(userAgent);

        // Order matters: Check specific browsers before more general ones
        if (userAgent.indexOf("Edg/") > -1) { // Modern Edge (Chromium-based)
            browser = "Edge";
            const match = userAgent.match(/Edg\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("SamsungBrowser") > -1) { // Samsung Internet
            browser = "Samsung Internet";
            const match = userAgent.match(/SamsungBrowser\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("Firefox") > -1 && userAgent.indexOf("Focus") === -1) { // Firefox (excluding Focus)
            browser = "Firefox";
            const match = userAgent.match(/Firefox\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("FxiOS") > -1) { // Firefox on iOS
             browser = "Firefox iOS";
             const match = userAgent.match(/FxiOS\/(\d+(\.\d+)?)/);
             version = match ? match[1] : null;
        } else if (userAgent.indexOf("CriOS") > -1) { // Chrome on iOS
            browser = "Chrome iOS";
            const match = userAgent.match(/CriOS\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Edg/") === -1) { // Chrome (ensure not Edge Chromium)
            browser = "Chrome";
            const match = userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1 && userAgent.indexOf("CriOS") === -1 && userAgent.indexOf("FxiOS") === -1) { // Safari (ensure not Chrome/iOS variants)
            browser = "Safari";
            const match = userAgent.match(/Version\/(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("Trident/") > -1 || userAgent.indexOf("MSIE") > -1) { // Internet Explorer
            browser = "Internet Explorer";
            const match = userAgent.match(/(?:MSIE |rv:)(\d+(\.\d+)?)/);
            version = match ? match[1] : null;
        } else if (userAgent.indexOf("Edge/") > -1) { // Legacy Edge
             browser = "Edge (Legacy)";
             const match = userAgent.match(/Edge\/(\d+(\.\d+)?)/);
             version = match ? match[1] : null;
        }

        return { browser, version, isDesktop };
    };

    const detectOS = (userAgent: string) => {
        let os = null;
        let osVersion = null;

        if (/Windows NT 10\.0/.test(userAgent)) { os = "Windows"; osVersion = "10"; }
        else if (/Windows NT 6\.3/.test(userAgent)) { os = "Windows"; osVersion = "8.1"; }
        else if (/Windows NT 6\.2/.test(userAgent)) { os = "Windows"; osVersion = "8"; }
        else if (/Windows NT 6\.1/.test(userAgent)) { os = "Windows"; osVersion = "7"; }
        else if (/Windows NT 6\.0/.test(userAgent)) { os = "Windows"; osVersion = "Vista"; }
        else if (/Windows NT 5\.1|Windows XP/.test(userAgent)) { os = "Windows"; osVersion = "XP"; }
        else if (/Windows/.test(userAgent)) { os = "Windows"; } // Generic Windows
        else if (/iPhone OS (\d+_\d+)/.test(userAgent)) { os = "iOS"; osVersion = userAgent.match(/iPhone OS (\d+_\d+)/)![1].replace('_', '.'); }
        else if (/iPad; CPU OS (\d+_\d+)/.test(userAgent)) { os = "iOS"; osVersion = userAgent.match(/iPad; CPU OS (\d+_\d+)/)![1].replace('_', '.'); }
        else if (/iPod touch; CPU iPhone OS (\d+_\d+)/.test(userAgent)) { os = "iOS"; osVersion = userAgent.match(/iPod touch; CPU iPhone OS (\d+_\d+)/)![1].replace('_', '.'); }
        else if (/Mac OS X (\d+_\d+)/.test(userAgent)) { os = "macOS"; osVersion = userAgent.match(/Mac OS X (\d+_\d+)/)![1].replace('_', '.'); }
        else if (/Android (\d+(\.\d+)?)/.test(userAgent)) { os = "Android"; osVersion = userAgent.match(/Android (\d+(\.\d+)?)/)![1]; }
        else if (/Linux/.test(userAgent)) { os = "Linux"; }
        else if (/CrOS/.test(userAgent)) { os = "Chrome OS"; }

        return { os, osVersion };
    };

    const checkGetUserMediaSupport = () => {
        const hasModernAPI = !!navigator.mediaDevices?.getUserMedia;
        const hasLegacyAPI = !!(
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia ||
            (navigator as any).msGetUserMedia
        );
        return hasModernAPI || hasLegacyAPI;
    };

    // --- Main Logic ---
    const userAgent = navigator.userAgent;
    const browserInfo = detectBrowser(userAgent);
    const osInfo = detectOS(userAgent);
    const hasGetUserMedia = checkGetUserMediaSupport();

    const currentSupport: BrowserSupportState = {
        hasGetUserMedia,
        browser: browserInfo.browser,
        version: browserInfo.version,
        os: osInfo.os,
        osVersion: osInfo.osVersion,
        isDesktop: browserInfo.isDesktop,
    };
    setSupport(currentSupport);

    console.log("Browser Compatibility Details:", currentSupport);

    // --- Known Issues / Messages ---
    const compatibilityMessages: { type: 'info' | 'warning' | 'error'; text: string; description?: string }[] = [];

    if (currentSupport.browser === "Internet Explorer") {
        compatibilityMessages.push({
            type: 'error',
            text: "Browser Not Supported",
            description: "Internet Explorer doesn\'t support camera access. Please use Edge, Chrome, Firefox, or Safari instead."
        });
    } else if (currentSupport.browser) {
        compatibilityMessages.push({
            type: 'info',
            text: "Camera Access Permission",
            description: "Camera access permission required. You must allow camera access in your browser when prompted to use this feature."
        });
    } else if (currentSupport.browser === "Safari" && currentSupport.os === "iOS") {
        const majorVersion = currentSupport.osVersion ? parseFloat(currentSupport.osVersion.split('.')[0]) : 0;
        if (majorVersion < 14) { // Earlier versions had more issues
            compatibilityMessages.push({
                type: 'warning',
                text: "Older iOS Safari Version",
                description: "Your iOS version might have limited camera support. If you experience issues, try updating iOS or use a different browser like Chrome for iOS."
            });
        }
    } else if (currentSupport.browser === "Chrome iOS" || currentSupport.browser === "Firefox iOS") {
         compatibilityMessages.push({
             type: 'info',
             text: "iOS Browser Note",
             description: `Camera functionality on ${currentSupport.browser} relies on Apple\'s WebKit engine, similar to Safari.`
         });
    }

    if (!hasGetUserMedia && currentSupport.browser !== "Internet Explorer") {
        compatibilityMessages.push({
             type: 'error',
             text: "Camera Access Not Supported",
             description: "Your browser does not seem to support camera access APIs required for this feature."
         });
    }

    setMessages(compatibilityMessages);

  }, []); // Run only once on mount

  return { support, messages };
}; 