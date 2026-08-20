import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowRun = vi.hoisted(() => vi.fn())
const reviewHelpers = vi.hoisted(() => ({
  createPublicReviewCustomerId: vi.fn(),
  ensureProductExists: vi.fn(),
  ensureReviewDoesNotExist: vi.fn(),
  getAuthenticatedCustomerId: vi.fn(),
  getReviewAuthorName: vi.fn(),
  getReviewTokenCustomerId: vi.fn(),
  retrieveCustomer: vi.fn(),
  retrieveReviewToken: vi.fn(),
}))

vi.mock("../../../../workflows/product-review/workflows/create-review", () => ({
  createReviewWorkflow: vi.fn(() => ({ run: workflowRun })),
}))

vi.mock("../helpers", () => reviewHelpers)

import { POST } from "../route"

const roProduct = {
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        ro: {
          publicationStatus: "published",
          publicSlug: "vitamina-c",
          salesChannelId: "sc_ro",
        },
      },
      schemaVersion: 1,
    },
  },
  sales_channels: [{ id: "sc_ro" }],
  updated_at: "2026-08-20T10:00:00.000Z",
}

const skProduct = {
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
      },
      schemaVersion: 1,
    },
  },
  sales_channels: [{ id: "sc_sk" }],
  updated_at: "2026-08-20T10:00:00.000Z",
}

describe("POST /store/reviews market isolation", () => {
  beforeEach(() => {
    workflowRun.mockReset()
    for (const reviewHelper of Object.values(reviewHelpers)) {
      reviewHelper.mockReset()
    }
  })

  it("rejects an RO publishable key before creating unscoped UGC", async () => {
    const graph = vi.fn().mockResolvedValue({ data: [roProduct] })
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      throw new Error(`Unexpected registration: ${registrationName}`)
    })

    await expect(
      POST(
        {
          publishable_key_context: { sales_channel_ids: ["sc_ro"] },
          scope: { resolve },
          validatedBody: {
            content: "Produs bun.",
            first_name: "Ioana",
            product_id: "prod_1",
            rating: 5,
          },
        } as never,
        { json: vi.fn(), status: vi.fn() } as never
      )
    ).rejects.toMatchObject({
      message: "Product reviews are not available for this market.",
    })

    expect(graph).toHaveBeenCalledOnce()
    expect(workflowRun).not.toHaveBeenCalled()
    expect(reviewHelpers.retrieveReviewToken).not.toHaveBeenCalled()
  })

  it("preserves an exact SK token-backed review creation", async () => {
    const graph = vi.fn().mockResolvedValue({ data: [skProduct] })
    const resolve = vi.fn((registrationName: string) => {
      if (registrationName === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      throw new Error(`Unexpected registration: ${registrationName}`)
    })
    const review = { id: "review_1", status: "pending" }
    const reviewToken = { id: "review_token_1", product_id: "prod_1" }
    reviewHelpers.retrieveReviewToken.mockResolvedValue(reviewToken)
    reviewHelpers.getAuthenticatedCustomerId.mockReturnValue(undefined)
    reviewHelpers.getReviewAuthorName.mockReturnValue({
      first_name: "Jana",
      last_name: "Nováková",
    })
    reviewHelpers.getReviewTokenCustomerId.mockReturnValue("customer_1")
    workflowRun.mockResolvedValue({ result: review })
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })

    await POST(
      {
        publishable_key_context: { sales_channel_ids: ["sc_sk"] },
        scope: { resolve },
        validatedBody: {
          content: "Výborný produkt.",
          product_id: "prod_1",
          rating: 5,
          review_token: "review-token",
        },
      } as never,
      { json, status } as never
    )

    expect(reviewHelpers.retrieveReviewToken).toHaveBeenCalledWith(
      expect.anything(),
      "review-token",
      "prod_1"
    )
    expect(reviewHelpers.ensureProductExists).toHaveBeenCalledWith(
      expect.anything(),
      "prod_1"
    )
    expect(reviewHelpers.ensureReviewDoesNotExist).toHaveBeenCalledWith({
      customerId: "customer_1",
      productId: "prod_1",
      req: expect.anything(),
    })
    expect(workflowRun).toHaveBeenCalledWith({
      input: {
        review: {
          content: "Výborný produkt.",
          customer_id: "customer_1",
          first_name: "Jana",
          last_name: "Nováková",
          product_id: "prod_1",
          rating: 5,
          title: "Výborný produkt.",
        },
        review_token_id: "review_token_1",
      },
    })
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ review })
  })
})
