import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  assertCustomerOwnsProductList,
  listCustomerProductListIds,
} from "../../../../src/utils/product-list-links"

const { customerProductListLinkEntryPoint } = vi.hoisted(() => ({
  customerProductListLinkEntryPoint: "customer_product_list",
}))

vi.mock("../../../../src/links/customer-product-list", () => ({
  CustomerProductListLink: {
    entryPoint: customerProductListLinkEntryPoint,
  },
}))

const makeContainer = (query: { graph: ReturnType<typeof vi.fn> }) => ({
  resolve: vi.fn((key) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return query
    }

    throw new Error(`Unexpected dependency: ${String(key)}`)
  }),
})

describe("listCustomerProductListIds", () => {
  it("paginates customer product-list links and filters invalid records", async () => {
    const firstPageLinks = Array.from({ length: 1000 }, (_, index) => ({
      product_list_id: `list-${index}`,
    }))
    const query = {
      graph: vi
        .fn()
        .mockResolvedValueOnce({ data: firstPageLinks })
        .mockResolvedValueOnce({
          data: [
            { product_list_id: "list-final" },
            { product_list_id: "" },
            { customer_id: "cus_1" },
            { product_list_id: 123 },
            null,
            "invalid-link",
          ],
        }),
    }

    await expect(
      listCustomerProductListIds(makeContainer(query), "cus_1")
    ).resolves.toEqual([
      ...firstPageLinks.map((link) => link.product_list_id),
      "list-final",
    ])

    expect(query.graph).toHaveBeenNthCalledWith(1, {
      entity: customerProductListLinkEntryPoint,
      fields: ["product_list_id"],
      filters: {
        customer_id: "cus_1",
      },
      pagination: {
        skip: 0,
        take: 1000,
      },
    })
    expect(query.graph).toHaveBeenNthCalledWith(2, {
      entity: customerProductListLinkEntryPoint,
      fields: ["product_list_id"],
      filters: {
        customer_id: "cus_1",
      },
      pagination: {
        skip: 1000,
        take: 1000,
      },
    })
  })
})

describe("assertCustomerOwnsProductList", () => {
  it("succeeds when the customer-product-list link exists", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({
        data: [{ product_list_id: "plist_1" }],
      }),
    }

    await expect(
      assertCustomerOwnsProductList(makeContainer(query), "cus_1", "plist_1")
    ).resolves.toBeUndefined()

    expect(query.graph).toHaveBeenCalledWith({
      entity: customerProductListLinkEntryPoint,
      fields: ["product_list_id"],
      filters: {
        customer_id: "cus_1",
        product_list_id: "plist_1",
      },
      pagination: {
        take: 1,
      },
    })
  })

  it("throws NOT_FOUND when the ownership link is missing", async () => {
    const query = {
      graph: vi.fn().mockResolvedValue({ data: [] }),
    }

    await expect(
      assertCustomerOwnsProductList(makeContainer(query), "cus_1", "missing")
    ).rejects.toMatchObject({
      message: "Product list missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })
})
