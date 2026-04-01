import type { Metadata } from 'next';
import CommissionerCard from '@/components/shared/CommissionerCard';
import { getCommissioners, dbToCommissioner } from '@/lib/data/db';
import { commissioners as fallbackCommissioners } from '@/lib/data/commissioners';

export const metadata: Metadata = {
  title: 'About Calgary Oaths | Two Certified Commissioners in Calgary',
  description:
    'Calgary Oaths provides professional Commissioner of Oaths services across Calgary. Two certified commissioners, multilingual service in English, Punjabi, Hindi, and Gujarati.',
  alternates: { canonical: 'https://calgaryoaths.com/about' },
  openGraph: { title: 'About Calgary Oaths', url: 'https://calgaryoaths.com/about' },
};

const languages = [
  { lang: 'English', flag: '🇨🇦', note: 'Primary language for all services' },
  { lang: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🌏', note: 'Fluent — both commissioners' },
  { lang: 'Hindi (हिंदी)', flag: '🌏', note: 'Fluent — both commissioners' },
  { lang: 'Gujarati (ગુજરાતી)', flag: '🌏', note: 'Fluent — Amrita Shah' },
];

export default async function AboutPage() {
  const dbRows = await getCommissioners();
  const commissioners = dbRows.length > 0
    ? dbRows.map(dbToCommissioner)
    : fallbackCommissioners;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Header */}
        <div className="max-w-3xl mb-14">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-5">About Calgary Oaths</h1>
          <p className="text-mid-grey text-lg leading-relaxed mb-4">
            Calgary Oaths is a professional Commissioner of Oaths and Notary Public service based in Calgary, Alberta.
            We operate two offices — one in Downtown Calgary and one in NE Calgary — with extended evening hours
            and same-day service available at both locations.
          </p>
          <p className="text-mid-grey text-lg leading-relaxed">
            We started Calgary Oaths to make legal document services accessible and approachable.
            No intimidating law office environment. No unexplained fees. Just straightforward,
            professional help with the documents you need — drafted correctly, commissioned the same day.
          </p>
        </div>

        {/* Commissioners */}
        <section className="mb-14">
          <h2 className="font-display font-semibold text-3xl text-charcoal mb-6">Our Commissioners</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {commissioners.map((c) => (
              <CommissionerCard key={c.id} commissioner={c} size="full" />
            ))}
          </div>
        </section>

        {/* Languages */}
        <section className="mb-14">
          <h2 className="font-display font-semibold text-3xl text-charcoal mb-4">Languages we serve</h2>
          <p className="text-mid-grey leading-relaxed mb-6 max-w-2xl">
            Calgary is one of the most culturally diverse cities in Canada, and our commissioners reflect that.
            We serve clients in four languages — making legal document services accessible to Calgary&apos;s
            South Asian community without language barriers.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {languages.map((l, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-card shadow-card border border-border">
                <span className="text-2xl" aria-hidden="true">{l.flag}</span>
                <div>
                  <p className="font-medium text-charcoal">{l.lang}</p>
                  <p className="text-sm text-mid-grey">{l.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our approach */}
        <section className="mb-14">
          <h2 className="font-display font-semibold text-3xl text-charcoal mb-4">Our approach</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-mid-grey leading-relaxed">
            <p>
              We believe that getting a document commissioned should be as easy as visiting a neighbour.
              You tell us what you need, we draft the document, you sign it in front of the commissioner, and
              you leave with a properly commissioned document — done in 15–30 minutes.
            </p>
            <p>
              Drafting is included in our prices. We use plain, clear language that matches what the receiving
              organization needs. No legal jargon for its own sake, no unnecessary complications.
              If you have questions, we answer them clearly before you sign anything.
            </p>
          </div>
        </section>

        {/* Cethos */}
        <section className="bg-navy/5 border border-navy/10 rounded-card p-6 md:p-8">
          <h2 className="font-display font-semibold text-xl text-charcoal mb-3">Part of Cethos Solutions</h2>
          <p className="text-mid-grey leading-relaxed">
            Calgary Oaths is operated by <strong className="text-charcoal">Cethos Solutions Inc.</strong>, a Calgary-based
            professional services company. Cethos Solutions manages the operations, technology, and client experience
            behind Calgary Oaths, ensuring consistent, professional service at both locations.
          </p>
        </section>
      </div>
    </div>
  );
}
