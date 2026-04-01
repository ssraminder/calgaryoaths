'use client';

import { Calendar } from 'lucide-react';

export default function VendorCalendarPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Calendar Integration</h1>
      <p className="text-sm text-gray-500">
        Connect your Google or Microsoft calendar to automatically sync your busy times.
        When connected, time slots that conflict with your personal calendar will be automatically blocked.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Calendar className="h-10 w-10" />
          <div>
            <p className="font-medium text-gray-900">Coming Soon</p>
            <p className="text-sm text-gray-500">Google Calendar and Microsoft Outlook integration is being set up. You'll be able to connect your calendar here.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>In the meantime:</strong> Set your availability in the <a href="/vendor/availability" className="underline">Availability</a> page.
          If a customer books a time that doesn't work for you, use the "Propose Different Time" option on the booking detail page.
        </p>
      </div>
    </div>
  );
}
