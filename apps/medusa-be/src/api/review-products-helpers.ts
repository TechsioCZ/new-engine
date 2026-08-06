import { chunk } from "@techsio/std/array"

export const PRODUCT_QUERY_CHUNK_SIZE = 100

export const chunkProductIds = (productIds: string[]) =>
  chunk(productIds, PRODUCT_QUERY_CHUNK_SIZE)
