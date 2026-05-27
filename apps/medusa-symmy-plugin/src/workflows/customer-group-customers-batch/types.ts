export type CustomerGroupCustomerIdentifierType =
  | "email"
  | "customer_id"
  | "erp_id"

export type CustomerGroupCustomerIdentifier = {
  identifier_type: CustomerGroupCustomerIdentifierType
  email?: string
  customer_id?: string
  erp_id?: string
}

export type AssignCustomersToGroupBatchInput = {
  code: string
  customer_identifiers: CustomerGroupCustomerIdentifier[]
}

export type AssignCustomersToGroupBatchResult = {
  identifier: string
  status: "assigned" | "failed" | "not_found"
  customer_id?: string
  error?: string
}

export type AssignCustomersToGroupBatchOutput = {
  success: boolean
  processed: number
  assigned: number
  failed: number
  results: AssignCustomersToGroupBatchResult[]
}
