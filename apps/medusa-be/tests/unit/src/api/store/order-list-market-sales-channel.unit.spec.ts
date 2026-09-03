import { validateAndTransformQuery } from "@medusajs/framework"
import { listTransformQueryConfig } from "@medusajs/medusa/api/store/orders/query-config"
import { StoreGetOrdersParams } from "@medusajs/medusa/api/store/orders/validators"
import { describe, expect, it, vi } from "vitest"
import { storeOrderMarketScopeRoutesMiddlewares } from "../../../../../src/api/store/orders/middlewares"
import { enforceExactStorefrontMarketSalesChannel } from "../../../../../src/api/store/storefront-market-sales-channel"

const CHANNEL_ID = "sc_sk"

const createRequest = (
  query: Record<string, unknown> = { limit: "17", status: "pending" }
) => {
  const graph = vi.fn().mockResolvedValue({
    data: [
      {
        id: CHANNEL_ID,
        metadata: {
          storefront_notification_markets: {
            sk: {
              country_code: "sk",
              locale: "sk-SK",
              market_code: "sk",
              storefront_domain: "herbatica.sk",
            },
          },
        },
      },
    ],
  })

  return {
    graph,
    req: {
      locale: "sk-SK",
      publishable_key_context: { sales_channel_ids: [CHANNEL_ID] },
      query,
      scope: {
        resolve: vi.fn(() => ({ graph })),
      },
    },
  }
}

const runMiddleware = async (
  middleware: (...args: never[]) => unknown,
  req: Record<string, unknown>
) => {
  const error = await new Promise<unknown>((resolve) => {
    middleware(req as never, {} as never, resolve as never)
  })

  if (error) {
    throw error
  }
}

describe("store order list market scope", () => {
  it("registers only the order list transport, leaving order detail untouched", () => {
    expect(storeOrderMarketScopeRoutesMiddlewares).toEqual([
      {
        methods: ["GET"],
        matcher: "/store/orders",
        middlewares: [enforceExactStorefrontMarketSalesChannel],
      },
    ])
  })

  it("rejects a caller-supplied Sales Channel before market scoping", async () => {
    const { graph, req } = createRequest({
      limit: "17",
      sales_channel_id: ["sc_attacker", "sc_ro"],
      status: "pending",
    })
    const validateOrderListQuery = validateAndTransformQuery(
      StoreGetOrdersParams,
      listTransformQueryConfig
    )

    await expect(
      runMiddleware(validateOrderListQuery as never, req)
    ).rejects.toThrow("Unrecognized fields: 'sales_channel_id'")
    expect(graph).not.toHaveBeenCalled()
  })

  it("forces the validated list query to the trusted market Sales Channel", async () => {
    const { graph, req } = createRequest()
    const validateOrderListQuery = validateAndTransformQuery(
      StoreGetOrdersParams,
      listTransformQueryConfig
    )

    await runMiddleware(validateOrderListQuery as never, req)

    expect(req).toMatchObject({
      filterableFields: { status: "pending" },
      queryConfig: { pagination: { skip: 0, take: 17 } },
    })
    await runMiddleware(enforceExactStorefrontMarketSalesChannel, req)

    expect(req.filterableFields).toEqual({
      sales_channel_id: [CHANNEL_ID],
      status: "pending",
    })
    expect(graph).toHaveBeenCalledExactlyOnceWith({
      entity: "sales_channel",
      fields: ["id", "metadata"],
      filters: { id: CHANNEL_ID },
      pagination: { take: 2 },
    })
  })
})
