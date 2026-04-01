const trustItems = [
  { icon: '⭐', text: '106+ Five-Star Reviews' },
  { icon: '✓', text: '2 Certified Commissioners' },
  { icon: '⚡', text: 'Same-Day Service' },
  { icon: '📋', text: 'Document Drafting Available' },
  { icon: '📍', text: '2 Locations + Mobile' },
];

export default function TrustBar() {
  // Duplicate items so the marquee loops seamlessly
  const doubled = [...trustItems, ...trustItems];

  return (
    <section className="bg-white border-b border-border py-4 overflow-hidden" aria-label="Trust signals">
      <div className="flex items-center animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 flex-shrink-0 text-sm font-medium text-charcoal mx-6"
          >
            <span className="text-base" aria-hidden="true">{item.icon}</span>
            <span>{item.text}</span>
            <span className="ml-6 text-border">|</span>
          </div>
        ))}
      </div>
    </section>
  );
}
