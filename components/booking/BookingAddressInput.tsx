// Google Places autocomplete address input for mobile booking flow.
// Fetches suggestions from /api/places/autocomplete, geocodes on selection,
// and auto-triggers travel fee calculation. Falls back gracefully if Places API unavailable.
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin } from 'lucide-react';

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
  travelFeeData?: {
    travelFeeCents: number;
    distanceKm: number | null;
    distanceText?: string;
    durationText?: string;
    error?: string;
    fallback?: boolean;
  } | null;
}

export default function BookingAddressInput({
  value,
  onChange,
  onAddressSelected,
  onManualCalculate,
  loading,
  travelFeeData,
}: BookingAddressInputProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [placesAvailable, setPlacesAvailable] = useState(true);
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
    if (input.length < 3 || !placesAvailable) {
      setPredictions([]);
      return;
    }
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (data.error) {
        setPlacesAvailable(false);
        setPredictions([]);
        return;
      }
      setPredictions(data.predictions ?? []);
      if ((data.predictions ?? []).length > 0) setOpen(true);
    } catch {
      setPlacesAvailable(false);
      setPredictions([]);
    }
  }, [placesAvailable]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    onChange(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(input), 300);
  }

  async function handleSelect(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);

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
    <div ref={wrapperRef} className="relative space-y-2">
      <label className="block text-sm font-medium text-charcoal mb-1">Your address *</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Enter your full address, e.g. 220 Red Sky Terrace NE, Calgary"
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
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gold/5 flex items-start gap-2"
                  >
                    <MapPin size={14} className="text-mid-grey flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-charcoal">{p.mainText}</span>
                      <span className="text-xs text-mid-grey block">{p.secondaryText}</span>
                    </div>
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
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {/* Travel fee result with distance */}
      {travelFeeData && (
        <div className="bg-gold/5 border border-gold/20 rounded-btn p-3 text-sm">
          <div className="flex justify-between text-charcoal">
            <span>
              Travel fee
              {travelFeeData.distanceKm != null && (
                <span className="text-mid-grey font-normal">
                  {' '}({travelFeeData.distanceText}{travelFeeData.durationText ? ` · ~${travelFeeData.durationText}` : ''})
                </span>
              )}
            </span>
            <span className="font-semibold text-gold">${(travelFeeData.travelFeeCents / 100).toFixed(2)}</span>
          </div>
          {travelFeeData.distanceKm == null && (
            <p className="text-xs text-amber-600 mt-1">Could not calculate exact distance. Showing minimum travel fee.</p>
          )}
        </div>
      )}
    </div>
  );
}
