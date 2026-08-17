import { describe, expect, it, vi } from "vitest"
import { createMedusaCatalogService } from "../src/catalog/medusa-service"

describe("createMedusaCatalogService sale selection", () => {
  it("forwards the all-sale selection to the catalog endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue({
      products: [],
      count: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    })
    const service = createMedusaCatalogService({ client: { fetch } } as never)

    await service.getCatalogProducts({
      page: 1,
      limit: 12,
      on_sale: true,
    })

    expect(fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        on_sale: true,
      }),
      signal: undefined,
    })
  })

  it("normalizes selected sale adapters to a unique CSV value", async () => {
    const fetch = vi.fn().mockResolvedValue({
      products: [],
      count: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    })
    const service = createMedusaCatalogService({ client: { fetch } } as never)

    await service.getCatalogProducts({
      page: 1,
      limit: 12,
      on_sale: ["discount", "discount"],
    })

    expect(fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        on_sale: "discount",
      }),
      signal: undefined,
    })
  })
})
