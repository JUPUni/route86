import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getServerSupabase } from "./supabase/server";
import { getAdminSupabase } from "./supabase/admin";
import { isSupabaseConfigured } from "./supabase/env";

export type StaffSession = { email: string; name: string | null; role: string; mode: "supabase" | "demo" };

const DEMO_COOKIE = "r86_staff";

function secret() {
  const s = process.env.AUTH_SECRET || "route86-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

/** Demo-mode passcode login (used only when Supabase is not configured). */
export async function demoLogin(passcode: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSCODE || "route86";
  if (passcode !== expected) return false;
  const token = await new SignJWT({ email: "staff@demo.local", role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  const store = await cookies();
  store.set(DEMO_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  return true;
}

export async function demoLogout() {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
}

async function demoSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(DEMO_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { email: String(payload.email), name: "Demo staff", role: String(payload.role || "staff"), mode: "demo" };
  } catch {
    return null;
  }
}

/** Resolve the current staff member, or null. Works in both Supabase and demo modes. */
export async function getStaffSession(): Promise<StaffSession | null> {
  if (!isSupabaseConfigured()) return demoSession();
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;
  const admin = getAdminSupabase();
  if (!admin) return null;
  const { data: staff } = await admin.from("staff").select("email,name,role").ilike("email", email).maybeSingle();
  if (!staff) return null;
  return { email: staff.email, name: staff.name, role: staff.role, mode: "supabase" };
}
