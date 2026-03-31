'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { faqGroups } from '@/lib/data/faq';
import FaqAccordion from '@/components/shared/FaqAccordion';

export default function FaqContent() {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return faqGroups;
    const q = query.toLowerCase();
    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <>
      {/* Search */}
      <div className="relative mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mid-grey" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          className="w-full pl-11 pr-4 py-3.5 border border-border rounded-card bg-white text-charcoal placeholder:text-mid-grey focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm"
          aria-label="Search FAQ"
        />
      </div>

      {/* FAQ groups */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-10">
          {filteredGroups.map((group) => (
            <div key={group.id}>
              <h2 className="font-display font-semibold text-xl text-charcoal mb-4">{group.label}</h2>
              <FaqAccordion items={group.items} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-mid-grey">No questions found for &quot;{query}&quot;.</p>
          <button onClick={() => setQuery('')} className="mt-3 text-gold hover:underline text-sm">
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
