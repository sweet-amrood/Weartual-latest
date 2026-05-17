import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import "./index.css";
import "driver.js/dist/driver.css";
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

const FALLBACK_GOOGLE_CLIENT_ID = '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID).trim()

if (import.meta.env.DEV) {
  console.info('[Google OAuth] origin:', window.location.origin)
  console.info('[Google OAuth] clientId:', googleClientId)
}

// PWA Unregistration & Cleanup Helper
// Ensures users' browsers clear out any active PWA service workers and caches
// so they get fresh, non-PWA assets.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.info('[PWA Cleanup] Service worker successfully unregistered.');
        }
      });
    }
  });

  if (window.caches) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key).then(() => {
          console.info(`[PWA Cleanup] Cache ${key} successfully cleared.`);
        });
      });
    });
  }
}

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </GoogleOAuthProvider>,
)

