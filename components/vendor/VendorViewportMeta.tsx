'use client';

import { useEffect } from 'react';

export default function VendorViewportMeta() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const original = viewport?.getAttribute('content') || '';

    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    return () => {
      if (viewport && original) {
        viewport.setAttribute('content', original);
      }
    };
  }, []);

  return null;
}
