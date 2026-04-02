import type { Metadata } from 'next';
import SchemaSEO from '@/components/shared/SchemaSEO';
import { allFaqItems } from '@/lib/data/faq';
import FaqContent from './FaqContent';
import PhoneLink from '@/components/shared/PhoneLink';

export const metadata: Metadata = {
  title: 'Commissioner of Oaths FAQ Calgary | Calgary Oaths',
  description:
    'Answers to common questions about Commissioner of Oaths services in Calgary — what to bring, how it works, pricing, and more.',
  alternates: { canonical: 'https://calgaryoaths.com/faq' },
  openGraph: { title: 'FAQ | Calgary Oaths', url: 'https://calgaryoaths.com/faq' },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allFaqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <SchemaSEO schema={faqSchema} />
      <div className="py-12 lg:py-20">
        <div className="max-content max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-mid-grey text-lg">
              Everything you need to know about Commissioner of Oaths services in Calgary.
            </p>
          </div>

          <FaqContent />

          {/* Still have questions CTA */}
          <div className="mt-14 bg-navy rounded-card p-6 md:p-8 text-center">
            <h2 className="font-display font-bold text-2xl text-white mb-3">Still have a question?</h2>
            <p className="text-white/70 mb-5">
              Call us at <PhoneLink location="faq" className="text-gold font-medium" /> or use the form on our contact page.
            </p>
            <a href="/contact" className="btn-primary inline-flex">Get in touch</a>
          </div>
        </div>
      </div>
    </>
  );
}
