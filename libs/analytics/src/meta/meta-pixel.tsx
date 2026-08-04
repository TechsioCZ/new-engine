"use client"

import Script from "next/script"

import type { MetaPixelConfig } from "./types"

/** Valid Meta Pixel ID format (numeric string) */
const VALID_PIXEL_ID_PATTERN = /^\d+$/

/**
 * Meta Pixel base component
 *
 * Loads the Meta Pixel script and initializes it with PageView tracking.
 * Place this component in your root layout.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { MetaPixel } from '@techsio/analytics/meta'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <MetaPixel pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID!} />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function MetaPixel({ pixelId, debug = false, nonce }: MetaPixelConfig) {
  if (!pixelId) {
    if (debug) {
      console.warn("[MetaPixel] No pixel ID provided, skipping initialization")
    }
    return null
  }

  // Validate pixelId format to prevent XSS
  if (!VALID_PIXEL_ID_PATTERN.test(pixelId)) {
    if (debug) {
      console.error("[MetaPixel] Invalid pixel ID format:", pixelId)
    }
    return null
  }

  if (debug) {
    console.log("[MetaPixel] Initializing with ID:", pixelId)
  }

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', ${JSON.stringify(pixelId)});
            fbq('track', 'PageView');
          `,
        }}
      />
      {/* noscript fallback for users with JS disabled */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
