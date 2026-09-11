/**
 * Public Supabase connection details. These are safe to ship in client bundles (the anon key
 * only ever hits row-level-security-protected tables and SECURITY DEFINER functions), so the
 * production project is baked in as a default. Override with NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_ANON_KEY to point at another project, or set NEXT_PUBLIC_DEMO_MODE=1
 * to run with the in-memory demo store and no database at all.
 */
const DEFAULT_URL = "https://xcknmpgiondscrgysyfb.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhja25tcGdpb25kc2NyZ3lzeWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwODUzODgsImV4cCI6MjEwNDY2MTM4OH0.IrpK1nURw-eTn-AqYKjXieCqto0SCky_SP7JQKQb5x4";

const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export const SUPABASE_URL = demo ? "" : process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_ANON_KEY = demo ? "" : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

/** True when a Supabase project is in use. When false the app runs in demo mode. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
