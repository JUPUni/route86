import type { Metadata, Viewport } from "next";
import { Anton, Quicksand, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/notify/templates";

/**
 * The FetePass strings, deliberately local rather than added to BRAND. BRAND is the
 * restaurant's own identity and still drives every screen; the icons, manifest, page
 * title and link preview are the surfaces that carry FetePass. Keeping them here means
 * the two cannot be confused for one source of truth, and the four places that repeat
 * these strings stay in step.
 */
const FETEPASS = { name: "FetePass", tagline: "One pass for every fete" } as const;

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  // siteUrl() rather than reading NEXT_PUBLIC_SITE_URL here: this deployment sets that
  // variable to an EMPTY STRING, which `??` does not treat as absent, so `new URL("")`
  // threw and every Vercel build failed while CI stayed green (Actions does not set the
  // variable at all, so the fallback fired there). siteUrl() tests truthiness and falls
  // back to VERCEL_PROJECT_PRODUCTION_URL -- it already knew about this project's empty
  // env overrides, which is why there should not be a second resolver.
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${FETEPASS.name} · ${FETEPASS.tagline}`,
    template: `%s · ${FETEPASS.name}`,
  },
  // The description keeps the facts that are still true of this app -- what it does and
  // where it is -- and drops the restaurant's name and chef, which the title no longer
  // carries. Nothing here claims anything about FetePass beyond the tagline given.
  description: `${FETEPASS.tagline}. Order online for pickup or delivery. Next to AXA Airport, George Hill, Anguilla.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32" },
    ],
    apple: "/icons/icon-180.png",
  },
  // The link preview carries the FetePass lockup, so its title and description match it.
  openGraph: {
    title: FETEPASS.name,
    description: FETEPASS.tagline,
    images: [{ url: "/brand/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: FETEPASS.name,
    description: FETEPASS.tagline,
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
