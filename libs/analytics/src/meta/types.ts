/**
 * Meta Pixel TypeScript definitions
 * Based on: https://developers.facebook.com/docs/meta-pixel/reference
 */

// Standard e-commerce events
export type MetaPixelStandardEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "AddToWishlist"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "Search"

// Parameters for ViewContent event
export interface MetaViewContentParams {
  content_ids?: string[]
  content_type?: "product" | "product_group"
  content_name?: string
  content_category?: string
  currency?: string
  value?: number
}

// Parameters for AddToCart event
export interface MetaAddToCartParams {
  content_ids?: string[]
  content_type?: "product" | "product_group"
  content_name?: string
  currency?: string
  value?: number
  contents?: {
    id: string
    quantity: number
    item_price?: number
  }[]
}

// Parameters for InitiateCheckout event
export interface MetaInitiateCheckoutParams {
  content_ids?: string[]
  content_type?: "product" | "product_group"
  currency?: string
  value?: number
  num_items?: number
  contents?: {
    id: string
    quantity: number
    item_price?: number
  }[]
}

// Parameters for Purchase event (currency and value are REQUIRED)
export interface MetaPurchaseParams {
  currency: string
  value: number
  content_ids?: string[]
  content_type?: "product" | "product_group"
  num_items?: number
  contents?: {
    id: string
    quantity: number
    item_price?: number
  }[]
}

// fbq function signature
export interface MetaPixelFbq {
  (action: "init", pixelId: string): void
  (
    action: "track",
    event: MetaPixelStandardEvent,
    params?: Record<string, unknown>
  ): void
  (action: "trackCustom", event: string, params?: Record<string, unknown>): void
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[][]
  loaded?: boolean
  version?: string
  push?: (...args: unknown[]) => void
}

// Extend Window interface
declare global {
  interface Window {
    fbq?: MetaPixelFbq
    _fbq?: MetaPixelFbq
  }
}

export interface MetaPixelConfig {
  pixelId: string
  debug?: boolean
  /**
   * Optional CSP nonce passed to the injected `<Script>` tag.
   * Use this when your app uses a strict Content Security Policy.
   */
  nonce?: string
}
