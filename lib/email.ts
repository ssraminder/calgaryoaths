type EmailAttachment = {
  /** Filename shown to the recipient (e.g. "signed-terms.pdf"). */
  name: string;
  /** Raw bytes; will be base64-encoded for the Brevo API. */
  content: Buffer | Uint8Array;
};

type SendEmailOptions = {
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  attachments?: EmailAttachment[];
};

export async function sendEmail({ to, replyTo, subject, html, fromName, fromEmail, attachments }: SendEmailOptions) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const recipients = (Array.isArray(to) ? to : [to]).map((email) => ({ email }));

  const body: Record<string, unknown> = {
    sender: {
      name: fromName ?? 'Calgary Oaths',
      email: fromEmail ?? 'noreply@cethos.com',
    },
    to: recipients,
    subject,
    htmlContent: html,
  };

  if (replyTo) {
    body.replyTo = { email: replyTo };
  }

  if (attachments && attachments.length > 0) {
    body.attachment = attachments.map((a) => ({
      name: a.name,
      content: Buffer.from(a.content).toString('base64'),
    }));
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

  const json = (await res.json().catch(() => ({}))) as { messageId?: string } & Record<string, unknown>;
  return json;
}
