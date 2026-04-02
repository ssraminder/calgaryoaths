'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

const DISMISS_KEY = 'co_push_prompt_dismissed';

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if notifications not supported
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    // Don't show if already granted
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

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('VAPID public key not configured');
        setShow(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/vendor/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setSubscribed(true);
      setShow(false);
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  if (!show) return null;

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
        if (permission !== 'granted') {
          setLoading(false);
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { setLoading(false); return; }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        await fetch('/api/vendor/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
        setSubscribed(true);
      }
    } catch (err) {
      console.error('Push toggle failed:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!supported) return null;

  return (
    <label className="flex items-center justify-between rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="h-5 w-5 text-navy" />
        ) : (
          <BellOff className="h-5 w-5 text-gray-400" />
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">Push Notifications</p>
          <p className="text-xs text-gray-500">
            {subscribed ? 'Alerts enabled for new bookings' : 'Enable to get booking alerts'}
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative h-6 w-11 rounded-full transition-colors ${subscribed ? 'bg-navy' : 'bg-gray-300'} disabled:opacity-50`}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${subscribed ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  );
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
