export type CustomerGroupIdentifierType =
  | "customer_group_id"
  | "name"
  | "code"
  | "erp_code"

export type CustomerGroupInput = {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string | undefined
  name: string
  code?: string | undefined
  erp_code?: string | undefined
  metadata?: Record<string, unknown> | undefined
}

export type UpsertCustomerGroupsBatchInput = {
  created_by?: string | undefined
  customer_groups: CustomerGroupInput[]
}

export type UpsertCustomerGroupsBatchResult = {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string | undefined
  name?: string | undefined
  code?: string | undefined
  erp_code?: string | undefined
  status: "created" | "updated" | "failed"
  error?: string
}

export type UpsertCustomerGroupsBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: UpsertCustomerGroupsBatchResult[]
}
