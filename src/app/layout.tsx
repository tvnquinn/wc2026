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
  title: "World Cup 2026 Prediction Pool",
  description: "World Cup 2026 Prediction Pool",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WC 2026 Pool",
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
