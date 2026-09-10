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

export const metadata: Metadata = {
  title,
  description,
  applicationName: "DORT",
  openGraph: {
    title,
    description:
      "Every token approval gets an end date you choose. The permission removes itself when the time arrives.",
    type: "website",
    siteName: "DORT",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Every token approval gets an end date you choose. The permission removes itself when the time arrives.",
  },
  icons: {
    icon: "/favicon.svg",
  },
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
