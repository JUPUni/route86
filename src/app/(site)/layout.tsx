import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  return (
    <>
      <Nav storeOpen={settings.store_open && settings.accepting_orders} />
      {settings.announcement && (
        <div className="bg-orange text-white text-center text-sm font-bold px-4 py-2">{settings.announcement}</div>
      )}
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
