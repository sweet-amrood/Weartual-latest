import { useState, useEffect } from "react";

/**
 * Custom React hook to capture the 'beforeinstallprompt' event and support a custom PWA install UI.
 * 
 * Exposes:
 * - isInstallable: Boolean indicating if the application can be installed.
 * - install: Function to programmatically trigger the install prompt. Returns a promise resolving to boolean (accepted or not).
 */
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default browser mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.info("PWA: 'beforeinstallprompt' event captured. App is installable.");
    };

    const handleAppInstalled = () => {
      console.info("PWA: App was successfully installed.");
      setDeferredPrompt(null);
      setIsInstallable(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Initial check: if already running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      console.warn("PWA: Install prompt is not deferred or available yet.");
      return false;
    }

    // Trigger the install prompt
    deferredPrompt.prompt();

    // Await the user's choice (accepted/dismissed)
    const { outcome } = await deferredPrompt.userChoice;
    console.info(`PWA: User response to the install prompt: ${outcome}`);

    // The prompt event can only be used once, reset our state
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === "accepted";
  };

  return { isInstallable, install };
}
