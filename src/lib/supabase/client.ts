"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!cached) cached = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
