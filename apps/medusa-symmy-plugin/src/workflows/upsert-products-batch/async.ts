export const SYMMY_PRODUCTS_UPSERT_JOB_TYPE = "products.upsert"
export const SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT =
  "symmy.products.upsert.requested"

export type SymmyProductsUpsertRequestedEvent = {
  job_id: string
}
