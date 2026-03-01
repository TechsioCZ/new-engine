import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, Open_Sans, Roboto, Rubik } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import { Providers } from "./providers";

const verdana = localFont({
  src: [
    {
      path: "./fonts/Verdana-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Verdana-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-verdana",
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter-font",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Herbatika",
  description: "Herbatika e-shop - přírodní produkty",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sk"
      className={`${verdana.variable} ${openSans.variable} ${inter.variable} ${rubik.variable} ${roboto.variable}`}
    >
      <body className={`text-fg-primary ${verdana.className}`}>
        <Providers>
          <Suspense fallback={<div className="min-h-dvh bg-base">{children}</div>}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
