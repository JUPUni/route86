import "server-only";

export type EmailResult = { ok: true; provider: string; id: string | null } | { ok: false; provider: string; error: string } | { ok: "skipped"; provider: string; reason: string };

/** Send an email through Resend. Set RESEND_API_KEY and EMAIL_FROM (e.g. "Route 86 <orders@route86.ai>"). */
export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: "skipped", provider: "resend", reason: "RESEND_API_KEY / EMAIL_FROM missing" };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { ok: false, provider: "resend", error: error.message };
    return { ok: true, provider: "resend", id: data?.id ?? null };
  } catch (e) {
    return { ok: false, provider: "resend", error: e instanceof Error ? e.message : String(e) };
  }
}
