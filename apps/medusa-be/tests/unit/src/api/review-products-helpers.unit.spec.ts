import { describe, expect, it } from "vitest"
import {
  chunkProductIds,
  PRODUCT_QUERY_CHUNK_SIZE,
} from "../../../../src/api/review-products-helpers"

const buildIds = (count: number) =>
  Array.from({ length: count }, (_, index) => `prod_${index}`)

describe("review product helpers", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkProductIds([])).toEqual([])
  })

  it("keeps an exact boundary in one chunk", () => {
    const ids = buildIds(PRODUCT_QUERY_CHUNK_SIZE)

    expect(chunkProductIds(ids)).toEqual([ids])
  })

  it("splits inputs exceeding the boundary", () => {
    const ids = buildIds(PRODUCT_QUERY_CHUNK_SIZE + 1)

    expect(chunkProductIds(ids)).toEqual([
      ids.slice(0, PRODUCT_QUERY_CHUNK_SIZE),
      ids.slice(PRODUCT_QUERY_CHUNK_SIZE),
    ])
  })
})
