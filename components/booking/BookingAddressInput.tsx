'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Prediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

interface BookingAddressInputProps {
  value: string;
  onChange: (val: string) => void;
  onAddressSelected: (address: string) => void;
  onManualCalculate: () => void;
  loading: boolean;
}

export default function BookingAddressInput({
  value,
  onChange,
  onAddressSelected,
  onManualCalculate,
  loading,
}: BookingAddressInputProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setOpen(true);
    } catch {
      setPredictions([]);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    onChange(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(input), 300);
  }

  async function handleSelect(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);

    // Geocode the selected place to get the formatted address
    try {
      const res = await fetch(`/api/places/geocode?placeId=${prediction.placeId}`);
      const data = await res.json();
      const addr = data.formattedAddress || prediction.description;
      onChange(addr);
      onAddressSelected(addr);
    } catch {
      onChange(prediction.description);
      onAddressSelected(prediction.description);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-charcoal mb-1">Your address *</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Start typing your address..."
            value={value}
            onChange={handleChange}
            onFocus={() => predictions.length > 0 && setOpen(true)}
            autoComplete="off"
            className="w-full border border-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          {open && predictions.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-60 overflow-y-auto">
              {predictions.map((p) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gold/5 flex flex-col"
                  >
                    <span className="font-medium text-charcoal">{p.mainText}</span>
                    <span className="text-xs text-mid-grey">{p.secondaryText}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          disabled={!value || loading}
          onClick={onManualCalculate}
          className="rounded-btn bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50 flex-shrink-0"
        >
          {loading ? '...' : 'Calculate'}
        </button>
      </div>
    </div>
  );
}
