import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import "./index.css";
import "driver.js/dist/driver.css";
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { registerSW } from 'virtual:pwa-register'

const FALLBACK_GOOGLE_CLIENT_ID = '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID).trim()

if (import.meta.env.DEV) {
  console.info('[Google OAuth] origin:', window.location.origin)
  console.info('[Google OAuth] clientId:', googleClientId)

  // Dev PWA Clean-up: Automatically unregister service workers and clear caches in development
  // if you want to swap between preview and dev builds to prevent caching headaches.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      // In dev mode with devOptions enabled, Vite generates a local SW.
      // We only clear out dev-dist/workbox files if you want to hard reset.
      // But we let it run so PWA install prompt is present on 5173.
    });
  }
}

// Manual registration for PWA Service Worker with premium update toast notification
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('New version available. Refresh to update.');
      
      // Prevent creating duplicate toasts
      if (document.getElementById('pwa-update-toast')) return;

      // Create a premium, glassmorphic update toast matching Weartual branding
      const toast = document.createElement('div');
      toast.id = 'pwa-update-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        font-family: Inter, Roboto, sans-serif;
        font-size: 0.875rem;
        color: #1e293b;
        animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      `;

      // Apply dark mode styling if document element has .dark
      if (document.documentElement.classList.contains('dark')) {
        toast.style.backgroundColor = 'rgba(15, 23, 42, 0.85)';
        toast.style.borderColor = 'rgba(51, 65, 85, 0.5)';
        toast.style.color = '#f1f5f9';
      }
      
      const text = document.createElement('span');
      text.style.fontWeight = '500';
      text.innerText = 'New version available. Refresh to update.';
      
      const button = document.createElement('button');
      button.style.cssText = `
        padding: 0.375rem 0.75rem;
        border: none;
        border-radius: 0.5rem;
        background-color: #7c3aed;
        color: #ffffff;
        font-weight: 600;
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      `;
      button.innerText = 'Refresh';
      
      button.onmouseover = () => {
        button.style.backgroundColor = '#6d28d9';
      };
      button.onmouseout = () => {
        button.style.backgroundColor = '#7c3aed';
      };
      button.onclick = () => {
        updateSW(true);
      };
      
      toast.appendChild(text);
      toast.appendChild(button);
      document.body.appendChild(toast);
    },
    onOfflineReady() {
      console.log('App ready to work offline.');
    }
  });
}

// Premium Glassmorphic Online/Offline Toasts
if (typeof window !== 'undefined') {
  // Inject keyframes dynamically for high-performance GPU-accelerated entrance and exit animations
  if (!document.getElementById('pwa-network-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'pwa-network-animation-styles';
    style.innerHTML = `
      @keyframes pwaFadeInUp {
        from {
          opacity: 0;
          transform: translate(-50%, 1rem);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      @keyframes pwaFadeOutDown {
        from {
          opacity: 1;
          transform: translate(-50%, 0);
        }
        to {
          opacity: 0;
          transform: translate(-50%, 1rem);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const showNetworkToast = (isOnline) => {
    const existingOffline = document.getElementById('pwa-network-offline-toast');
    const existingOnline = document.getElementById('pwa-network-online-toast');
    if (existingOffline) existingOffline.remove();
    if (existingOnline) existingOnline.remove();

    if (!isOnline) {
      // Create a gorgeous red/orange glassmorphic offline popup
      const toast = document.createElement('div');
      toast.id = 'pwa-network-offline-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem 0.75rem 1.25rem;
        border-radius: 9999px;
        background-color: rgba(239, 68, 68, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(248, 113, 113, 0.4);
        box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.25), 0 4px 6px -4px rgba(239, 68, 68, 0.25);
        font-family: Inter, Roboto, sans-serif;
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
        animation: pwaFadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      `;

      // WifiOff SVG Icon
      const icon = document.createElement('div');
      icon.style.display = 'flex';
      icon.style.alignItems = 'center';
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"/><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
      
      const text = document.createElement('span');
      text.innerText = 'No internet connection. You are currently offline.';

      // Close Button
      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        padding: 0.25rem;
        margin-left: 0.5rem;
        border-radius: 9999px;
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      
      closeBtn.onmouseover = () => {
        closeBtn.style.color = '#ffffff';
        closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      };
      closeBtn.onmouseout = () => {
        closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
        closeBtn.style.backgroundColor = 'transparent';
      };

      toast.appendChild(icon);
      toast.appendChild(text);
      toast.appendChild(closeBtn);
      document.body.appendChild(toast);

      // Auto dismiss timer (5 seconds)
      const dismissTimer = setTimeout(() => {
        toast.style.animation = 'pwaFadeOutDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 350);
      }, 5000);

      closeBtn.onclick = () => {
        clearTimeout(dismissTimer);
        toast.style.animation = 'pwaFadeOutDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 350);
      };
    } else {
      // Only show green restored toast if the user was actually offline (offline toast was visible)
      if (existingOffline) {
        const toast = document.createElement('div');
        toast.id = 'pwa-network-online-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem 0.75rem 1.25rem;
          border-radius: 9999px;
          background-color: rgba(16, 185, 129, 0.95);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(52, 211, 153, 0.4);
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25), 0 4px 6px -4px rgba(16, 185, 129, 0.25);
          font-family: Inter, Roboto, sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          animation: pwaFadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        `;

        // Wifi SVG Icon
        const icon = document.createElement('div');
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi"><path d="M5 12.5a10.8 10.8 0 0 1 14 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;

        const text = document.createElement('span');
        text.innerText = 'Internet connection restored!';

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: 0.25rem;
          margin-left: 0.5rem;
          border-radius: 9999px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        closeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        
        closeBtn.onmouseover = () => {
          closeBtn.style.color = '#ffffff';
          closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        };
        closeBtn.onmouseout = () => {
          closeBtn.style.color = 'rgba(255, 255, 255, 0.7)';
          closeBtn.style.backgroundColor = 'transparent';
        };

        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        document.body.appendChild(toast);

        // Auto remove after 5 seconds with animation
        const dismissTimer = setTimeout(() => {
          toast.style.animation = 'pwaFadeOutDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
          setTimeout(() => toast.remove(), 350);
        }, 5000);

        closeBtn.onclick = () => {
          clearTimeout(dismissTimer);
          toast.style.animation = 'pwaFadeOutDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
          setTimeout(() => toast.remove(), 350);
        };
      }
    }
  };

  // Check state on load
  if (!navigator.onLine) {
    // Wait slightly for DOM to be fully ready
    window.addEventListener('DOMContentLoaded', () => showNetworkToast(false));
  }

  window.addEventListener('online', () => showNetworkToast(true));
  window.addEventListener('offline', () => showNetworkToast(false));
}

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </GoogleOAuthProvider>,
)

