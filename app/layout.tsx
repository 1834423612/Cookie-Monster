import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cookie Monster - Browser Cookie Management Made Simple",
  description: "Take control of your browser cookies with Cookie Monster. Analyze, manage, and protect your privacy with our powerful browser extension and dashboard.",
  keywords: ["cookie management", "browser privacy", "cookie analyzer", "browser extension", "privacy tool"],
  authors: [{ name: "Cookie Monster Team" }],
  openGraph: {
    title: "Cookie Monster - Browser Cookie Management Made Simple",
    description: "Take control of your browser cookies with Cookie Monster.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4A90D9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
