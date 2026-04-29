'use client';

import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

interface SignaturePadProps {
  onChange?: (dataUrl: string | null) => void;
}

export default function SignaturePad({ onChange }: SignaturePadProps) {
  const ref = useRef<SignatureCanvas | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
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

  function emit() {
    const sig = ref.current;
    if (!sig || sig.isEmpty()) {
      setHasSignature(false);
      onChange?.(null);
      return;
    }
    setHasSignature(true);
    const dataUrl = sig.getTrimmedCanvas().toDataURL('image/png');
    onChange?.(dataUrl);
  }

  function clear() {
    ref.current?.clear();
    setHasSignature(false);
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
          onEnd={emit}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Sign above using your finger or a stylus.</p>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-500 underline hover:text-gray-700"
          disabled={!hasSignature}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
