const steps = [
  {
    number: '1',
    title: 'Book online or call',
    description:
      'Choose your commissioner by location — Downtown Calgary or NE Calgary. Same-day appointments available.',
  },
  {
    number: '2',
    title: 'Bring your ID and document',
    description:
      "We draft it if you don't have one — just bring your government-issued photo ID and the information you need.",
  },
  {
    number: '3',
    title: 'Done in minutes',
    description:
      'Commissioned and sealed on the spot. Most appointments take 15–30 minutes.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-content">
        <div className="text-center mb-12">
          <h2 className="section-heading text-3xl md:text-4xl">How it works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-border" aria-hidden="true" />

          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center relative">
              <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center mb-4 z-10">
                <span className="text-gold font-display font-bold text-xl">{step.number}</span>
              </div>
              <h3 className="font-display font-semibold text-lg text-charcoal mb-2">{step.title}</h3>
              <p className="text-mid-grey text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-mid-grey text-sm mt-10">
          Walk-ins welcome at both locations during business hours.
        </p>
      </div>
    </section>
  );
}
