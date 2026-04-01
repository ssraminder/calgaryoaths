'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TagInputProps {
  name: string;
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  allowCustom?: boolean;
}

export default function TagInput({
  name,
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Type to add…',
  allowCustom = true,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = input
    ? suggestions.filter(
        (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
      )
    : suggestions.filter((s) => !value.includes(s));

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput('');
      setOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's an exact match in filtered suggestions, use it
      const match = filtered.find((s) => s.toLowerCase() === input.toLowerCase());
      if (match) {
        addTag(match);
      } else if (allowCustom && input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      {/* Tag display + input */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[38px] rounded-md border border-gray-300 px-2 py-1.5 focus-within:border-navy focus-within:ring-1 focus-within:ring-navy cursor-text bg-white"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-navy/10 text-navy px-2.5 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-navy/40 hover:text-red-500 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent py-0.5"
        />
      </div>

      {/* Suggestions dropdown */}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
          {filtered.slice(0, 15).map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
