// DEPRECATED: PWA features have been removed from this application.
// This hook is no longer active or used.
export function usePWAInstallPrompt() {
  return { 
    isInstallable: false, 
    install: async () => {
      console.warn("PWA: Custom install prompt triggered, but PWA is disabled.");
      return false;
    } 
  };
}
