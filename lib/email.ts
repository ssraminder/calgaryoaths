type SendEmailOptions = {
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
};

export async function sendEmail({ to, replyTo, subject, html, fromName, fromEmail }: SendEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const body: Record<string, unknown> = {
    sender: {
      name: fromName ?? 'Calgary Oaths',
      email: fromEmail ?? 'noreply@calgaryoaths.com',
    },
    to: recipients,
    subject,
    htmlContent: html,
  };

  if (replyTo) {
    body.replyTo = { email: replyTo };
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo API error ${res.status}: ${text}`);
  }

  return res.json();
}
