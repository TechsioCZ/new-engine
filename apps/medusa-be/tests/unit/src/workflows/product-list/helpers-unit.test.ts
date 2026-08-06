import { asValue } from "@medusajs/framework/awilix"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
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

vi.mock(import("../../../../../src/links/customer-product-list"), () => ({
  CustomerProductListLink: {
    entryPoint: customerProductListLinkEntryPoint,
  },
}))

vi.mock(import("../../../../../src/links/product-list-item-product"), () => ({
  ProductListItemProductLink: {
    entryPoint: productListItemProductLinkEntryPoint,
  },
}))

vi.mock(import("../../../../../src/links/product-list-item-variant"), () => ({
  ProductListItemVariantLink: {
    entryPoint: productListItemVariantLinkEntryPoint,
  },
}))

type Graph = (input: unknown) => Promise<{ data: unknown[] }>
type ListProductListItems = (
  filters: { id?: { $in: string[] }; list_id?: string },
  options?: { skip?: number; take?: number },
) => Promise<unknown[]>

const makeContainer = ({
  query,
  service,
}: {
  query: { graph: Graph }
  service?: { listProductListItems: ListProductListItems }
}) => {
  const container = createMedusaContainer()
  container.register({
    [ContainerRegistrationKeys.QUERY]: asValue(query),
    ...(service === undefined
      ? {}
      : { [PRODUCT_LIST_MODULE]: asValue(service) }),
  })
  return container
}

describe(assertProductSelectionExists, () => {
  it("accepts published products without requiring a variant", async () => {
    const query = {
      graph: vi.fn<Graph>().mockResolvedValue({
        data: [{ id: "prod_1", status: "published" }],
      }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1"),
    ).resolves.toBeUndefined()
  })

  it("rejects missing or unpublished products", async () => {
    const query = {
      graph: vi.fn<Graph>().mockResolvedValue({ data: [] }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_draft"),
    ).rejects.toMatchObject({
      message: "Product prod_draft was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })

  it("accepts variants that belong to the product", async () => {
    const query = {
      graph: vi
        .fn<Graph>()
        .mockResolvedValueOnce({
          data: [{ id: "prod_1", status: "published" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "var_1", product: { id: "prod_1" } }],
        }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1", "var_1"),
    ).resolves.toBeUndefined()
  })

  it("rejects variants that are missing or belong to another product", async () => {
    const query = {
      graph: vi
        .fn<Graph>()
        .mockResolvedValueOnce({
          data: [{ id: "prod_1", status: "published" }],
        })
        .mockResolvedValueOnce({
          data: [{ id: "var_1", product: { id: "prod_other" } }],
        }),
    }

    await expect(
      assertProductSelectionExists(makeContainer({ query }), "prod_1", "var_1"),
    ).rejects.toMatchObject({
      message: "Product variant var_1 was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })
})

describe(findProductListItemForSelection, () => {
  it("returns the product item that has no variant link for variantless selections", async () => {
    const query = {
      graph: vi
        .fn<Graph>()
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
        .fn<Graph>()
        .mockResolvedValueOnce([{ id: "item_plain" }, { id: "item_variant" }])
        .mockResolvedValueOnce([{ id: "item_plain", quantity: 1 }]),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1",
      ),
    ).resolves.toStrictEqual({ id: "item_plain", quantity: 1 })
  })

  it("returns the product item with the matching variant link for variant selections", async () => {
    const query = {
      graph: vi
        .fn<Graph>()
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
        .fn<Graph>()
        .mockResolvedValueOnce([{ id: "item_plain" }, { id: "item_variant" }])
        .mockResolvedValueOnce([{ id: "item_variant", quantity: 2 }]),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1",
        "var_1",
      ),
    ).resolves.toStrictEqual({ id: "item_variant", quantity: 2 })
  })

  it("continues through paginated item batches until it finds a match", async () => {
    const firstPageItems = Array.from({ length: 1000 }, (_, index) => ({
      id: `item_${index}`,
    }))
    const query = {
      graph: vi
        .fn<Graph>()
        .mockResolvedValueOnce({ data: [] })
        .mockResolvedValueOnce({
          data: [{ product_list_item_id: "item_target" }],
        })
        .mockResolvedValueOnce({ data: [] }),
    }
    const service = {
      listProductListItems: vi.fn<ListProductListItems>(
        async (filters, options) => {
          if (filters.id !== undefined) {
            return await Promise.resolve([{ id: "item_target", quantity: 1 }])
          }

          if (options?.skip === 1000) {
            return await Promise.resolve([{ id: "item_target" }])
          }

          return await Promise.resolve(firstPageItems)
        },
      ),
    }

    await expect(
      findProductListItemForSelection(
        makeContainer({ query, service }),
        "plist_1",
        "prod_1",
      ),
    ).resolves.toStrictEqual({ id: "item_target", quantity: 1 })
  })
})
