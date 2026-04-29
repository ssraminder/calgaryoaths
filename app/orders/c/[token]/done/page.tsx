import { Check } from 'lucide-react';

export default function CustomerDonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Thank you!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your information and signature have been received. Please hand the device back to the staff member to complete payment.
        </p>
      </div>
    </div>
  );
}
