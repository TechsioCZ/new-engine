/**
 * Google Ads / gtag.js TypeScript definitions
 * Based on: https://developers.google.com/tag-platform/gtagjs/reference
 */

// Google Ads configuration
export interface GoogleAdsConfig {
  /** Google tag ID (Google Ads: AW-XXXXXXXXX, GA4: G-XXXXXXXXXX) */
  adsId: string
  /** Enable debug mode */
  debug?: boolean
  /** CSP nonce for inline scripts (optional) */
  nonce?: string
}

// Conversion event parameters
export interface GoogleAdsConversionParams {
  /** Conversion label (from Google Ads) */
  send_to: string
  /** Conversion value */
  value?: number
  /** Currency code (ISO 4217) */
  currency?: string
  /** Transaction ID for deduplication */
  transaction_id?: string
}

// E-commerce item for remarketing
// Based on: https://developers.google.com/tag-platform/gtagjs/reference/events
export interface GoogleAdsItem {
  item_id: string
  item_name?: string
  item_brand?: string
  item_category?: string
  price?: number
  quantity?: number
}

// View item parameters (remarketing)
export interface GoogleAdsViewItemParams {
  currency?: string
  value?: number
  items: GoogleAdsItem[]
}

// Add to cart parameters (remarketing)
export interface GoogleAdsAddToCartParams {
  currency?: string
  value?: number
  items: GoogleAdsItem[]
}

// Begin checkout parameters (remarketing)
export interface GoogleAdsBeginCheckoutParams {
  currency?: string
  value?: number
  items: GoogleAdsItem[]
}

// Purchase parameters (conversion + remarketing)
export interface GoogleAdsPurchaseParams {
  /** Transaction ID - required for deduplication */
  transaction_id: string
  /** Total value */
  value: number
  /** Currency code */
  currency: string
  /** Items purchased - required per Google Ads documentation */
  items: GoogleAdsItem[]
}

// gtag function signature
export interface GtagFunction {
  (command: "js", date: Date): void
  (
    command: "config" | "event",
    targetOrEventName: string,
    params?: object,
  ): void
  (command: "set", params: object): void
}

// Extend Window interface
declare global {
  interface Window {
    gtag?: GtagFunction
    dataLayer?: unknown[]
  }
}
