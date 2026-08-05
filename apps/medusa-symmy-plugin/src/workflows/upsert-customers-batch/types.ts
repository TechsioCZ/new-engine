export type CustomerIdentifierType =
  | "email"
  | "erp_id"
  | "customer_id"
  | "vat_id"
  | "company_registration_number"

export interface CustomerAddressInput {
  address_id?: string
  first_name?: string
  last_name?: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  postal_code: string
  country_code: string
  phone?: string
}

export interface CustomerInput {
  identifier_type: CustomerIdentifierType
  email?: string
  customer_id?: string
  first_name: string
  last_name: string
  phone?: string
  company_name?: string
  addresses?: CustomerAddressInput[]
  customer_group_codes?: string[]
  metadata?: Record<string, unknown>
}

export interface UpsertCustomersBatchInput {
  customers: CustomerInput[]
}

export interface UpsertCustomersBatchResult {
  email?: string | undefined
  status: "created" | "updated" | "failed"
  customer_id?: string
  error?: string
}

export interface UpsertCustomersBatchOutput {
  success: boolean
  processed: number
  failed: number
  results: UpsertCustomersBatchResult[]
}
