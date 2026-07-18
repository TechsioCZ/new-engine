"use client"

import Script from "next/script"

import { isHeurekaCountry, normalizeHeurekaCountry } from "./country"
import type { HeurekaCountry } from "./types"

export interface HeurekaProductProps {
  /** Country variant: 'cz' for Heureka.cz, 'sk' for Heureka.sk */
  country?: HeurekaCountry
  /** Enable debug logging */
  debug?: boolean
  /** CSP nonce for inline scripts (optional) */
  nonce?: string
}

/**
 * HeurekaProduct - Script for product detail pages
 *
 * This component loads the Heureka SDK on product pages.
 * It automatically detects clicks from Heureka and stores
 * the tracking cookie (hg_ocm_id) for conversion attribution.
 *
 * Place this component on all product detail pages.
 *
 * @example
 * ```tsx
 * // In product detail page
 * <HeurekaProduct country="cz" />
 * ```
 */
export function HeurekaProduct({
  country = "cz",
  debug = false,
  nonce,
}: HeurekaProductProps) {
  const rawCountry = country as unknown
  const safeCountry = normalizeHeurekaCountry(rawCountry)
  if (debug && !isHeurekaCountry(rawCountry)) {
    console.warn(
      '[HeurekaProduct] Invalid country provided, defaulting to "cz"',
      {
        country: rawCountry,
      }
    )
  }
  const domain = safeCountry === "sk" ? "heureka.sk" : "heureka.cz"

  return (
    <Script
      id={`heureka-product-script-${safeCountry}`}
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function(t, r, a, c, k, i, n, g) {
            t['ROIDataObject'] = k;
            t[k] = t[k] || function() {
              (t[k].q = t[k].q || []).push(arguments)
            };
            t[k].c = i;
            n = r.createElement(a);
            g = r.getElementsByTagName(a)[0];
            n.async = 1;
            n.src = c;
            g.parentNode.insertBefore(n, g);
          })(window, document, 'script',
             ${JSON.stringify(
               `https://${domain}/ocm/sdk.js?version=2&page=product_detail`
             )},
             'heureka', ${JSON.stringify(safeCountry)});
        `,
      }}
    />
  )
}
