'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, Image, CheckCircle } from 'lucide-react';

type Doc = {
  id: string;
  type: 'customer_id' | 'commissioned_document';
  file_url: string;
  file_name: string;
  uploaded_at: string;
};

interface DocumentUploadProps {
  bookingId: string;
  documents: Doc[];
  onDocumentsChange: (docs: Doc[]) => void;
  disabled?: boolean;
}

export default function DocumentUpload({ bookingId, documents, onDocumentsChange, disabled }: DocumentUploadProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const customerIdRef = useRef<HTMLInputElement>(null);
  const commDocRef = useRef<HTMLInputElement>(null);

  const customerIds = documents.filter((d) => d.type === 'customer_id');
  const commDocs = documents.filter((d) => d.type === 'commissioned_document');

  async function handleUpload(file: File, type: 'customer_id' | 'commissioned_document') {
    setUploading(type);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const res = await fetch(`/api/vendor/bookings/${bookingId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const doc = await res.json();
        onDocumentsChange([...documents, doc]);
      }
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/vendor/bookings/${bookingId}/upload?docId=${docId}`, { method: 'DELETE' });
    onDocumentsChange(documents.filter((d) => d.id !== docId));
  }

  const isImage = (name: string) => /\.(jpg|jpeg|png|heic|webp)$/i.test(name);

  return (
    <div className="space-y-4">
      {/* Customer ID */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            Customer ID
            {customerIds.length > 0 && <CheckCircle size={14} className="text-green-500" />}
          </label>
          <button
            type="button"
            disabled={disabled || uploading === 'customer_id'}
            onClick={() => customerIdRef.current?.click()}
            className="text-xs text-navy hover:text-navy/70 font-medium disabled:opacity-50"
          >
            {uploading === 'customer_id' ? 'Uploading...' : '+ Upload'}
          </button>
          <input
            ref={customerIdRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, 'customer_id');
              e.target.value = '';
            }}
          />
        </div>
        {customerIds.length === 0 ? (
          <div
            onClick={() => !disabled && customerIdRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
          >
            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Upload customer&apos;s government-issued photo ID</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {customerIds.map((d) => (
              <div key={d.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {isImage(d.file_name) ? <Image size={14} className="text-green-600" /> : <FileText size={14} className="text-green-600" />}
                <span className="text-xs text-green-800 flex-1 truncate">{d.file_name}</span>
                {!disabled && (
                  <button type="button" onClick={() => handleDelete(d.id)} className="text-green-400 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commissioned Documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            Commissioned Documents
            {commDocs.length > 0 && <CheckCircle size={14} className="text-green-500" />}
          </label>
          <button
            type="button"
            disabled={disabled || uploading === 'commissioned_document'}
            onClick={() => commDocRef.current?.click()}
            className="text-xs text-navy hover:text-navy/70 font-medium disabled:opacity-50"
          >
            {uploading === 'commissioned_document' ? 'Uploading...' : '+ Upload'}
          </button>
          <input
            ref={commDocRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach((f) => handleUpload(f, 'commissioned_document'));
              }
              e.target.value = '';
            }}
          />
        </div>
        {commDocs.length === 0 ? (
          <div
            onClick={() => !disabled && commDocRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-gray-300 transition-colors"
          >
            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500">Upload photos of the signed &amp; sealed documents</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {commDocs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                {isImage(d.file_name) ? <Image size={14} className="text-green-600" /> : <FileText size={14} className="text-green-600" />}
                <span className="text-xs text-green-800 flex-1 truncate">{d.file_name}</span>
                {!disabled && (
                  <button type="button" onClick={() => handleDelete(d.id)} className="text-green-400 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
