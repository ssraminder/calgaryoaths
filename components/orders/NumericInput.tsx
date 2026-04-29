'use client';

import { useEffect, useState } from 'react';

const baseClass = 'w-full rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy';

/**
 * Integer input optimised for mobile.
 * Uses type="text" + inputMode="numeric" so Android shows the digit pad
 * (native type="number" frequently displays the alphabet keyboard on Android Chrome).
 */
export function IntegerInput({
  value,
  min,
  max,
  onChange,
  className,
  placeholder,
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState<string>(value == null ? '' : String(value));

  useEffect(() => {
    if (value == null) { setText(''); return; }
    if (parseInt(text, 10) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        setText(cleaned);
        if (cleaned === '') return;
        let n = parseInt(cleaned, 10);
        if (Number.isNaN(n)) return;
        if (min != null && n < min) n = min;
        if (max != null && n > max) n = max;
        onChange(n);
      }}
      onBlur={() => {
        if (text === '' && min != null) {
          setText(String(min));
          onChange(min);
        }
      }}
      className={className || baseClass}
    />
  );
}

/**
 * Decimal currency input. Accepts user input in dollars (e.g. "12.50") and
 * emits the value in cents (e.g. 1250). Uses inputMode="decimal" for the
 * mobile decimal keypad.
 */
export function DecimalInput({
  cents,
  onChange,
  className,
  placeholder,
  allowNegative = false,
}: {
  cents: number | null | undefined;
  onChange: (cents: number) => void;
  className?: string;
  placeholder?: string;
  allowNegative?: boolean;
}) {
  const dollars = (cents ?? 0) / 100;
  const [text, setText] = useState<string>(cents == null ? '' : dollars.toFixed(2));

  useEffect(() => {
    const parsed = parseFloat(text);
    const expected = (cents ?? 0) / 100;
    if (!Number.isFinite(parsed) || Math.abs(parsed - expected) > 0.005) {
      setText(cents == null ? '' : ((cents ?? 0) / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={text}
      placeholder={placeholder ?? '0.00'}
      onChange={(e) => {
        let v = e.target.value;
        // Allow only digits, one dot, and optional leading minus
        v = v.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, '');
        // Collapse multiple dots
        const parts = v.split('.');
        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
        // Limit to 2 decimal places
        if (v.includes('.')) {
          const [a, b] = v.split('.');
          v = a + '.' + (b || '').slice(0, 2);
        }
        setText(v);
        if (v === '' || v === '-' || v === '.') return;
        const num = parseFloat(v);
        if (Number.isFinite(num)) onChange(Math.round(num * 100));
      }}
      onBlur={() => {
        if (text === '' || text === '-' || text === '.') {
          setText('0.00');
          onChange(0);
          return;
        }
        const num = parseFloat(text);
        if (Number.isFinite(num)) setText(num.toFixed(2));
      }}
      className={className || baseClass}
    />
  );
}
