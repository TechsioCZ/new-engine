import { asValue } from "@medusajs/framework/awilix"
import {
  ContainerRegistrationKeys,
  createMedusaContainer,
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

vi.mock(import("../../../../src/links/customer-product-list"), () => ({
  CustomerProductListLink: {
    entryPoint: customerProductListLinkEntryPoint,
  },
}))

interface QueryStub {
  graph: () => Promise<{ data: unknown[] }>
}

const makeContainer = (query: QueryStub) => {
  const container = createMedusaContainer()
  container.register({
    [ContainerRegistrationKeys.QUERY]: asValue(query),
  })
  return container
}

describe(listCustomerProductListIds, () => {
  it("paginates customer product-list links and filters invalid records", async () => {
    const firstPageLinks = Array.from({ length: 1000 }, (_, index) => ({
      product_list_id: `list-${index}`,
    }))
    const query = {
      graph: vi
        .fn<QueryStub["graph"]>()
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
      listCustomerProductListIds(makeContainer(query), "cus_1"),
    ).resolves.toStrictEqual([
      ...firstPageLinks.map((link) => link.product_list_id),
      "list-final",
    ])
  })
})

describe(assertCustomerOwnsProductList, () => {
  it("succeeds when the customer-product-list link exists", async () => {
    const query = {
      graph: vi.fn<QueryStub["graph"]>().mockResolvedValue({
        data: [{ product_list_id: "plist_1" }],
      }),
    }

    await expect(
      assertCustomerOwnsProductList(makeContainer(query), "cus_1", "plist_1"),
    ).resolves.toBeUndefined()
  })

  it("throws NOT_FOUND when the ownership link is missing", async () => {
    const query = {
      graph: vi.fn<QueryStub["graph"]>().mockResolvedValue({ data: [] }),
    }

    await expect(
      assertCustomerOwnsProductList(makeContainer(query), "cus_1", "missing"),
    ).rejects.toMatchObject({
      message: "Product list missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
  })
})
