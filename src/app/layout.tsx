import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { PageTracker } from "@/components/analytics/page-tracker";
import "./globals.css";

/** Clash Grotesk — the landing page typeface. One family, weight does the hierarchy. */
const clash = localFont({
  src: "./fonts/ClashGrotesk-Variable.woff2",
  variable: "--font-clash",
  weight: "200 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Olora — Buy $1 of AI credits for less than $1.",
  description:
    "Olora is a live marketplace for discounted AI credits. Spend them on the world's leading AI models through one API, or sell what you don't use.",
  icons: {
    icon: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
  },
  openGraph: {
    title: "Olora — Buy $1 of AI credits for less than $1.",
    description:
      "Olora is a live marketplace for discounted AI credits. Spend them on the world's leading AI models through one API, or sell what you don't use.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

const themeBoot = `(function(){try{var t=localStorage.getItem("olora-theme");if(t!=="light")t="dark";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={clash.variable} data-theme="dark" suppressHydrationWarning>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Script id="olora-theme" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        {children}
        <PageTracker />
        <Analytics />
      </body>
    </html>
  );
}
