import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AppShell } from "@/components/AppShell";
import { FundingReel } from "@/components/FundingReel";

// distinctive pairing (not Inter/Roboto): Bricolage carries the headlines with
// an engineered character; Hanken is a warm, highly legible body for coursework.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans-var" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: { default: "HALO", template: "%s · HALO" },
  description:
    "PROJECT : VANTA HALO. A mastery-gated ascent from zero to embodied-intelligence researcher.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${jbmono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <FundingReel />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
