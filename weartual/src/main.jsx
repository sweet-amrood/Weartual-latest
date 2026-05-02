import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

const FALLBACK_GOOGLE_CLIENT_ID = '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com'
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || FALLBACK_GOOGLE_CLIENT_ID).trim()

if (import.meta.env.DEV) {
  console.info('[Google OAuth] origin:', window.location.origin)
  console.info('[Google OAuth] clientId:', googleClientId)
}

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>,
)
