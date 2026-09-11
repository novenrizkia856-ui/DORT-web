import type { Metadata, Viewport } from "next";
import { Newsreader, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Newsreader for editorial headlines, Archivo for the contrast word,
   IBM Plex Mono for labels, addresses and diagram text. */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-newsreader",
  display: "swap",
});
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plexmono",
  display: "swap",
});

const title = "DORT · Token Approvals That Expire";
const description =
  "DORT gives every ERC 20 token approval a self chosen expiry date. Sign one free message and the permission removes itself when the time arrives. Built for Robinhood Chain.";

const social =
  "Every token approval gets an end date you choose. The permission removes itself when the time arrives.";

/* A social card has to be an absolute URL. Use the domain if one is configured, otherwise the
   one Vercel exposes at build time, and fall back to localhost for a local build. */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const ogImage = {
  url: "/brand/og.png",
  width: 1200,
  height: 630,
  alt: "DORT. Every token approval gets an end date you choose.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "DORT",
  openGraph: {
    title,
    description: social,
    type: "website",
    siteName: "DORT",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: social,
    images: [ogImage],
  },
  /* The tab and home screen icons come from app/icon.png and app/apple-icon.png. */
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* The font variables go on <html> so the composite tokens declared on
       :root in globals.css can resolve against them. */
    <html
      lang="en"
      className={`${newsreader.variable} ${archivo.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
