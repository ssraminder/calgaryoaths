'use client';

import { useEffect, useState } from 'react';

interface TermsRecord {
  id: string;
  form_type: string;
  version: string;
  content_md: string;
}

interface Props {
  formType: 'apostille' | 'notarization';
  initialTerms?: TermsRecord | null;
  accepted: boolean;
  onChange: (accepted: boolean, termsId: string | null) => void;
}

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(''); continue; }
    if (line.startsWith('# ')) { out.push(`<h2 class="text-base font-semibold text-gray-900 mb-2">${line.slice(2)}</h2>`); continue; }
    let html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^\d+\.\s/.test(html)) html = `<li class="mb-2">${html.replace(/^\d+\.\s/, '')}</li>`;
    out.push(`<p class="mb-2 leading-relaxed">${html}</p>`);
  }
  return out.join('');
}

export default function TermsAcceptance({ formType, initialTerms, accepted, onChange }: Props) {
  const [terms, setTerms] = useState<TermsRecord | null>(initialTerms || null);

  useEffect(() => {
    if (initialTerms) { setTerms(initialTerms); return; }
    fetch(`/api/orders/terms/${formType}`).then(async (r) => {
      if (!r.ok) return;
      const j = await r.json();
      if (j.terms) setTerms(j.terms);
    }).catch(() => {});
  }, [formType, initialTerms]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 max-h-72 overflow-y-auto text-sm text-gray-700">
        {terms ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(terms.content_md) }} />
        ) : (
          <p className="text-gray-400">Loading terms…</p>
        )}
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked, terms?.id || null)}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-navy focus:ring-navy"
          disabled={!terms}
        />
        <span className="text-sm text-gray-800">
          I have read and agree to the terms and conditions above
          {terms && <span className="ml-1 text-xs text-gray-400">({terms.version})</span>}
        </span>
      </label>
    </div>
  );
}
