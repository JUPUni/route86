import "server-only";

export type WhatsAppResult = { ok: true; provider: string; id: string | null } | { ok: false; provider: string; error: string } | { ok: "skipped"; provider: string; reason: string };

/**
 * Send a WhatsApp message. Provider chosen by WHATSAPP_PROVIDER:
 *  - "twilio": Twilio WhatsApp sender. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886).
 *              Business-initiated messages outside a 24h session need an approved template: set
 *              TWILIO_CONTENT_SID_<EVENT> (e.g. TWILIO_CONTENT_SID_ORDER_READY) and the text is sent as variable {{1}}.
 *  - "meta":   WhatsApp Cloud API. Set META_WA_PHONE_NUMBER_ID, META_WA_ACCESS_TOKEN, optional META_WA_TEMPLATE_<EVENT> + META_WA_TEMPLATE_LANG.
 *  - anything else / unset: skipped (logged, never throws).
 */
export async function sendWhatsApp(to: string, text: string, event: string): Promise<WhatsAppResult> {
  const provider = (process.env.WHATSAPP_PROVIDER || "none").toLowerCase();
  if (provider === "twilio") return sendViaTwilio(to, text, event);
  if (provider === "meta") return sendViaMeta(to, text, event);
  return { ok: "skipped", provider: "none", reason: "WHATSAPP_PROVIDER not configured" };
}

async function sendViaTwilio(to: string, text: string, event: string): Promise<WhatsAppResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { ok: "skipped", provider: "twilio", reason: "Twilio env vars missing" };
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    const contentSid = process.env[`TWILIO_CONTENT_SID_${event.toUpperCase()}`];
    const msg = await client.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to: `whatsapp:${to}`,
      ...(contentSid
        ? { contentSid, contentVariables: JSON.stringify({ "1": text }) }
        : { body: text }),
    });
    return { ok: true, provider: "twilio", id: msg.sid };
  } catch (e) {
    return { ok: false, provider: "twilio", error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendViaMeta(to: string, text: string, event: string): Promise<WhatsAppResult> {
  const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneId || !token) return { ok: "skipped", provider: "meta", reason: "Meta WhatsApp env vars missing" };
  const template = process.env[`META_WA_TEMPLATE_${event.toUpperCase()}`];
  const body = template
    ? {
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "template",
        template: {
          name: template,
          language: { code: process.env.META_WA_TEMPLATE_LANG || "en_US" },
          components: [{ type: "body", parameters: [{ type: "text", text }] }],
        },
      }
    : { messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body: text } };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) return { ok: false, provider: "meta", error: json.error?.message || `HTTP ${res.status}` };
    return { ok: true, provider: "meta", id: json.messages?.[0]?.id ?? null };
  } catch (e) {
    return { ok: false, provider: "meta", error: e instanceof Error ? e.message : String(e) };
  }
}
