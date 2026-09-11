import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth";
import { updateMenuItem } from "@/lib/data";

export const runtime = "nodejs";

const schema = z.object({
  available: z.boolean().optional(),
  featured: z.boolean().optional(),
  price_cents: z.number().int().min(0).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(400).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/menu/[id]">) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await updateMenuItem(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
