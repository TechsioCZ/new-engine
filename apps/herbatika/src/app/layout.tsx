import type { Metadata } from "next";
import type { RegionInfo } from "@techsio/storefront-data/shared/region";
import localFont from "next/font/local";
import { Inter, Open_Sans, Roboto, Rubik } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { getRegionServerContext } from "@/lib/storefront/ssr/context";
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
  description: "Herbatika e-shop - prírodné produkty",
};

type LayoutShellProps = Readonly<{
  children: React.ReactNode;
  initialRegion?: RegionInfo | null;
}>;

function LayoutShell({ children, initialRegion = null }: LayoutShellProps) {
  return (
    <Providers initialRegion={initialRegion}>
      <Suspense fallback={<div className="min-h-dvh bg-base" />}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </Providers>
  );
}

async function ResolvedLayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { region } = await getRegionServerContext();

  return <LayoutShell initialRegion={region}>{children}</LayoutShell>;
}

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
        <Suspense
          fallback={
            <LayoutShell>
              <div className="min-h-dvh bg-base" />
            </LayoutShell>
          }
        >
          <ResolvedLayoutShell>{children}</ResolvedLayoutShell>
        </Suspense>
      </body>
    </html>
  );
}
