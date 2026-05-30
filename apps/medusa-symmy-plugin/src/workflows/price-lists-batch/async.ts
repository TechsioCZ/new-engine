export const SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE = "price_lists.upsert"
export const SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT =
  "symmy.price_lists.upsert.requested"

export const SYMMY_PRICE_LIST_PRICES_UPDATE_JOB_TYPE =
  "price_list_prices.update"
export const SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT =
  "symmy.price_list_prices.update.requested"

export type SymmyPriceListsUpsertRequestedEvent = {
  job_id: string
}

export type SymmyPriceListPricesUpdateRequestedEvent = {
  job_id: string
}
