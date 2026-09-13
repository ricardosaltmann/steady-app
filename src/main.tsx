import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { App as CapApp } from '@capacitor/app'
import { supabase } from './lib/supabase'

// Listen to Android Deep Links (ex: com.steadysync.app://#access_token=... or com.steadysync.app://auth/v1/callback)
try {
  CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
    if (data.url && (data.url.includes('#access_token') || data.url.includes('access_token=') || data.url.includes('code='))) {
      // Supabase parses tokens from URL hash or query params
      const urlObj = new URL(data.url.replace('com.steadysync.app://', 'http://localhost/'));
      if (urlObj.hash) {
        const params = new URLSearchParams(urlObj.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
      }
    }
  });
} catch {
  // web fallback
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
