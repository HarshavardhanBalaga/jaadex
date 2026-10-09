import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "remixicon/fonts/remixicon.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/lib/site";

// Body font — Plus Jakarta Sans (self-hosted, no layout shift).
// Headings keep the rounded system stack via the `font-display` utility.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "JaaDeX — Imagine. Create. Animate.", template: "%s | JaaDeX" },
  description: siteConfig.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`scroll-smooth motion-reduce:scroll-auto ${jakarta.variable}`} data-scroll-behavior="smooth">
      <body className="bg-mist font-sans text-ink antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
