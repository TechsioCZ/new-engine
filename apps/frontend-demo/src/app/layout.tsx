import type { Metadata } from "next"

import "../tokens/index.css"
import type * as React from "react"

import { DisclaimerWrapper } from "@/components/disclaimer-wrapper"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "Frontend Demo",
  description: "Demo application using the UI library",
}

const brandThemeScript = `(function(){try{var k=localStorage.getItem("ui-brand");var e=document.documentElement;if(k==="neo"){e.setAttribute("data-theme","neo");}else{e.removeAttribute("data-theme");}}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen min-w-layout-min flex-col">
        <script dangerouslySetInnerHTML={{ __html: brandThemeScript }} />
        <Providers>
          <HeaderWrapper
            logo={{ text: "Demo Store", icon: "icon-[mdi--store]" }}
          />
          <main className="flex-1">
            <DisclaimerWrapper />
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
