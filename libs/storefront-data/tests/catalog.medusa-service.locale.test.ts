import { createMedusaCatalogService } from "../src/catalog/medusa-service"

describe("createMedusaCatalogService locale", () => {
  it("forwards locale to the catalog endpoint", async () => {
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
      locale: "hu-HU",
    })

    expect(fetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: expect.objectContaining({
        locale: "hu-HU",
      }),
      signal: undefined,
    })
  })
})
