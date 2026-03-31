const trustItems = [
  { icon: '⭐', text: '106+ Five-Star Reviews' },
  { icon: '✓', text: '2 Certified Commissioners' },
  { icon: '⚡', text: 'Same-Day Service' },
  { icon: '📋', text: 'Document Drafting Included' },
  { icon: '📍', text: '2 Locations + Mobile' },
];

export default function TrustBar() {
  return (
    <section className="bg-white border-b border-border py-4" aria-label="Trust signals">
      <div className="max-content">
        <div className="flex items-center gap-6 overflow-x-auto pb-1 scrollbar-none">
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 flex-shrink-0 text-sm font-medium text-charcoal"
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              <span>{item.text}</span>
              {i < trustItems.length - 1 && (
                <span className="ml-4 text-border hidden sm:block">|</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
