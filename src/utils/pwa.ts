export type InstallSupport = {
  canInstall: boolean;
  reason?: string;
  platform: 'chrome' | 'edge' | 'firefox' | 'safari' | 'ios_safari' | 'other';
  standalone: boolean;
};

export function detectPlatform(): InstallSupport['platform'] {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome/')) return 'chrome';
  if (ua.includes('firefox/')) return 'firefox';
  if (isIOS && isSafari) return 'ios_safari';
  if (isSafari) return 'safari';
  return 'other';
}

export function isStandalone(): boolean {
  const mediaStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as any).standalone;
  return Boolean(mediaStandalone || iosStandalone);
}

export function getBaselineInstallSupport(): InstallSupport {
  const platform = detectPlatform();
  const standalone = isStandalone();
  const hasManifest = !!document.querySelector('link[rel="manifest"]');
  const swSupported = 'serviceWorker' in navigator;

  if (standalone) return { canInstall: false, reason: 'already-installed', platform, standalone };
  if (!hasManifest) return { canInstall: false, reason: 'no-manifest', platform, standalone };
  if (!swSupported) return { canInstall: false, reason: 'no-sw', platform, standalone };

  // Chrome/Edge require beforeinstallprompt; Firefox allows install from URL bar; Safari(iOS) uses A2HS flow
  switch (platform) {
    case 'chrome':
    case 'edge':
      return { canInstall: !!(window as any).__pwaDeferredPrompt, reason: 'awaiting-bip', platform, standalone };
    case 'firefox':
      return { canInstall: true, platform, standalone };
    case 'ios_safari':
    case 'safari':
      return { canInstall: true, platform, standalone };
    default:
      return { canInstall: !!(window as any).__pwaDeferredPrompt, platform, standalone };
  }
}

export function listenForInstallAvailability(cb: (available: boolean) => void) {
  const handler = () => cb(!!(window as any).__pwaDeferredPrompt);
  window.addEventListener('pwa:install-available', handler);
  window.addEventListener('pwa:install-handled', handler);
  return () => {
    window.removeEventListener('pwa:install-available', handler);
    window.removeEventListener('pwa:install-handled', handler);
  };
}


