"use client"

import Script from "next/script"
import { useEffect, useRef } from "react"

import { isHeurekaCountry, normalizeHeurekaCountry } from "./country"
import type { HeurekaCountry, HeurekaProductItem } from "./types"

/** Max retries for SDK polling (50 × 100ms = 5 seconds) */
const MAX_POLL_RETRIES = 50

export interface HeurekaOrderProps {
  /** API key from Heureka admin panel */
  apiKey: string
  /** Unique order ID */
  orderId: string
  /** Products in the order */
  products: HeurekaProductItem[]
  /** Total order value with VAT */
  totalWithVat: number
  /** Currency code (default: CZK) */
  currency?: string
  /** Country variant: 'cz' for Heureka.cz, 'sk' for Heureka.sk */
  country?: HeurekaCountry
  /** Enable debug logging */
  debug?: boolean
  /** CSP nonce for inline scripts (optional) */
  nonce?: string
}

/**
 * HeurekaOrder - Conversion tracking for thank you page
 *
 * This component loads the Heureka SDK and sends order data
 * for conversion tracking. Place this on your order confirmation page.
 *
 * @example
 * ```tsx
 * <HeurekaOrder
 *   apiKey={process.env.NEXT_PUBLIC_HEUREKA_API_KEY}
 *   orderId={order.id}
 *   products={order.items.map(item => ({
 *     id: item.variant_id,
 *     name: item.title,
 *     priceWithVat: item.unit_price,
 *     quantity: item.quantity
 *   }))}
 *   totalWithVat={order.total}
 *   currency="CZK"
 * />
 * ```
 */
export const HeurekaOrder = ({
  apiKey,
  orderId,
  products,
  totalWithVat,
  currency = "CZK",
  country = "cz",
  debug = false,
  nonce,
}: HeurekaOrderProps) => {
  const rawCountry: unknown = country
  const safeCountry = normalizeHeurekaCountry(rawCountry)
  if (debug && !isHeurekaCountry(rawCountry)) {
    console.warn(
      '[HeurekaOrder] Invalid country provided, defaulting to "cz"',
      {
        country: rawCountry,
      },
    )
  }
  const domain = safeCountry === "sk" ? "heureka.sk" : "heureka.cz"
  const sendKey = `${safeCountry}:${orderId}`
  const sentKey = useRef<string | null>(null)
  const hasApiKey = typeof apiKey === "string" && apiKey.length > 0
  const hasOrderId = typeof orderId === "string" && orderId.length > 0

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      cancelled = true
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    if (sentKey.current === sendKey) {
      return cleanup
    }
    if (!hasApiKey || !hasOrderId || products.length === 0) {
      if (debug) {
        console.warn("[HeurekaOrder] Missing required data:", {
          apiKey: hasApiKey,
          orderId: hasOrderId,
          products: products.length,
        })
      }
      return cleanup
    }

    // Wait for heureka SDK to be ready
    let retries = 0
    const sendOrder = () => {
      // Early exit if component unmounted or already sent
      if (cancelled || sentKey.current === sendKey) {
        return
      }

      const { heureka } = window
      if (typeof heureka !== "function") {
        retries += 1
        if (retries > MAX_POLL_RETRIES) {
          if (debug) {
            console.warn(
              "[HeurekaOrder] SDK failed to load after 5s, giving up",
            )
          }
          return
        }
        if (debug) {
          console.log("[HeurekaOrder] Waiting for SDK...")
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        timeoutId = setTimeout(sendOrder, 100)
        return
      }

      sentKey.current = sendKey

      if (debug) {
        console.log("[HeurekaOrder] Sending order:", {
          currency,
          orderId,
          products,
          totalWithVat,
        })
      }

      // Authenticate with API key
      heureka("authenticate", apiKey)

      // Set order ID
      heureka("set_order_id", orderId)

      // Add each product
      for (const product of products) {
        heureka(
          "add_product",
          product.id,
          product.name,
          String(product.priceWithVat),
          String(product.quantity),
        )
      }

      // Set total and currency
      heureka("set_total_vat", String(totalWithVat))
      heureka("set_currency", currency)

      // Send the order
      heureka("send", "Order")

      if (debug) {
        console.log("[HeurekaOrder] Order sent successfully")
      }
    }

    // Start checking for SDK
    sendOrder()

    return cleanup
  }, [
    apiKey,
    orderId,
    products,
    totalWithVat,
    currency,
    debug,
    sendKey,
    hasApiKey,
    hasOrderId,
  ])

  if (!hasApiKey) {
    if (debug) {
      console.warn("[HeurekaOrder] No API key provided, skipping")
    }
    return null
  }

  return (
    <Script
      id={`heureka-order-script-${safeCountry}`}
      strategy="afterInteractive"
      nonce={nonce}
    >
      {`
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
             `https://${domain}/ocm/sdk.js?version=2&page=thank_you`,
           )},
           'heureka', ${JSON.stringify(safeCountry)});
      `}
    </Script>
  )
}
