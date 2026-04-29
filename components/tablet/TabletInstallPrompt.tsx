'use client';

import { useEffect, useState } from 'react';
import { Download, X, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'co_tablet_install_dismissed';
const MANUAL_KEY = 'co_tablet_install_manual_seen';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari sets navigator.standalone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((navigator as any).standalone === true) return true;
  return false;
}

function detectPlatform(): 'android' | 'ios' | 'desktop' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/win|mac|linux/.test(ua)) return 'desktop';
  return 'other';
}

export default function TabletInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'other'>('other');

  useEffect(() => {
    if (isStandalone()) return;
    setPlatform(detectPlatform());

    const dismissed = localStorage.getItem(DISMISS_KEY);
    const recentlyDismissed = dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000;

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed) setShow(true);
    }

    function handleInstalled() {
      setShow(false);
      setShowManual(false);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // iOS doesn't fire beforeinstallprompt — show a manual hint after a short delay
    // if the user is on iOS and hasn't seen it before.
    const t = setTimeout(() => {
      if (recentlyDismissed) return;
      const p = detectPlatform();
      if (p === 'ios' && !localStorage.getItem(MANUAL_KEY)) setShowManual(true);
    }, 1500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      clearTimeout(t);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) {
      // Browser hasn't fired beforeinstallprompt yet — show manual instructions
      setShowManual(true);
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
    setShowManual(false);
  }

  function dismissManual() {
    localStorage.setItem(MANUAL_KEY, '1');
    setShowManual(false);
  }

  if (showManual) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg md:left-auto md:right-4">
        <button onClick={dismissManual} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-sm font-semibold text-gray-900">Add to home screen</p>
            {platform === 'android' && (
              <ol className="mt-1 text-xs text-gray-600 space-y-0.5 list-decimal list-inside">
                <li>Tap the menu <MoreVertical className="inline h-3 w-3" /> in the top right of Chrome.</li>
                <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                <li>Confirm to add the icon.</li>
              </ol>
            )}
            {platform === 'ios' && (
              <ol className="mt-1 text-xs text-gray-600 space-y-0.5 list-decimal list-inside">
                <li>Tap the share button (square with arrow) in Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right.</li>
              </ol>
            )}
            {(platform === 'desktop' || platform === 'other') && (
              <p className="mt-1 text-xs text-gray-600">
                In Chrome/Edge, click the install icon in the address bar, or open the menu and choose <strong>Install Calgary Oaths Orders</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-lg md:left-auto md:right-4">
      <button onClick={dismiss} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 pr-4">
          <p className="text-sm font-semibold text-gray-900">Install on this tablet</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Add Calgary Oaths Orders to your home screen for full-screen kiosk-style use.
          </p>
          <button onClick={install} className="mt-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90">
            Install app
          </button>
        </div>
      </div>
    </div>
  );
}
