'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

const DISMISS_KEY = 'co_push_prompt_dismissed';

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);

    // iOS in Safari (not standalone) — can't do push, prompt to install first
    if (isIos && !isStandalone) {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;
      setIosNeedsInstall(true);
      setShow(true);
      return;
    }

    // Don't show if notifications not supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Don't show if already granted — check server subscription
    if (Notification.permission === 'granted') {
      checkSubscription();
      return;
    }
    // Don't show if denied
    if (Notification.permission === 'denied') return;
    // Don't show if dismissed recently (3 days)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

    setShow(true);
  }, []);

  async function checkSubscription() {
    try {
      const res = await fetch('/api/vendor/push');
      const data = await res.json();
      setSubscribed(data.subscribed);
    } catch {
      // ignore
    }
  }

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShow(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');
        alert('Push notifications are not configured yet. Please contact admin.');
        setShow(false);
        return;
      }

      // Get an active service worker registration
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch('/api/vendor/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error('Failed to save subscription');

      setSubscribed(true);
      setShow(false);
    } catch (err) {
      console.error('Push subscription failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Could not enable notifications: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

  if (iosNeedsInstall) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy/10">
            <Bell className="h-4 w-4 text-navy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Get Push Notifications</p>
            <p className="mt-0.5 text-xs text-gray-500">
              To receive booking alerts, add this app to your Home Screen first.
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              Tap the <span className="inline-block align-middle"><svg className="inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12L8 8m4-4l4 4" /></svg></span> Share button, then <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy/10">
          <Bell className="h-4 w-4 text-navy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Enable Notifications</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Get notified instantly when new bookings come in or customers respond.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 disabled:opacity-50 min-h-[36px]"
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 min-h-[36px]"
            >
              Not Now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Manage push subscription from settings-style UI */
export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // On iOS, push only works in standalone (home screen) mode
    const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    if (isIos && !isStandalone) return; // not supported in Safari

    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      checkSubscription();
    }
  }, []);

  async function checkSubscription() {
    try {
      const res = await fetch('/api/vendor/push');
      const data = await res.json();
      setSubscribed(data.subscribed);
    } catch {
      // ignore
    }
  }

  async function toggle() {
    setLoading(true);
    try {
      if (subscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch('/api/vendor/push', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setSubscribed(false);
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error('VAPID key not configured. Contact admin.');

        // Get an active service worker registration
        const registration = await getServiceWorkerRegistration();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const res = await fetch('/api/vendor/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server error ${res.status}`);
        }
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Push toggle failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Could not toggle notifications: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <BellOff className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Push Notifications</p>
            <p className="text-xs text-gray-500">Not supported on this device</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}
      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="h-5 w-5 text-navy" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">Push Notifications</p>
          <p className="text-xs text-gray-500">
            {loading ? 'Updating...' : subscribed ? 'Alerts enabled for new bookings' : 'Enable to get booking alerts'}
          </p>
        </div>
      </div>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${subscribed ? 'bg-navy' : 'bg-gray-300'} ${loading ? 'opacity-50' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${subscribed ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  // First check if there's already an active registration we can use
  const registrations = await navigator.serviceWorker.getRegistrations();
  const active = registrations.find((r) => r.active);
  if (active) return active;

  // Register push-sw.js directly — it's a real static file that handles push events
  // Try /sw.js first (next-pwa build output), then /push-sw.js as fallback
  for (const swPath of ['/sw.js', '/push-sw.js']) {
    try {
      const reg = await navigator.serviceWorker.register(swPath);
      // Wait for it to activate
      await new Promise<void>((resolve, reject) => {
        const sw = reg.installing || reg.waiting || reg.active;
        if (reg.active) { resolve(); return; }
        if (!sw) { reject(new Error('No SW instance')); return; }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
          if (sw.state === 'redundant') reject(new Error('SW became redundant'));
        });
        setTimeout(() => reject(new Error('SW activation timeout')), 10000);
      });
      return reg;
    } catch {
      continue;
    }
  }

  throw new Error('Could not register service worker. Try closing and reopening the app.');
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
