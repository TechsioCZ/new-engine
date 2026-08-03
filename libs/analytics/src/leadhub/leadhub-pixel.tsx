"use client"

import Script from "next/script"
import { useEffect } from "react"

import type { LeadhubConfig } from "./types"

/** Valid Leadhub tracking ID format (alphanumeric, hyphens, underscores) */
const VALID_TRACKING_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export type LeadhubPixelProps = LeadhubConfig

/**
 * Leadhub Pixel initialization component
 *
 * Place this component in your root layout to initialize the Leadhub tracking pixel.
 * It will automatically track pageviews on every page.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { LeadhubPixel } from '@techsio/analytics/leadhub'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <LeadhubPixel trackingId={process.env.NEXT_PUBLIC_LEADHUB_TRACKING_ID} />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function LeadhubPixel({ trackingId, debug, nonce }: LeadhubPixelProps) {
  const isValidTrackingId =
    typeof trackingId === "string" && VALID_TRACKING_ID_PATTERN.test(trackingId)

  useEffect(() => {
    if (!(debug && isValidTrackingId)) {
      return
    }
    console.log("[Leadhub] Initialized with tracking ID:", trackingId)
  }, [debug, isValidTrackingId, trackingId])

  if (!trackingId) {
    if (debug) {
      console.warn("[Leadhub] No tracking ID provided, skipping initialization")
    }
    return null
  }

  // Validate trackingId format to prevent XSS
  if (!isValidTrackingId) {
    if (debug) {
      console.error("[Leadhub] Invalid tracking ID format:", trackingId)
    }
    return null
  }

  // Leadhub init script - creates window.lhi() function and loads agent.js
  // Parameters: w=window, d=document, x='script', n='lhi', u=agentUrl, t=trackingId
  const trackingIdJson = JSON.stringify(trackingId)
  const initScript = `
			(function(w,d,x,n,u,t,f,s,o){
				f='LHInsights';
				w[n]=w[f]=w[f]||function(n,d){
					(w[f].q=w[f].q||[]).push([n,d])
				};
				w[f].l=1*new Date();
				w[f].t=t;
				s=d.createElement(x);
				s.async=1;
				s.src=u+'?t='+t;
				o=d.getElementsByTagName(x)[0];
				o.parentNode.insertBefore(s,o)
			})(window,document,'script','lhi','https://www.lhinsights.com/agent.js',${trackingIdJson});
			lhi('pageview');
		`

  return (
    <Script
      id="leadhub-pixel"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: initScript }}
    />
  )
}
