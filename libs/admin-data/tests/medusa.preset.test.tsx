import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { vi } from "vitest"
import type { ActionRequiredService } from "../src/action-required/types"
import { createMedusaAdminDataPreset } from "../src/medusa/preset"
import type {
  OrderBusinessStatusSummary,
  OrderExpeditionService,
} from "../src/order-expedition/types"
import type { AdminDataFetch } from "../src/shared/admin-client"

const createWrapper = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

const orderSummary = {
  business_status: {
    id: "processing",
    priority: 5,
    tone: "blue",
    translation_key: "statuses.processing",
  },
  id: "ord_1",
  manual_status: "processing",
} satisfies OrderBusinessStatusSummary

describe("createMedusaAdminDataPreset", () => {
  it("accepts a Medusa SDK at the preset root", async () => {
    const blockedPayload = {
      blocked_orders: [
        {
          id: "ord_1",
          order_display_id: "#1",
          reason: "Order is already completed",
        },
      ],
      message: "One or more selected orders cannot transition",
    }
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(blockedPayload), {
          headers: { "content-type": "application/json" },
          status: 400,
        })
      ) as unknown as AdminDataFetch
    const sdkFetch = vi.fn()
    const sdkClient = {
      fetch: sdkFetch,
      getToken() {
        return this.token
      },
      token: "token_123",
    }
    const preset = createMedusaAdminDataPreset({
      baseUrl: "https://admin.example",
      fetch: fetchImpl,
      sdk: {
        client: sdkClient,
      },
    })

    await expect(preset.client.fetchJson("/admin/custom")).resolves.toEqual({
      ok: true,
    })

    expect(preset.queryKeys.actionRequired.all()).toEqual([
      "admin-data",
      "https://admin.example",
      "action-required",
    ])
    expect(sdkFetch).not.toHaveBeenCalled()

    const init = vi.mocked(fetchImpl).mock.calls[0]?.[1]

    expect(vi.mocked(fetchImpl).mock.calls[0]?.[0]).toBe(
      "https://admin.example/admin/custom"
    )
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer token_123"
    )
    await expect(
      preset.client.fetchJson("/admin/order-expedition/status", {
        method: "POST",
      })
    ).rejects.toMatchObject({
      payload: blockedPayload,
      status: 400,
    })
  })

  it("composes action-required query keys, services, and hooks", async () => {
    const service = {
      getCustomers: vi.fn(async () => ({
        count: 0,
        count_exact: true,
        customers: [],
        has_next: false,
        limit: 50,
        offset: 0,
      })),
      getOrders: vi.fn(async () => ({
        count: 1,
        count_exact: true,
        has_next: false,
        limit: 50,
        offset: 0,
        orders: [
          {
            created_at: null,
            currency_code: null,
            custom_display_id: null,
            display_id: 1,
            email: null,
            id: "ord_1",
            manual_status: null,
            payment_status: "not_paid",
            status: "pending",
            total: null,
          },
        ],
      })),
      getSummary: vi.fn(async () => ({
        customers: {
          count: 0,
          count_exact: true,
          customers: [],
          has_next: false,
          limit: 50,
          offset: 0,
        },
        orders: {
          count: 1,
          count_exact: true,
          has_next: false,
          limit: 50,
          offset: 0,
          orders: [],
        },
      })),
    } satisfies ActionRequiredService
    const orderExpeditionService = {
      bulkUpdateBusinessStatus: vi.fn(async () => ({
        count: 0,
        orders: [],
        skipped: [],
        skipped_count: 0,
        status: null,
      })),
      createPdf: vi.fn(async () => new Blob()),
      getBusinessStatusesByIds: vi.fn(async () => ({ orders: [] })),
      getCarriers: vi.fn(async () => ({ carriers: [] })),
      getOrders: vi.fn(async () => ({
        business_status: null,
        carrier: null,
        carrier_filter_limit_reached: false,
        count: 0,
        count_exact: true,
        has_next: false,
        limit: 50,
        offset: 0,
        orders: [],
        scanned_count: null,
      })),
      updateBusinessStatus: vi.fn(async () => ({ order: orderSummary })),
      updateStatus: vi.fn(async () => ({
        blockedOrders: [],
        count: 0,
        ok: true,
        orders: [],
        targetStatus: "completed",
      })),
    } satisfies OrderExpeditionService
    const preset = createMedusaAdminDataPreset({
      actionRequired: { service },
      baseUrl: "https://admin.example",
      orderExpedition: { service: orderExpeditionService },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    expect(preset.queryKeys.actionRequired.all()).toEqual([
      "admin-data",
      "https://admin.example",
      "action-required",
    ])
    expect(preset.queryKeys.orderExpedition.all()).toEqual([
      "admin-data",
      "https://admin.example",
      "order-expedition",
    ])

    const { result } = renderHook(
      () => preset.hooks.actionRequired.useActionRequiredSummary(),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => expect(result.current.summary).toBeDefined())

    expect(result.current.summary).toEqual({
      customers: expect.objectContaining({
        count: 0,
      }),
      orders: expect.objectContaining({
        count: 1,
      }),
    })
    expect(service.getSummary).toHaveBeenCalledWith({}, expect.any(AbortSignal))
    expect(service.getOrders).not.toHaveBeenCalled()
    expect(service.getCustomers).not.toHaveBeenCalled()
  })
})
