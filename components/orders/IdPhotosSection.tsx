'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2, Upload, Check, X } from 'lucide-react';
import type { OrderIdPhoto } from '@/lib/orders/types';

interface Props {
  orderId: string;
  required: boolean;
  photos: OrderIdPhoto[];
  onChange: (next: OrderIdPhoto[]) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function IdPhotosSection({ orderId, required, photos, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let next = photos;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await fileToDataUrl(file);
        const defaultLabel = file.name.replace(/\.[^.]+$/, '');
        const res = await fetch(`/api/orders/${orderId}/id-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_data_url: dataUrl, label: defaultLabel }),
        });
        if (res.ok) {
          const data = await res.json();
          next = [...next, data.photo];
          onChange(next);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Remove this ID photo?')) return;
    const res = await fetch(`/api/orders/${orderId}/id-photos/${photoId}`, { method: 'DELETE' });
    if (res.ok) onChange(photos.filter((p) => p.id !== photoId));
  }

  function startEdit(p: OrderIdPhoto) {
    setEditingId(p.id);
    setEditLabel(p.label || '');
  }

  async function saveLabel(photoId: string) {
    const res = await fetch(`/api/orders/${orderId}/id-photos/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editLabel }),
    });
    if (res.ok) {
      onChange(photos.map((p) => p.id === photoId ? { ...p, label: editLabel } : p));
      setEditingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">ID photos</h3>
          <p className="text-xs text-gray-500">
            {required ? 'Required — front and back of each customer\'s ID.' : 'Optional — upload if you have ID photos.'}
            {' '}Add multiple photos for multi-party orders. Label each one (e.g., "John Doe — front").
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 disabled:opacity-50"
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
          <Camera className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-xs text-gray-500">No ID photos uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative rounded-md border border-gray-200 bg-white overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={p.label} className="w-full h-32 object-cover" />
              <div className="p-2">
                {editingId === p.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1 rounded border border-gray-300 px-1.5 py-1 text-xs"
                      placeholder="Label"
                    />
                    <button onClick={() => saveLabel(p.id)} className="text-green-600 hover:text-green-700">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(p)}
                    className="block w-full text-left text-xs text-gray-600 hover:text-gray-900 truncate"
                    title="Click to edit label"
                  >
                    {p.label || <span className="text-gray-400">Unlabeled — tap to label</span>}
                  </button>
                )}
              </div>
              <button
                onClick={() => deletePhoto(p.id)}
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 hover:bg-red-50 hover:text-red-600 shadow"
                aria-label="Delete photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
