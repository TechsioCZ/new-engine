import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "TechSio Frontend Template",
  description: "Clean Next.js starter on the TechSio Design System",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html className="light" data-theme="business" lang="en">
      <body className="bg-base text-fg-primary antialiased">{children}</body>
    </html>
  )
}
