import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import ChatWidget from "@/components/support/ChatWidget";
import Tracker from "@/components/analytics/Tracker";
import TubeTarzanSplash from "@/components/brand/TubeTarzanSplash";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TubeTarzan — Find Viral YouTube Video Ideas in 60 Seconds",
    template: "%s | TubeTarzan",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: "TubeTarzan — Find Viral YouTube Video Ideas in 60 Seconds",
    description:
      "Real views-per-hour and outlier scores show what's working in your niche. Get the title, hook, script and thumbnail text ready to film.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TubeTarzan — Find Viral YouTube Video Ideas in 60 Seconds",
    description: "Outlier scores + VPH + AI titles, hooks and scripts. The affordable VidIQ alternative.",
  },
  // Google Search Console: set GOOGLE_SITE_VERIFICATION (the content="..." value of the HTML-tag method)
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} antialiased bg-[#080808] text-white`}
      >
        <TubeTarzanSplash />
        {children}
        <ChatWidget />
        <Tracker />
      </body>
    </html>
  );
}
