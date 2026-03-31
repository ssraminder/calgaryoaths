import { ShieldCheck, FileEdit, Languages, Smartphone } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Certified & Legally Authorized',
    description:
      'Both commissioners are appointed by the Province of Alberta. Your documents will be accepted by government agencies, courts, and financial institutions across Canada.',
  },
  {
    icon: FileEdit,
    title: 'Document Drafting Included',
    description:
      'No need to prepare your own document. We draft affidavits, statutory declarations, travel consent letters, and invitation letters from scratch — included in the price.',
  },
  {
    icon: Languages,
    title: 'Multilingual Commissioners',
    description:
      'We serve Calgary\'s diverse communities in English, Punjabi, Hindi, and Gujarati. No language barrier between you and your legal documents.',
  },
  {
    icon: Smartphone,
    title: 'Flexible Hours & Mobile Service',
    description:
      'Open until 9 PM on weekdays and Saturdays. If you can\'t come to us, we come to you — home, office, hospital, or care facility across all Calgary neighbourhoods.',
  },
];

export default function WhyUs() {
  return (
    <section className="py-16 lg:py-24 bg-bg">
      <div className="max-content">
        <div className="text-center mb-12">
          <h2 className="section-heading text-3xl md:text-4xl">Why Calgary Oaths</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="flex gap-5 p-6 bg-white rounded-card shadow-card">
                <div className="w-12 h-12 rounded-btn bg-navy/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-navy" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-charcoal mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-mid-grey text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
