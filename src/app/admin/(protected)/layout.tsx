import { requireStaff } from "@/lib/require-staff";
import { getSettings, isDemoMode } from "@/lib/data";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [session, settings] = await Promise.all([requireStaff(), getSettings()]);
  return (
    <AdminShell session={session} demo={isDemoMode()} storeOpen={settings.store_open && settings.accepting_orders}>
      {children}
    </AdminShell>
  );
}
