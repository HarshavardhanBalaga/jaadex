import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/lib/site";

// Fonts are self-hosted in src/app/fonts (latin subset, WOFF2) so the build does not
// depend on fetching from Google Fonts at build time.
// Body font — Plus Jakarta Sans variable font (weights 400–800), exposed as `--font-jakarta`.
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  weight: "400 800",
  style: "normal",
  variable: "--font-jakarta",
  display: "swap",
});

// Headings — Lato, exposed as `--font-lato` and used by the `font-display` utility.
// Lato ships 100/300/400/700/900 only; we self-host 400 and 700 (see globals.css).
const lato = localFont({
  src: [
    { path: "./fonts/Lato-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Lato-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "JaaDeX — Imagine. Create. Animate.", template: "%s | JaaDeX" },
  description: siteConfig.description,
  icons: { icon: "/logo/fv-jaadex.png", apple: "/logo/fv-jaadex.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. bis_skin_checked, cz-shortcut-listen)
    // add attributes to <html>/<body> before React hydrates. Only these two elements are affected.
    <html lang="en" className={`scroll-smooth motion-reduce:scroll-auto ${jakarta.variable} ${lato.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="bg-mist font-sans text-ink antialiased" suppressHydrationWarning>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
