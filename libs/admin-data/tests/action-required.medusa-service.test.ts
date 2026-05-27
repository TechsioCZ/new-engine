import { vi } from "vitest"
import { createMedusaActionRequiredService } from "../src/action-required/medusa-service"
import type {
  MedusaAdminCustomersResponse,
  MedusaAdminOrdersResponse,
} from "../src/action-required/types"
import type { AdminDataClient } from "../src/shared/admin-client"

describe("createMedusaActionRequiredService", () => {
  it("scans Admin API orders and customers into action-required responses", async () => {
    const fetchJson = vi.fn(
      (
        path: string
      ): Promise<MedusaAdminOrdersResponse | MedusaAdminCustomersResponse> => {
        if (path === "/admin/orders") {
          return Promise.resolve({
            count: 2,
            limit: 100,
            offset: 0,
            orders: [
              {
                id: "ord_1",
                currency_code: "czk",
                display_id: 1,
                email: "first@example.com",
                payment_collections: [],
                status: "pending",
                total: 100,
              },
              {
                id: "ord_2",
                display_id: 2,
                payment_status: "captured",
                status: "pending",
              },
            ],
          })
        }

        return Promise.resolve({
          count: 2,
          customers: [
            {
              id: "cus_1",
              email: "buyer@example.com",
              metadata: {
                b2b_approval_status: "pending",
                customer_type: "b2b",
              },
            },
            {
              id: "cus_2",
              email: "b2c@example.com",
              metadata: {
                customer_type: "b2c",
              },
            },
          ],
          limit: 100,
          offset: 0,
        })
      }
    )
    const service = createMedusaActionRequiredService({
      fetchBlob: vi.fn(async () => new Blob()),
      fetchJson: fetchJson as AdminDataClient["fetchJson"],
      fetchText: vi.fn(async () => ""),
      fetchVoid: vi.fn(() => Promise.resolve()),
    } satisfies AdminDataClient)

    const summary = await service.getSummary({})

    expect(summary.orders.orders).toEqual([
      expect.objectContaining({
        id: "ord_1",
        payment_status: "not_paid",
      }),
    ])
    expect(summary.customers.customers).toEqual([
      expect.objectContaining({
        id: "cus_1",
      }),
    ])
    expect(fetchJson).toHaveBeenCalledWith(
      "/admin/orders",
      expect.objectContaining({
        params: expect.objectContaining({
          fields: expect.stringContaining("payment_collections.status"),
          status: "pending",
        }),
      })
    )
    expect(fetchJson).toHaveBeenCalledWith(
      "/admin/customers",
      expect.objectContaining({
        params: expect.objectContaining({
          fields: expect.stringContaining("metadata"),
        }),
      })
    )
  })
})
