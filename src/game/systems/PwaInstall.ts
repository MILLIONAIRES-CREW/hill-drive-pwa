type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | undefined;
let offlineReady = false;
let listenersBound = false;

export type InstallPlatform = 'android-chrome' | 'ios-safari' | 'desktop' | 'standalone' | 'unknown';

export function detectInstallPlatform(): InstallPlatform {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  if (standalone) {
    return 'standalone';
  }
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    return 'ios-safari';
  }
  if (/Android/i.test(ua) && /Chrome|Edg|CriOS|SamsungBrowser/i.test(ua)) {
    return 'android-chrome';
  }
  if (/Chrome|Edg|Chromium/i.test(ua)) {
    return 'desktop';
  }
  return 'unknown';
}

export function bindPwaInstallListeners(): void {
  if (listenersBound || typeof window === 'undefined') {
    return;
  }
  listenersBound = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    document.body.dataset.canInstall = '1';
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = undefined;
    document.body.dataset.canInstall = '0';
    document.body.dataset.installed = '1';
  });

  const syncOfflineBanner = (): void => {
    const offline = !navigator.onLine;
    document.body.dataset.offline = offline ? '1' : '0';
    const banner = document.getElementById('pwa-offline');
    if (banner instanceof HTMLElement) {
      banner.hidden = !offline;
    }
  };
  window.addEventListener('online', syncOfflineBanner);
  window.addEventListener('offline', syncOfflineBanner);
  syncOfflineBanner();

  if (detectInstallPlatform() === 'standalone') {
    document.body.dataset.installed = '1';
  }
}

export function canPromptInstall(): boolean {
  return Boolean(deferredPrompt);
}

export function isOfflineReady(): boolean {
  return offlineReady;
}

export function markOfflineReady(): void {
  offlineReady = true;
  document.body.dataset.offlineReady = '1';
  const toast = document.getElementById('pwa-offline-ready');
  if (toast instanceof HTMLElement) {
    toast.hidden = false;
    window.setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    return 'unavailable';
  }
  const promptEvent = deferredPrompt;
  deferredPrompt = undefined;
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  document.body.dataset.canInstall = '0';
  return choice.outcome;
}

export function installGuideLines(platform: InstallPlatform = detectInstallPlatform()): string[] {
  switch (platform) {
    case 'standalone':
      return ['Already installed — launch from your home screen.'];
    case 'ios-safari':
      return [
        'iPhone / iPad (Safari):',
        '1. Tap Share (□↑).',
        '2. Choose Add to Home Screen.',
        '3. Open Hill Drive from your home screen.',
      ];
    case 'android-chrome':
      return [
        'Android (Chrome):',
        '1. Tap Install when prompted, or',
        '2. Menu ⋮ → Install app / Add to Home screen.',
      ];
    case 'desktop':
      return ['Desktop: use Install in the address bar, or the browser menu.'];
    default:
      return ['Install from your browser menu when available.'];
  }
}
