"use client"

import type { TextFieldClientComponent } from "payload"
import {
  normalizeReferenceSearch,
  RemoteReferenceField,
  type RemoteReferenceOption,
} from "./remote-reference-field"

type ProductOption = {
  externalId: string
  handle?: string
  id?: string
  title: string
  thumbnail?: null | string
}

type ProductLookupResponse = {
  products?: ProductOption[]
}

const loadProductOptions = async ({
  currentValue,
  search,
  signal,
}: {
  currentValue: string
  search: string
  signal: AbortSignal
}): Promise<RemoteReferenceOption[]> => {
  const params = new URLSearchParams({ limit: "20" })
  const normalizedSearch = normalizeReferenceSearch(search)
  if (normalizedSearch) {
    params.set("search", normalizedSearch)
  } else if (currentValue) {
    params.set("externalId", currentValue)
  }

  const response = await fetch(`/api/medusa-products?${params}`, {
    credentials: "include",
    signal,
  })
  if (!response.ok) {
    throw new Error(`Product lookup failed (${response.status})`)
  }

  const data = (await response.json()) as ProductLookupResponse
  return (data.products ?? []).map((product) => ({
    id: product.id,
    label: `${product.title} (${product.handle ?? product.externalId})`,
    previewLabel: product.handle ?? product.externalId,
    thumbnail: product.thumbnail,
    value: product.externalId,
  }))
}

export const MedusaProductReferenceField: TextFieldClientComponent = (
  props
) => (
  <RemoteReferenceField
    {...props}
    emptyLabel="Select product…"
    loadingLabel="Loading products…"
    loadOptions={loadProductOptions}
    searchPlaceholder="Search Medusa products…"
  />
)

export default MedusaProductReferenceField
