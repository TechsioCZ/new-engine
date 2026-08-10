export type CustomerGroupCustomerIdentifierType =
  | "email"
  | "customer_id"
  | "erp_id"

export interface CustomerGroupCustomerIdentifier {
  identifier_type: CustomerGroupCustomerIdentifierType
  email?: string
  customer_id?: string
  erp_id?: string
}

export interface AssignCustomersToGroupBatchInput {
  code: string
  customer_identifiers: CustomerGroupCustomerIdentifier[]
}

export interface AssignCustomersToGroupBatchResult {
  identifier: string
  status: "assigned" | "failed" | "not_found"
  customer_id?: string
  error?: string
}

export interface AssignCustomersToGroupBatchOutput {
  success: boolean
  processed: number
  assigned: number
  failed: number
  results: AssignCustomersToGroupBatchResult[]
}
