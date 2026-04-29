'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, RefreshCw, Check } from 'lucide-react';

interface Props {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onTokenIssued?: () => void;
}

export default function HandoffModal({ orderId, open, onClose, onTokenIssued }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/orders/${orderId}/handoff`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate handoff');
      const data = await res.json();
      setUrl(data.url);
      setExpiresAt(data.expiresAt);
      const qr = await QRCode.toDataURL(data.url, { width: 280, margin: 1, color: { dark: '#1B3A5C', light: '#FFFFFF' } });
      setQrDataUrl(qr);
      onTokenIssued?.();
    } catch (err) {
      console.error(err);
      alert('Failed to generate link');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !url) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Hand off to customer tablet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {qrDataUrl ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Handoff QR" className="rounded-md border border-gray-200" />
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              {loading ? 'Generating link…' : 'Tap "Generate" to create a link'}
            </div>
          )}
          {url && (
            <>
              <div className="rounded-md bg-gray-50 p-3 text-xs break-all text-gray-700">{url}</div>
              <p className="text-xs text-gray-500">
                Open this link on the customer&apos;s tablet, or have them scan the QR code.
                {expiresAt && ` Link expires ${new Date(expiresAt).toLocaleTimeString()}.`}
              </p>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copy}
              disabled={!url}
              className="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {url ? 'Regenerate' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
