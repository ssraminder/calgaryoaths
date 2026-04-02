'use client';

import { Phone } from 'lucide-react';
import { trackPhoneClick } from '@/lib/analytics';

type PhoneLinkProps = {
  location: string;
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
};

export default function PhoneLink({ location, className, showIcon = false, children }: PhoneLinkProps) {
  return (
    <a
      href="tel:5876000746"
      onClick={() => trackPhoneClick(location)}
      className={className}
    >
      {showIcon && <Phone size={13} className="inline mr-1" />}
      {children ?? '(587) 600-0746'}
    </a>
  );
}
