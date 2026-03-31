import type { Metadata } from 'next';
import JoinForm from './JoinForm';

export const metadata: Metadata = {
  title: 'Join the Calgary Oaths Commissioner Network | Apply Today',
  description:
    'Are you a Commissioner of Oaths or Notary Public in Alberta? Join the Calgary Oaths network and get matched with clients in your area. Apply today.',
  alternates: { canonical: 'https://calgaryoaths.com/join' },
  openGraph: { title: 'Join Our Network | Calgary Oaths', url: 'https://calgaryoaths.com/join' },
};

const valueProps = [
  { icon: '📱', title: 'Get client bookings', desc: 'We handle marketing and lead generation. You focus on commissioning.' },
  { icon: '📣', title: 'We handle the marketing', desc: 'Your name appears on our site and clients find you through our SEO.' },
  { icon: '🕐', title: 'Flexible hours', desc: 'Set your own availability. Accept bookings that fit your schedule.' },
];

export default function JoinPage() {
  return (
    <div className="py-12 lg:py-20">
      <div className="max-content">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-navy mb-4">
            Join Our Commissioner Network
          </h1>
          <p className="text-mid-grey text-xl max-w-xl mx-auto">
            Are you a Commissioner of Oaths or Notary Public in Alberta?
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
          {valueProps.map((v, i) => (
            <div key={i} className="card text-center">
              <span className="text-3xl mb-3 block" aria-hidden="true">{v.icon}</span>
              <p className="font-display font-semibold text-charcoal mb-2">{v.title}</p>
              <p className="text-mid-grey text-sm">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="font-display font-semibold text-2xl text-charcoal mb-6">Application Form</h2>
            <JoinForm />
          </div>
        </div>
      </div>
    </div>
  );
}
