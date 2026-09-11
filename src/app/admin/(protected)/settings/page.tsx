import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Store settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
