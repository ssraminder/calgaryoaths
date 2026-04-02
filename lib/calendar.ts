/**
 * Calendar links + location helpers for appointment emails.
 */

/** Generate a clickable Google Maps link for an address */
export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Generate HTML for a clickable address with Google Maps icon */
export function locationHtml(address: string, isMobile: boolean, customerAddress?: string): string {
  if (isMobile) {
    const addr = customerAddress || 'Customer location';
    return `<p><strong>Location:</strong> Mobile service — <a href="${googleMapsLink(addr)}" target="_blank" rel="noopener noreferrer" style="color:#C8922A;">${addr} ↗</a></p>`;
  }
  return `<p><strong>Location:</strong> <a href="${googleMapsLink(address)}" target="_blank" rel="noopener noreferrer" style="color:#C8922A;">${address} ↗</a></p>`;
}

type CalendarEventParams = {
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO datetime
  durationMinutes?: number;
};

/** Generate a Google Calendar "Add to Calendar" URL */
export function googleCalendarUrl({
  title,
  description,
  location,
  startTime,
  durationMinutes = 30,
}: CalendarEventParams): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description,
    location,
    ctz: 'America/Edmonton',
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Generate an ICS file content string for Outlook/Apple Calendar */
export function icsContent({
  title,
  description,
  location,
  startTime,
  durationMinutes = 30,
}: CalendarEventParams): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const now = fmt(new Date());

  // Escape special chars in ICS
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calgary Oaths//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    'STATUS:CONFIRMED',
    `UID:${start.getTime()}@calgaryoaths.com`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Generate HTML block with "Add to Calendar" buttons for emails */
export function calendarLinksHtml(params: CalendarEventParams): string {
  const gcalUrl = googleCalendarUrl(params);
  const ics = icsContent(params);
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;

  return `
    <div style="margin:20px 0;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
      <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#1B3A5C;">Add to your calendar</p>
      <div>
        <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer"
          style="display:inline-block;padding:8px 16px;background:#1B3A5C;color:white;text-decoration:none;border-radius:6px;font-size:13px;margin-right:8px;margin-bottom:8px;">
          Google Calendar
        </a>
        <a href="${icsDataUri}" download="appointment.ics"
          style="display:inline-block;padding:8px 16px;background:#C8922A;color:white;text-decoration:none;border-radius:6px;font-size:13px;margin-bottom:8px;">
          Outlook / Apple Calendar
        </a>
      </div>
    </div>
  `;
}
