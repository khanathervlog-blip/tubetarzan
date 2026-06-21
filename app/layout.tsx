import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TubeTarzan — Swing to the Top of YouTube",
  description:
    "TubeTarzan finds viral video ideas in your niche in 60 seconds — with real VPH data, 14x outlier signals, AI-generated titles, hooks, and thumbnail text. The affordable VidIQ alternative.",
  keywords: [
    "YouTube viral ideas",
    "VidIQ alternative",
    "YouTube SEO",
    "video ideas",
    "YouTube automation",
    "VPH calculator",
    "outlier ratio",
  ],
  openGraph: {
    title: "TubeTarzan — Swing to the Top of YouTube",
    description:
      "Find viral YouTube video ideas in 60 seconds. Real VPH data, AI-generated titles, hooks, and thumbnail text.",
    url: "https://tubetarzan.com",
    siteName: "TubeTarzan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TubeTarzan — Swing to the Top of YouTube",
    description:
      "Find viral YouTube video ideas in 60 seconds. The affordable VidIQ alternative.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} antialiased bg-[#080808] text-white`}
      >
        {children}
      </body>
    </html>
  );
}
