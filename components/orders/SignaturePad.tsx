'use client';

import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const ref = useRef<SignatureCanvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [saved, setSaved] = useState(false);
  const [size, setSize] = useState({ w: 600, h: 200 });

  useEffect(() => {
    function recompute() {
      const w = wrapperRef.current?.clientWidth || 600;
      setSize({ w, h: Math.max(180, Math.round(w * 0.32)) });
    }
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  function handleBegin() {
    if (saved) {
      setSaved(false);
      onChange?.(null);
    }
  }

  function handleEnd() {
    setHasInk(!ref.current?.isEmpty());
  }

  function save() {
    const sig = ref.current;
    if (!sig || sig.isEmpty()) return;
    const dataUrl = sig.getCanvas().toDataURL('image/png');
    setSaved(true);
    onChange?.(dataUrl);
  }

  function clear() {
    ref.current?.clear();
    setHasInk(false);
    setSaved(false);
    onChange?.(null);
  }

  return (
    <div className="space-y-2">
      <div
        ref={wrapperRef}
        className="rounded-md border-2 border-dashed border-gray-300 bg-white touch-none select-none"
      >
        <SignatureCanvas
          ref={(r) => { ref.current = r; }}
          penColor="#1B3A5C"
          canvasProps={{
            width: size.w,
            height: size.h,
            className: 'block w-full',
            style: { width: '100%', height: size.h, touchAction: 'none' },
          }}
          onBegin={handleBegin}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Sign above using your finger or a stylus.</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clear}
            className="text-xs text-gray-500 underline hover:text-gray-700 disabled:opacity-40 disabled:no-underline"
            disabled={!hasInk}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!hasInk || saved}
            className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 disabled:bg-gray-300 disabled:text-gray-500"
          >
            {saved ? 'Saved' : 'Save signature'}
          </button>
        </div>
      </div>
    </div>
  );
}
