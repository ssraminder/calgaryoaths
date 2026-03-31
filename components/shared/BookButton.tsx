'use client';

import { useBookingModal } from '@/lib/context/BookingModalContext';
import { cn } from '@/lib/utils';

interface BookButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function BookButton({
  label = 'Book Appointment',
  variant = 'primary',
  className,
  size = 'md',
}: BookButtonProps) {
  const { openModal } = useBookingModal();

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variantClasses = {
    primary: 'bg-gold text-white hover:bg-gold-light',
    secondary: 'border-2 border-navy text-navy hover:bg-navy hover:text-white',
    ghost: 'text-gold hover:underline underline-offset-4',
  };

  return (
    <button
      onClick={openModal}
      className={cn(
        'font-body font-medium rounded-btn transition-all duration-200 inline-flex items-center gap-2 uppercase tracking-wide',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {label}
    </button>
  );
}
