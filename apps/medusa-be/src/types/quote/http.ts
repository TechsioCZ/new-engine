import type { FindParams, PaginatedResponse } from "@medusajs/framework/types"

import type { QueryQuote } from "./query"
import type { ModuleQuoteFilters } from "./service"

/* Filters */

export interface QuoteFilterParams extends FindParams, ModuleQuoteFilters {}

/* Admin */
export interface AdminQuoteResponse {
  quote: QueryQuote
}

export interface AdminCreateQuoteMessage {
  text: string
  item_id?: string
}

/* Store */

export interface StoreQuoteResponse {
  quote: QueryQuote
}

export type StoreQuotesResponse = PaginatedResponse<{
  quotes: QueryQuote[]
}>
