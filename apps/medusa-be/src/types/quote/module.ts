/* Entity: Quote */

export interface ModuleQuote {
  id: string
  status: string
  draft_order_id: string
  order_change_id: string
  cart_id: string
  customer_id: string
  created_at: string
  updated_at: string
}

export interface ModuleCreateQuote {
  draft_order_id: string
  order_change_id: string
  cart_id: string
  customer_id: string
}

export interface ModuleUpdateQuote {
  id: string
  status?: string
}

/* Entity: Message */

export interface ModuleCreateQuoteMessage {
  text: string
  quote_id: string
  admin_id?: string
  customer_id?: string
  item_id?: string | null
}

export interface ModuleQuoteMessage {
  id: string
  text: string
  quote_id: string
  admin_id: string
  customer_id: string
  item_id: string
}
