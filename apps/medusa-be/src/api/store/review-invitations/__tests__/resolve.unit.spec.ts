import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import { POST } from "../resolve/route"

describe("POST /store/review-invitations/resolve", () => {
  it("returns only the assigned product without consuming the token", async () => {
    const listReviewTokens = vi.fn().mockResolvedValue([
      {
        expires_at: new Date(Date.now() + 60_000),
        product_id: "prod_1",
        token: "ExactReviewToken",
        used_at: null,
      },
    ])
    const graph = vi.fn(async ({ entity }: { entity: string }) => {
      if (entity === "product_sales_channel") {
        return { data: [{ product_id: "prod_1" }] }
      }
      if (entity === "product") {
        return { data: [{ id: "prod_1" }] }
      }
      throw new Error(`Unexpected entity: ${entity}`)
    })
    const scope = {
      resolve: vi.fn((key: string) => {
        if (key === PRODUCT_REVIEW_MODULE) {
          return { listReviewTokens }
        }
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
        if (key === ContainerRegistrationKeys.REMOTE_QUERY) {
          return vi.fn()
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    }
    const response = { json: vi.fn(), setHeader: vi.fn() }

    await POST(
      {
        body: { token: "ExactReviewToken" },
        publishable_key_context: { sales_channel_ids: ["sc_cz"] },
        scope,
      } as never,
      response as never
    )

    expect(response.json).toHaveBeenCalledWith({ product_id: "prod_1" })
    expect(scope.resolve).not.toHaveBeenCalledWith(
      expect.stringContaining("workflow")
    )
    expect(listReviewTokens).toHaveBeenCalledTimes(1)
  })

  it("hides expired invitations behind the uniform not-found response", async () => {
    const request = {
      body: { token: "ExpiredReviewToken" },
      publishable_key_context: { sales_channel_ids: ["sc_cz"] },
      scope: {
        resolve: vi.fn((key: string) => {
          if (key === PRODUCT_REVIEW_MODULE) {
            return {
              listReviewTokens: vi.fn().mockResolvedValue([
                {
                  expires_at: new Date(Date.now() - 1),
                  product_id: "prod_1",
                  token: "ExpiredReviewToken",
                  used_at: null,
                },
              ]),
            }
          }
          throw new Error(`Unexpected dependency: ${key}`)
        }),
      },
    }

    await expect(
      POST(request as never, { json: vi.fn(), setHeader: vi.fn() } as never)
    ).rejects.toMatchObject({ type: "not_found" })
  })
})
