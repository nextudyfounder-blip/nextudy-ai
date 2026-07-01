// Server-only Resend helpers. Import only from server routes / server functions.

const RESEND_BASE = "https://api.resend.com";

function apiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return key;
}

export async function sendEmail(input: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
}) {
  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      reply_to: input.reply_to,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[resend] send failed", res.status, body);
    throw new Error(`Resend send failed: ${res.status}`);
  }
  return body as { id?: string };
}

export async function addToAudience(input: {
  audienceId: string;
  email: string;
  firstName?: string;
}) {
  const res = await fetch(`${RESEND_BASE}/audiences/${input.audienceId}/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      email: input.email,
      first_name: input.firstName,
      unsubscribed: false,
    }),
  });
  // 200/201 = added, 409 = already exists — both fine.
  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => "");
    console.warn("[resend] audience add non-fatal", res.status, body);
  }
}
