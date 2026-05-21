export type ActionRequiredSummary = {
  orders: {
    count: number
  }
  customers: {
    count: number
  }
}

export type ActionRequiredOrder = {
  created_at: string | null
  currency_code: string | null
  custom_display_id: string | null
  display_id: number | null
  email: string | null
  id: string
  manual_status: string | null
  payment_status: string | null
  status: string | null
  total: number | string | null
}

export type PendingB2BCustomer = {
  company_name: string | null
  created_at: string | null
  email: string | null
  first_name: string | null
  id: string
  last_name: string | null
  metadata: Record<string, unknown>
  phone: string | null
}

export type ActionRequiredOrdersResponse = {
  count: number
  count_exact: boolean
  has_next: boolean
  limit: number
  offset: number
  orders: ActionRequiredOrder[]
}

export type PendingB2BCustomersResponse = {
  count: number
  count_exact: boolean
  customers: PendingB2BCustomer[]
  has_next: boolean
  limit: number
  offset: number
}

export type BadgeKey = "ordersActionRequired" | "customersActionRequired"

export type MedusaAdminPaymentCollection = {
  status?: string | null
}

export type MedusaAdminFulfillment = {
  canceled_at?: string | null
  delivered_at?: string | null
  shipped_at?: string | null
}

export type MedusaAdminOrder = {
  created_at?: string | null
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | null
  email?: string | null
  fulfillment_status?: string | null
  fulfillments?: MedusaAdminFulfillment[] | null
  id: string
  metadata?: Record<string, unknown> | null
  payment_collections?: MedusaAdminPaymentCollection[] | null
  payment_status?: string | null
  status?: string | null
  total?: number | string | null
}

export type MedusaAdminCustomer = {
  company_name?: string | null
  created_at?: string | null
  email?: string | null
  first_name?: string | null
  id: string
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export type MedusaAdminOrdersResponse = {
  count: number
  limit: number
  offset: number
  orders: MedusaAdminOrder[]
}

export type MedusaAdminCustomersResponse = {
  count: number
  customers: MedusaAdminCustomer[]
  limit: number
  offset: number
}
