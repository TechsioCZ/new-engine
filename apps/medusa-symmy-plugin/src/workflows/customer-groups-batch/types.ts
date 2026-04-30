export type CustomerGroupIdentifierType =
  | "customer_group_id"
  | "name"
  | "code"
  | "erp_code"

export type CustomerGroupInput = {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string
  name: string
  code?: string
  erp_code?: string
  metadata?: Record<string, unknown>
}

export type UpsertCustomerGroupsBatchInput = {
  created_by?: string
  customer_groups: CustomerGroupInput[]
}

export type UpsertCustomerGroupsBatchResult = {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string
  name?: string
  code?: string
  erp_code?: string
  status: "created" | "updated" | "failed"
  error?: string
}

export type UpsertCustomerGroupsBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: UpsertCustomerGroupsBatchResult[]
}
