import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Anonymous server-side client. Everything privileged happens inside SECURITY DEFINER
 * Postgres functions (see supabase/migrations/0002), so the app never holds a service-role key.
 */
export function getPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
