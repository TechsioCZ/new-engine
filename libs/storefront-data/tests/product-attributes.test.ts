import { describe, expect, it, vi } from "vitest"

import { createMedusaStorefrontPreset } from "../src/medusa/preset"
import { createMedusaProductAttributeService } from "../src/product-attributes/medusa-service"
import { createProductAttributeQueryKeys } from "../src/product-attributes/query-keys"
import { createTestMedusaSdk } from "./medusa-fixtures"

const createSdkMock = () => {
  const sdk = createTestMedusaSdk()
  const fetch = vi.fn<(path: string, options?: unknown) => Promise<unknown>>()
  Object.defineProperty(sdk.client, "fetch", { value: fetch })
  return { fetch, sdk }
}

const supplierAttribute = {
  definition: {
    id: "pattrdef_1",
    input_type: "select" as const,
    key: "supplier",
    label: "Supplier",
  },
  id: "pattr_1",
  option: {
    id: "pattropt_1",
    key: "bioherba",
    label: "Bioherba",
  },
  text_value: null,
}

const warrantyAttribute = {
  definition: {
    id: "pattrdef_2",
    input_type: "select" as const,
    key: "warranty",
    label: "Warranty",
  },
  id: "pattr_2",
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
        enabled: false,
        productId: "prod_1",
      }),
    ).toStrictEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1" },
    ])
  })

  it("reads every Store API page and forwards cancellation", async () => {
    const { fetch, sdk } = createSdkMock()
    fetch
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
    const { signal } = new AbortController()
    const service = createMedusaProductAttributeService(sdk, {
      pageSize: 1,
    })

    await expect(
      service.getProductAttributes({ productId: "prod 1" }, signal),
    ).resolves.toStrictEqual([supplierAttribute, warrantyAttribute])
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/store/products/prod%201/product-attributes",
      {
        query: { limit: 1, offset: 0 },
        signal,
      },
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/store/products/prod%201/product-attributes",
      {
        query: { limit: 1, offset: 1 },
        signal,
      },
    )
  })

  it("rejects page sizes outside the Store API contract", () => {
    const { sdk } = createSdkMock()

    expect(() =>
      createMedusaProductAttributeService(sdk, { pageSize: 101 }),
    ).toThrow("Product Attribute page size must be between 1 and 100.")
  })

  it("exposes Product Attributes through the Medusa preset", () => {
    const { sdk } = createSdkMock()
    const preset = createMedusaStorefrontPreset({
      queryKeyNamespace: "shop",
      sdk,
    })

    expect(
      preset.queryKeys.productAttributes.detail({
        productId: "prod_1",
      }),
    ).toStrictEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1" },
    ])
    expect(
      preset.hooks.productAttributes.getDetailQueryOptions({
        productId: "prod_1",
      }).queryKey,
    ).toStrictEqual([
      "shop",
      "product-attributes",
      "detail",
      { productId: "prod_1" },
    ])
    expect(preset.services.productAttributes.getProductAttributes).toBeDefined()
  })
})
