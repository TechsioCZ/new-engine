/**
 * Leadhub Pixel Types
 * Czech CDP (Customer Data Platform) for e-commerce
 * @see https://podpora.leadhub.co
 */

// ============================================================================
// Configuration
// ============================================================================

export interface LeadhubConfig {
  /** Leadhub tracking ID (e.g., 'xeShUnk3RmyLHb8') */
  trackingId: string
  /** Enable debug logging (never enable in production). */
  debug?: boolean
  /** CSP nonce for inline scripts (optional) */
  nonce?: string
}

// ============================================================================
// Product Types
// ============================================================================

export interface LeadhubProduct {
  /** Product ID (required) */
  product_id: string
  /** Quantity (optional) */
  quantity?: number
  /** Product value/price (optional) */
  value?: number | string
  /** Currency code (optional, e.g., 'CZK') */
  currency?: string
}

// ============================================================================
// Event Parameters
// ============================================================================

/** ViewContent - when viewing a product detail page */
export interface LeadhubViewContentParams {
  /** Array of products being viewed */
  products: Pick<LeadhubProduct, "product_id">[]
}

/** ViewCategory - when viewing a category page */
export interface LeadhubViewCategoryParams {
  /** Category path (e.g., 'Žena > Kabáty > Zimní kabáty') */
  category: string
}

/** SetCart - when cart contents change */
export interface LeadhubSetCartParams {
  /** Array of products in cart */
  products: LeadhubProduct[]
}

/** Identify - when user logs in or registers (contains PII, handle with care). */
export interface LeadhubIdentifyParams {
  /** User email (required, unique identifier) */
  email: string
  /** Newsletter/list subscriptions (required) */
  subscribe: string[]
  /** User ID (optional) */
  user_id?: string | number
  /** First name (optional) */
  first_name?: string
  /** Last name (optional) */
  last_name?: string
  /** Phone number (optional) */
  phone?: string
}

/** Address for Purchase event */
export interface LeadhubAddress {
  /** Street address */
  street?: string
  /** City */
  city?: string
  /** Postal/ZIP code */
  zip?: string
  /** Country code (e.g., 'CZ') */
  country_code?: string
}

/** Purchase - when order is completed (may contain PII, handle with care). */
export interface LeadhubPurchaseParams {
  /** Customer email (optional - recommended for customer identification) */
  email?: string
  /** Total order value (required) */
  value: number | string
  /** Currency code (required, e.g., 'CZK') */
  currency: string
  /** Array of purchased products (required) */
  products: LeadhubProduct[]
  /** Order ID (optional but recommended) */
  order_id?: string
  /** User ID (optional) */
  user_id?: string | number
  /** Newsletter/list subscriptions (optional) */
  subscribe?: string[]
  /** First name (optional) */
  first_name?: string
  /** Last name (optional) */
  last_name?: string
  /** Phone number (optional) */
  phone?: string
  /** Shipping/billing address (optional) */
  address?: LeadhubAddress
}

// ============================================================================
// Adapter Extras Interface
// ============================================================================

/**
 * Leadhub-specific tracking methods beyond the standard AnalyticsAdapter interface.
 * All methods return boolean for consistency with core adapter pattern.
 */
export interface LeadhubExtras {
  /** Track category page view */
  trackViewCategory: (params: LeadhubViewCategoryParams) => boolean
  /** Identify user on login/registration */
  trackIdentify: (params: LeadhubIdentifyParams) => boolean
  /** Track cart state changes */
  trackSetCart: (params: LeadhubSetCartParams) => boolean
  /** Track page views */
  trackPageview: () => boolean
}

// ============================================================================
// Global Window Extension
// ============================================================================

export type LeadhubEventName =
  | "pageview"
  | "ViewContent"
  | "ViewCategory"
  | "SetCart"
  | "Identify"
  | "Purchase"

export interface LeadhubFunction {
  (event: "pageview"): void
  (event: "ViewContent", params: LeadhubViewContentParams): void
  (event: "ViewCategory", params: LeadhubViewCategoryParams): void
  (event: "SetCart", params: LeadhubSetCartParams): void
  (event: "Identify", params: LeadhubIdentifyParams): void
  (event: "Purchase", params: LeadhubPurchaseParams): void
  /** Queue for events before SDK loads */
  q?: [string, unknown][]
  /** Timestamp of initialization */
  l?: number
  /** Tracking ID */
  p?: string
}

declare global {
  interface Window {
    lhi?: LeadhubFunction
    LHInsights?: LeadhubFunction
  }
}
