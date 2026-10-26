import { MapPin, ExternalLink } from 'lucide-react';

type Props = {
  deliveryMode: string | null;
  locationName: string | null;
  locationAddress: string | null;
  customerAddress?: string | null;
  facilityName?: string | null;
  /** 'row' renders dt/dd rows for a <dl>; 'block' renders a standalone card section. */
  variant?: 'row' | 'block';
};

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Where a booking takes place: office name + address, or the customer's address for mobile. */
export default function BookingLocation({
  deliveryMode,
  locationName,
  locationAddress,
  customerAddress,
  facilityName,
  variant = 'row',
}: Props) {
  const isMobile = deliveryMode === 'mobile';
  const isVirtual = deliveryMode === 'virtual';
  const heading = isMobile ? 'Mobile service' : isVirtual ? 'Virtual (video call)' : locationName;
  const address = isMobile ? customerAddress : isVirtual ? null : locationAddress;

  const body = (
    <div className={variant === 'row' ? 'text-right' : ''}>
      {heading && <p className="font-medium text-gray-900">{heading}</p>}
      {facilityName && isMobile && <p className="text-gray-700">{facilityName}</p>}
      {address ? (
        <a
          href={mapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 text-navy hover:underline"
        >
          <span>{address}</span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        </a>
      ) : (
        !heading && <p className="text-gray-400">—</p>
      )}
    </div>
  );

  if (variant === 'block') {
    return (
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-gold" />
        {body}
      </div>
    );
  }

  return (
    <div className="flex justify-between gap-4">
      <dt className="flex-shrink-0 text-gray-500">Location</dt>
      <dd className="min-w-0 max-w-[65%] break-words">{body}</dd>
    </div>
  );
}
