'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FaqItem } from '@/lib/data/faq';

interface FaqAccordionProps {
  items: FaqItem[];
  className?: string;
}

export default function FaqAccordion({ items, className }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-card overflow-hidden bg-white">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-bg transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="font-body font-medium text-charcoal text-sm leading-snug">
              {item.question}
            </span>
            <ChevronDown
              size={18}
              className={cn(
                'text-gold flex-shrink-0 transition-transform duration-200',
                openIndex === i && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>
          {openIndex === i && (
            <div className="px-5 pb-5">
              <p className="text-mid-grey text-sm leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
