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
  // to prevent stale production bundles from being served from the browser's PWA cache.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        console.warn('[PWA Dev Helper] Active service workers detected in development mode. Unregistering and clearing caches...');
        
        // Clear all Cache Storage
        if (window.caches) {
          caches.keys().then((keys) => {
            Promise.all(keys.map((key) => caches.delete(key))).then(() => {
              console.log('[PWA Dev Helper] Caches cleared.');
            });
          });
        }

        // Unregister service workers
        Promise.all(registrations.map((r) => r.unregister())).then((successes) => {
          if (successes.some(Boolean)) {
            console.warn('[PWA Dev Helper] Service worker unregistered. Reloading page for fresh dev assets...');
            window.location.reload();
          }
        });
      }
    });
  }
}

// Manual registration for PWA Service Worker
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

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </GoogleOAuthProvider>,
)

