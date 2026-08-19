import type Medusa from "@medusajs/js-sdk"
import { describe, expect, it, vi } from "vitest"
import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createMedusaProductAttributeService } from "../src/product-attributes/medusa-service"
import { createProductAttributeQueryKeys } from "../src/product-attributes/query-keys"

const supplierAttribute = {
  id: "pattr_1",
  definition: {
    id: "pattrdef_1",
    key: "supplier",
    label: "Supplier",
    input_type: "select" as const,
  },
  option: {
    id: "pattropt_1",
    key: "bioherba",
    label: "Bioherba",
  },
  text_value: null,
}

const warrantyAttribute = {
  id: "pattr_2",
  definition: {
    id: "pattrdef_2",
    key: "warranty",
    label: "Warranty",
    input_type: "select" as const,
  },
  option: {
    id: "pattropt_2",
    key: "24-mesiacov",
    label: "24 mesiacov",
  },
  text_value: null,
}

describe("product attributes", () => {
  it("uses normalized product detail query keys", () => {
    const queryKeys = createProductAttributeQueryKeys("shop")

    expect(
      queryKeys.detail({
        productId: "prod_1",
        salesChannelId: "sc_1",
        enabled: false,
      })
    ).toEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1", salesChannelId: "sc_1" },
    ])
  })

  it("reads every Store API page and forwards cancellation", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({
        count: 2,
        limit: 1,
        offset: 0,
        product_attributes: [supplierAttribute],
      })
      .mockResolvedValueOnce({
        count: 2,
        limit: 1,
        offset: 1,
        product_attributes: [warrantyAttribute],
      })
    const sdk = {
      client: {
        fetch,
      },
    } as unknown as Medusa
    const signal = new AbortController().signal
    const service = createMedusaProductAttributeService(sdk, {
      pageSize: 1,
    })

    await expect(
      service.getProductAttributes(
        { productId: "prod 1", salesChannelId: "sc_1" },
        signal
      )
    ).resolves.toEqual([supplierAttribute, warrantyAttribute])
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/store/products/prod%201/product-attributes",
      {
        query: { limit: 1, offset: 0, sales_channel_id: "sc_1" },
        signal,
      }
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/store/products/prod%201/product-attributes",
      {
        query: { limit: 1, offset: 1, sales_channel_id: "sc_1" },
        signal,
      }
    )
  })

  it("rejects page sizes outside the Store API contract", () => {
    const sdk = {
      client: {
        fetch: vi.fn(),
      },
    } as unknown as Medusa

    expect(() =>
      createMedusaProductAttributeService(sdk, { pageSize: 101 })
    ).toThrow("Product Attribute page size must be between 1 and 100.")
  })

  it("exposes Product Attributes through the Medusa preset", () => {
    const sdk = {
      client: {
        fetch: vi.fn(),
      },
    } as unknown as Medusa
    const preset = createMedusaStorefrontPreset({
      sdk,
      queryKeyNamespace: "shop",
    })

    expect(
      preset.queryKeys.productAttributes.detail({
        productId: "prod_1",
        salesChannelId: "sc_1",
      })
    ).toEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1", salesChannelId: "sc_1" },
    ])
    expect(
      preset.hooks.productAttributes.getDetailQueryOptions({
        productId: "prod_1",
        salesChannelId: "sc_1",
      }).queryKey
    ).toEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1", salesChannelId: "sc_1" },
    ])
    expect(preset.services.productAttributes.getProductAttributes).toBeDefined()
  })
})
