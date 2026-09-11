"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const field = "mt-1 w-full rounded-2xl border-2 border-cream/15 bg-charcoal px-4 py-3 text-cream focus:border-orange focus:outline-none";

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (demo) {
        const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: password }) });
        if (!res.ok) throw new Error((await res.json()).error || "Wrong passcode");
      } else {
        const supabase = getBrowserSupabase();
        if (!supabase) throw new Error("Supabase is not configured");
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw new Error(err.message);
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {demo ? (
        <p className="rounded-xl bg-orange/15 p-3 text-xs text-orange-bright">Demo mode: no database connected. Enter the staff passcode (default <code>route86</code>).</p>
      ) : (
        <label className="block text-xs font-black uppercase tracking-widest text-cream/70">Email<input type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
      )}
      <label className="block text-xs font-black uppercase tracking-widest text-cream/70">{demo ? "Passcode" : "Password"}<input type="password" required className={field} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <p className="rounded-xl bg-red-900/50 p-3 text-sm font-bold text-red-200">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
