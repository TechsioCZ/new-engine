import { describe, expect, it, vi } from "vitest"
import { createMedusaCatalogService } from "../src/catalog/medusa-service"

describe("createMedusaCatalogService sales channel context", () => {
  it("forwards sales_channel_id with region-aware catalog queries", async () => {
    const fetch = vi.fn().mockResolvedValue({
      products: [],
      count: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
      facets: {},
    })
    const service = createMedusaCatalogService({ client: { fetch } } as never)

    await service.getCatalogProducts({
      page: 1,
      limit: 12,
      region_id: "reg_cz",
      country_code: "CZ",
      sales_channel_id: "sc_cz",
    })

    expect(fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        region_id: "reg_cz",
        country_code: "cz",
        sales_channel_id: "sc_cz",
      }),
      signal: undefined,
    })
  })
})
