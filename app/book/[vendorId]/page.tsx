import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import VendorBookingForm from '@/components/booking/VendorBookingForm';

type Props = { params: Promise<{ vendorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vendorId } = await params;
  const { data } = await supabase
    .from('co_commissioners')
    .select('name, title, location')
    .eq('id', vendorId)
    .eq('active', true)
    .single();

  if (!data) {
    return { title: 'Book an Appointment | Calgary Oaths' };
  }

  return {
    title: `Book with ${data.name} | ${data.location} | Calgary Oaths`,
    description: `Book an appointment with ${data.name}, ${data.title} in ${data.location}. Same-day service available. Professional document commissioning in Calgary.`,
    alternates: { canonical: `https://calgaryoaths.com/book/${vendorId}` },
    openGraph: {
      title: `Book with ${data.name} | Calgary Oaths`,
      url: `https://calgaryoaths.com/book/${vendorId}`,
    },
  };
}

export default async function VendorBookingPage({ params }: Props) {
  const { vendorId } = await params;

  return (
    <div className="py-12 lg:py-20">
      <div className="max-content max-w-lg mx-auto">
        <div className="card">
          <h2 className="font-display font-bold text-2xl text-navy mb-1">Book an appointment</h2>
          <VendorBookingForm vendorId={vendorId} />
        </div>
      </div>
    </div>
  );
}
