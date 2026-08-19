import { Head, Html, Main, NextScript } from "next/document"
import { storefrontFontVariables, verdana } from "@/app/storefront-fonts"

export default function HerbatikaDocument() {
  return (
    <Html className={storefrontFontVariables}>
      <Head />
      <body className={`text-fg-primary ${verdana.className}`}>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
