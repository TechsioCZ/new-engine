import type { Metadata } from "next"
import { Inter } from "next/font/google"
import type { PropsWithChildren } from "react"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({
  variable: "--font-inter-font",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Akros",
  description: "Akros e-shop",
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={inter.variable} lang="cs">
      <body className="bg-base text-fg-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
