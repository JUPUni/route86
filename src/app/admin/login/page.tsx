import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Staff sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getStaffSession()) redirect("/admin");
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-charcoal px-6 py-12 text-cream overflow-hidden">
      <div className="grain absolute inset-0" />
      <div className="relative w-full max-w-sm rounded-[2rem] border-2 border-orange bg-ink p-8 shadow-[8px_8px_0_0_#d95a00]">
        <Logo className="mx-auto w-40" />
        <h1 className="display mt-4 text-center text-4xl">Staff sign in</h1>
        <p className="mt-1 text-center text-sm text-cream/60">Live orders, menu and store settings.</p>
        <LoginForm demo={isDemoMode()} />
      </div>
    </main>
  );
}
