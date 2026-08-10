import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getProducts } from "./product-service"

const fetchMock =
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

const resolveJson = (value: unknown): void => {
  fetchMock.mockResolvedValueOnce(Response.json(value, { status: 200 }))
}

const validProduct = {
  handle: "trail-jacket",
  id: "prod_1",
  thumbnail: null,
  title: "Trail jacket",
  variants: [
    {
      calculated_price: {
        calculated_amount_with_tax: 2499,
        calculated_amount_without_tax: 2065,
        currency_code: "czk",
      },
      inventory_quantity: 4,
      title: "M",
    },
  ],
}

describe("product service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.unstubAllGlobals()
  })

  it("returns empty product data when the response is malformed", async () => {
    resolveJson({})

    await expect(getProducts({ limit: 12, offset: 24 })).resolves.toStrictEqual(
      {
        count: 0,
        limit: 12,
        offset: 24,
        products: [],
      },
    )
  })

  it("returns defaults for malformed count and products fields", async () => {
    resolveJson({ count: "12", products: "not-an-array" })

    await expect(getProducts({})).resolves.toStrictEqual({
      count: 0,
      limit: 0,
      offset: 0,
      products: [],
    })
  })

  it("decodes the exact product list projection", async () => {
    resolveJson({ count: 1, products: [validProduct] })

    await expect(getProducts({ limit: 1 })).resolves.toStrictEqual({
      count: 1,
      limit: 1,
      offset: 0,
      products: [validProduct],
    })
  })

  it("preserves valid products when another product is malformed", async () => {
    resolveJson({
      count: 2,
      products: [validProduct, { id: "prod_2" }],
    })

    await expect(getProducts({ limit: 2 })).resolves.toStrictEqual({
      count: 2,
      limit: 2,
      offset: 0,
      products: [validProduct],
    })
  })

  it("preserves valid products when another product has a malformed variant", async () => {
    resolveJson({
      count: 2,
      products: [
        validProduct,
        {
          ...validProduct,
          id: "prod_2",
          variants: [{ inventory_quantity: "four", title: "M" }],
        },
      ],
    })

    await expect(getProducts({ limit: 2 })).resolves.toStrictEqual({
      count: 2,
      limit: 2,
      offset: 0,
      products: [validProduct],
    })
  })
})
