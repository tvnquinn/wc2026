import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-barlow",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "2026 World Cup - Sleepwell Fam",
  description: "Family World Cup Prediction Leaderboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sleepwell WC",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${barlow.variable}`}>
        <Navbar />
        <main className="animate-fade-in">
          {children}
        </main>
      </body>
    </html>
  );
}
