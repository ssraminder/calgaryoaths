'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

type Prediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

type GeocodedAddress = {
  formattedAddress: string;
  lat: number;
  lng: number;
  googleMapsEmbed: string;
  mapUrl: string;
};

interface AddressAutocompleteProps {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  /** Called when a user selects a place and it has been geocoded */
  onAddressResolved?: (data: GeocodedAddress) => void;
}

export default function AddressAutocomplete({
  name,
  label,
  defaultValue = '',
  required,
  onAddressResolved,
}: AddressAutocompleteProps) {
  const [value, setValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
    setValue(input);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(input), 300);
  }

  async function handleSelect(prediction: Prediction) {
    setValue(prediction.description);
    setOpen(false);
    setPredictions([]);
    setLoading(true);

    try {
      const res = await fetch(`/api/places/geocode?placeId=${prediction.placeId}`);
      const data = await res.json();

      if (data.formattedAddress) {
        setValue(data.formattedAddress);
        onAddressResolved?.({
          formattedAddress: data.formattedAddress,
          lat: data.lat,
          lng: data.lng,
          googleMapsEmbed: data.googleMapsEmbed,
          mapUrl: data.mapUrl,
        });
      }
    } catch {
      // Keep the selected text even if geocoding fails
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          required={required}
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
          placeholder="Start typing an address..."
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          </div>
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex flex-col"
              >
                <span className="font-medium text-gray-900">{p.mainText}</span>
                <span className="text-xs text-gray-500">{p.secondaryText}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
