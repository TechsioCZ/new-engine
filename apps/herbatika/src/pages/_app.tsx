import type { AppProps } from "next/app"
import "@/app/globals.css"

export default function HerbatikaPagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
