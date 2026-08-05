/**
 * Heureka Conversion Tracking Types
 * Documentation: https://sluzby.heureka.cz/napoveda/mereni-konverzi/
 */

export type HeurekaCountry = "cz" | "sk"

export interface HeurekaConfig {
  /** API key from Heureka admin panel */
  apiKey: string
  /** Country variant: 'cz' for Heureka.cz, 'sk' for Heureka.sk */
  country?: HeurekaCountry
  /** Enable debug logging */
  debug?: boolean
}

export interface HeurekaProductItem {
  /** Product ID (ITEM_ID from feed) */
  id: string
  /** Product name */
  name: string
  /** Unit price with VAT */
  priceWithVat: number
  /** Quantity */
  quantity: number
}

export interface HeurekaOrderParams {
  /** Unique order ID */
  orderId: string
  /** Products in the order */
  products: HeurekaProductItem[]
  /** Total order value with VAT */
  totalWithVat: number
  /** Currency code - required per Heureka documentation */
  currency: string
}

/**
 * Heureka SDK function signature
 */
export interface HeurekaFunction {
  (command: "authenticate", apiKey: string): void
  (command: "set_order_id", orderId: string): void
  (
    command: "add_product",
    productId: string,
    productName: string,
    priceWithVat: string,
    quantity: string,
  ): void
  (command: "set_total_vat", totalWithVat: string): void
  (command: "set_currency", currency: string): void
  (command: "send", type: "Order"): void
  /** Queue for commands before SDK loads */
  q?: unknown[]
  /** Country code */
  c?: string
}

declare global {
  interface Window {
    heureka?: HeurekaFunction
    ROIDataObject?: string
  }
}
