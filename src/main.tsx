import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register Service Worker and install prompt handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        console.log('Service Worker registered:', reg.scope);
        // Seamless updates: if a new SW is installed, activate it
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Tell SW to skip waiting and reload clients
              if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // When controller changes (new SW took control), refresh once
        let refreshed = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshed) return;
          refreshed = true;
          window.location.reload();
        });
      })
      .catch(err => console.warn('Service Worker registration failed:', err));
  });
}

// Handle PWA install prompt events globally
(() => {
  let deferredPrompt: any = null;
  const setFlag = (key: string, value: any) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    (window as any).__pwaDeferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa:install-available'));
  });

  window.addEventListener('appinstalled', () => {
    setFlag('pwa_installed_at', Date.now());
    (window as any).__pwaDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  });

  (window as any).triggerPwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setFlag('pwa_install_accepted_at', Date.now());
      if (outcome === 'dismissed') setFlag('pwa_install_dismissed_at', Date.now());
      deferredPrompt = null;
      (window as any).__pwaDeferredPrompt = null;
      window.dispatchEvent(new CustomEvent('pwa:install-handled', { detail: { outcome } }));
    }
  };
})();
