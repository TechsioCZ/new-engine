import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_LIST_MODULE } from "../../../../../src/modules/product-list/constants"
import {
  assertProductSelectionExists,
  findProductListItemForSelection,
} from "../../../../../src/workflows/product-list/steps/helpers"

const {
  customerProductListLinkEntryPoint,
  productListItemProductLinkEntryPoint,
  productListItemVariantLinkEntryPoint,
} = vi.hoisted(() => ({
  customerProductListLinkEntryPoint: "customer_product_list",
  productListItemProductLinkEntryPoint: "product_list_item_product",
  productListItemVariantLinkEntryPoint: "product_list_item_variant",
}))

vi.mock("../../../../../src/links/customer-product-list", () => ({
  CustomerProductListLink: {
    entryPoint: customerProductListLinkEntryPoint,
  },
}))

vi.mock("../../../../../src/links/product-list-item-product", () => ({
  ProductListItemProductLink: {
    entryPoint: productListItemProductLinkEntryPoint,
  },
}))

vi.mock("../../../../../src/links/product-list-item-variant", () => ({
  ProductListItemVariantLink: {
    entryPoint: productListItemVariantLinkEntryPoint,
  },
}))

const makeContainer = ({
  query,
  service,
}: {
  query: { graph: ReturnType<typeof vi.fn> }
  service?: { listProductListItems: ReturnType<typeof vi.fn> }
}) => ({
  resolve: vi.fn((key) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return query
    }

    if (key === PRODUCT_LIST_MODULE && service) {
      return service
    }

    throw new Error(`Unexpected dependency: ${String(key)}`)
  }),
})

describe("assertProductSelectionExists", () => {
  it("accepts published products without requiring a variant", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({
        data: [{ id: "prod_1", status: "published" }],
      }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1")
    ).resolves.toBeUndefined()

    expect(query.graph).toHaveBeenCalledOnce()
    expect(query.graph).toHaveBeenCalledWith({
      entity: "product",
      fields: ["id", "status"],
      filters: {
        id: "prod_1",
        status: "published",
      },
      pagination: {
        take: 1,
      },
    })
  })

  it("rejects missing or unpublished products", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_draft")
    ).rejects.toMatchObject({
      message: "Product prod_draft was not found",
      type: MedusaError.Types.NOT_FOUND,
    })

    expect(query.graph).toHaveBeenCalledWith({
      entity: "product",
      fields: ["id", "status"],
      filters: {
        id: "prod_draft",
        status: "published",
      },
      pagination: {
        take: 1,
      },
    })
  })

  it("accepts variants that belong to the product", async () => {
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "prod_1", status: "published" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "var_1", product: { id: "prod_1" } }],
        }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1", "var_1")
    ).resolves.toBeUndefined()

    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: "product_variant",
      fields: ["id", "product.id"],
      filters: {
        id: "var_1",
      },
      pagination: {
        take: 1,
      },
    })
  })

  it("rejects variants that are missing or belong to another product", async () => {
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "prod_1", status: "published" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "var_1", product: { id: "prod_other" } }],
        }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1", "var_1")
    ).rejects.toMatchObject({
      message: "Product variant var_1 was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })
})

describe("findProductListItemForSelection", () => {
  it("returns the product item that has no variant link for variantless selections", async () => {
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            { product_list_item_id: "item_plain" },
            { product_list_item_id: "item_variant" },
          ],
        })
        .mockResolvedValueOnce({
          data: [{ product_list_item_id: "item_variant" }],
        }),
    }
    const service = {
      listProductListItems: vi
        .fn()
        .mockResolvedValueOnce([{ id: "item_plain" }, { id: "item_variant" }])
        .mockResolvedValueOnce([{ id: "item_plain", quantity: 1 }]),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1"
      )
    ).resolves.toEqual({ id: "item_plain", quantity: 1 })

    expect(query.graph).toHaveBeenNthCalledWith(1, {
      entity: productListItemProductLinkEntryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_id: "prod_1",
        product_list_item_id: {
          $in: ["item_plain", "item_variant"],
        },
      },
      pagination: {
        take: 2,
      },
    })
    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: productListItemVariantLinkEntryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_list_item_id: {
          $in: ["item_plain", "item_variant"],
        },
      },
      pagination: {
        take: 2,
      },
    })
    expect(service.listProductListItems).toHaveBeenNthCalledWith(
      2,
      {
        id: {
          $in: ["item_plain"],
        },
        list_id: "plist_1",
      },
      {
        take: 1,
      }
    )
  })

  it("returns the product item with the matching variant link for variant selections", async () => {
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({
          data: [
            { product_list_item_id: "item_plain" },
            { product_list_item_id: "item_variant" },
          ],
        })
        .mockResolvedValueOnce({
          data: [{ product_list_item_id: "item_variant" }],
        }),
    }
    const service = {
      listProductListItems: vi
        .fn()
        .mockResolvedValueOnce([{ id: "item_plain" }, { id: "item_variant" }])
        .mockResolvedValueOnce([{ id: "item_variant", quantity: 2 }]),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1",
        "var_1"
      )
    ).resolves.toEqual({ id: "item_variant", quantity: 2 })

    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: productListItemVariantLinkEntryPoint,
      fields: ["product_list_item_id"],
      filters: {
        product_list_item_id: {
          $in: ["item_plain", "item_variant"],
        },
        product_variant_id: "var_1",
      },
      pagination: {
        take: 2,
      },
    })
  })

  it("continues through paginated item batches until it finds a match", async () => {
    const firstPageItems = Array.from({ length: 1000 }, (_, index) => ({
      id: `item_${index}`,
    }))
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: [{ product_list_item_id: "item_target" }],
        })
        .mockResolvedValueOnce({ data: [] }),
    }
    const service = {
      listProductListItems: vi.fn(
        async (
          filters: { id?: { $in: string[] }; list_id: string },
          options?: { skip?: number; take?: number }
        ) => {
          if (filters.id) {
            return [{ id: "item_target", quantity: 1 }]
          }

          if (options?.skip === 1000) {
            return [{ id: "item_target" }]
          }

          return firstPageItems
        }
      ),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1"
      )
    ).resolves.toEqual({ id: "item_target", quantity: 1 })

    expect(service.listProductListItems).toHaveBeenNthCalledWith(
      1,
      {
        list_id: "plist_1",
      },
      {
        select: ["id"],
        skip: 0,
        take: 1000,
      }
    )
    expect(service.listProductListItems).toHaveBeenNthCalledWith(
      2,
      {
        list_id: "plist_1",
      },
      {
        select: ["id"],
        skip: 1000,
        take: 1000,
      }
    )
  })
})
