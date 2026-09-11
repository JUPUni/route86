import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/data";

export const runtime = "nodejs";

const schema = z.object({
  store_open: z.boolean().optional(),
  accepting_orders: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  delivery_enabled: z.boolean().optional(),
  delivery_fee_cents: z.number().int().min(0).optional(),
  delivery_minimum_cents: z.number().int().min(0).optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  prep_time_minutes: z.number().int().min(0).max(240).optional(),
  announcement: z.string().max(200).nullable().optional(),
  store_whatsapp: z.string().max(30).nullable().optional(),
  store_email: z.string().email().nullable().optional().or(z.literal("")),
  hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string(), closed: z.boolean().optional() })).optional(),
});

export async function GET() {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(req: Request) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  try {
    const patch = { ...parsed.data, store_email: parsed.data.store_email === "" ? null : parsed.data.store_email };
    const settings = await updateSettings(patch);
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
