import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geist = localFont({ src: "./fonts/geist-latin.woff2", variable: "--font-geist", display: "swap" });
const mono = localFont({ src: "./fonts/geist-mono-latin.woff2", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Numa · Learn by listening", template: "%s · Numa" },
  description: "Source-grounded audio learning for understanding, comparison, and presentations.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
