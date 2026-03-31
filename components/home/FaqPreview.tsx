import Link from 'next/link';
import FaqAccordion from '@/components/shared/FaqAccordion';
import { faqGroups } from '@/lib/data/faq';
import { ArrowRight } from 'lucide-react';

// Pick the top 5 most common questions
const previewItems = [
  faqGroups[0].items[0], // What is a Commissioner of Oaths?
  faqGroups[1].items[0], // Appointment vs walk-in?
  faqGroups[2].items[3], // Do I sign before arriving?
  faqGroups[3].items[0], // How much does it cost?
  faqGroups[4].items[0], // Travel consent letter requirements
];

export default function FaqPreview() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-content">
        <div className="text-center mb-10">
          <h2 className="section-heading text-3xl md:text-4xl">Common questions</h2>
        </div>

        <div className="max-w-2xl mx-auto">
          <FaqAccordion items={previewItems} />

          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="btn-ghost text-base"
            >
              See all questions <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
