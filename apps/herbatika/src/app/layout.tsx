import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
} from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { Metadata } from "next"
import { Inter, Open_Sans, Roboto, Rubik } from "next/font/google"
import localFont from "next/font/local"
import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"
import "./globals.css"
import { Providers } from "./providers"

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
})

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter-font",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Herbatica",
  description: "Herbatica e-shop - prírodné produkty",
}

type LayoutShellProps = Readonly<{
  children: React.ReactNode
  dehydratedState: DehydratedState
  initialRegion?: RegionInfo | null
}>

function LayoutShell({
  children,
  dehydratedState,
  initialRegion = null,
}: LayoutShellProps) {
  return (
    <Providers initialRegion={initialRegion}>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<div className="min-h-dvh bg-base" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </HydrationBoundary>
    </Providers>
  )
}

async function ResolvedLayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { queryClient, region } = await getRegionServerContext()
  try {
    await fetchServerCategories(
      queryClient,
      buildCategoryListParams({
        page: 1,
        limit: CATEGORY_TREE_LIMIT,
        fields: CATEGORY_TREE_FIELDS,
      })
    )
  } catch (error) {
    console.error("Failed to prefetch storefront categories", error)
  }

  return (
    <LayoutShell
      dehydratedState={dehydrate(queryClient)}
      initialRegion={region}
    >
      {children}
    </LayoutShell>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      className={`${verdana.variable} ${openSans.variable} ${inter.variable} ${rubik.variable} ${roboto.variable}`}
      lang="sk"
    >
      <body className={`text-fg-primary ${verdana.className}`}>
        <Suspense
          // Avoid rendering a fallback app shell here. During streaming, it can
          // coexist with the resolved shell and duplicate header popover ids.
          fallback={<div className="min-h-dvh bg-base" />}
        >
          <ResolvedLayoutShell>{children}</ResolvedLayoutShell>
        </Suspense>
      </body>
    </html>
  )
}
