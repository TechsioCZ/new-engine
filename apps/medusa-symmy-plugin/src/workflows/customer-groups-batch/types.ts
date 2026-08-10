import type { JsonMetadata } from "../../lib/json-metadata"

export type CustomerGroupIdentifierType =
  | "customer_group_id"
  | "name"
  | "code"
  | "erp_code"

export interface CustomerGroupInput {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string | undefined
  name: string
  code?: string | undefined
  erp_code?: string | undefined
  metadata?: JsonMetadata | undefined
}

export interface UpsertCustomerGroupsBatchInput {
  created_by?: string | undefined
  customer_groups: CustomerGroupInput[]
}

export interface UpsertCustomerGroupsBatchResult {
  identifier_type: CustomerGroupIdentifierType
  customer_group_id?: string | undefined
  name?: string | undefined
  code?: string | undefined
  erp_code?: string | undefined
  status: "created" | "updated" | "failed"
  error?: string
}

export interface UpsertCustomerGroupsBatchOutput {
  success: boolean
  processed: number
  failed: number
  results: UpsertCustomerGroupsBatchResult[]
}
