export const SYMMY_CUSTOMERS_UPSERT_JOB_TYPE = "customers.upsert"
export const SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT =
  "symmy.customers.upsert.requested"

export interface SymmyCustomersUpsertRequestedEvent {
  job_id: string
}
