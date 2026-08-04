"use client"

import Script from "next/script"

import type { GoogleAdsConfig } from "./types"

/** Valid Google Ads ID format: AW-XXXXXXXXX or G-XXXXXXXXX */
const VALID_ADS_ID_PATTERN = /^(AW|G)-[A-Z0-9]+$/i

/**
 * Google Tag (gtag.js) base component
 *
 * Loads the Google Tag script and configures it for Google Ads.
 * Place this component in your root layout.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { GoogleTag } from '@techsio/analytics/google'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <GoogleTag adsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID!} />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function GoogleTag({ adsId, debug = false, nonce }: GoogleAdsConfig) {
  const isValidAdsId =
    typeof adsId === "string" && VALID_ADS_ID_PATTERN.test(adsId)

  if (!adsId) {
    if (debug) {
      console.warn("[GoogleTag] No Ads ID provided, skipping initialization")
    }
    return null
  }

  // Validate adsId format to prevent XSS
  if (!isValidAdsId) {
    if (debug) {
      console.error("[GoogleTag] Invalid Ads ID format:", adsId)
    }
    return null
  }

  return (
    <>
      {/* Load gtag.js from Google */}
      <Script
        id="google-tag-script"
        strategy="afterInteractive"
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${adsId}`}
        onLoad={() => {
          if (debug) {
            console.log("[GoogleTag] gtag.js loaded for ID:", adsId)
          }
        }}
      />
      {/* Initialize gtag */}
      <Script
        id="google-tag-init"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            window.gtag = function gtag(){window.dataLayer.push(arguments);};
            window.gtag('js', new Date());
            window.gtag('config', ${JSON.stringify(adsId)});
          `,
        }}
      />
    </>
  )
}
