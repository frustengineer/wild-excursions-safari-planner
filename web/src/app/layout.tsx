import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AskExpertWidget } from "@/components/AskExpertWidget";

const poppins = localFont({
  src: [
    { path: "../../public/fonts/poppins-400.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/poppins-500.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/poppins-600.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/poppins-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wild Excursions — Jungle Safari Planner",
  description:
    "Plan your jungle safari in 3 easy steps — pick your dates, we recommend the best zones, you enquire.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 pb-24 sm:pb-0">{children}</main>
        <footer className="hidden border-t border-border bg-surface px-4 py-7 text-center text-xs text-muted sm:block">
          Wild Excursions · Recommendations only — our team confirms and books every safari.
        </footer>
        <MobileBottomNav />
        <AskExpertWidget />
      </body>
    </html>
  );
}
