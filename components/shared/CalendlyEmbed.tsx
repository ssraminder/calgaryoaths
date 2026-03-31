'use client';

interface CalendlyEmbedProps {
  url: string;
  className?: string;
}

export default function CalendlyEmbed({ url, className }: CalendlyEmbedProps) {
  return (
    <div className={className}>
      <iframe
        src={`${url}?embed_domain=calgaryoaths.com&embed_type=Inline`}
        width="100%"
        height="700"
        frameBorder="0"
        title="Book appointment with Calendly"
        loading="lazy"
      />
    </div>
  );
}
