import type { Metadata, Viewport } from "next";
import { Anton, Quicksand, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fetelabstest2.site"),
  title: {
    default: `${BRAND.name} · ${BRAND.tagline} · Anguilla`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.taglineLong}, by ${BRAND.chef}. Order online for pickup or delivery. Next to AXA Airport, George Hill, Anguilla.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32" },
    ],
    apple: "/icons/icon-180.png",
  },
  openGraph: {
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: `Order online. ${BRAND.taglineLong}. George Hill, Anguilla.`,
    images: [{ url: "/brand/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/og.png"],
  },
};

export const viewport: Viewport = { themeColor: "#04080A" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${quicksand.variable} ${nunito.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-charcoal">{children}</body>
    </html>
  );
}
