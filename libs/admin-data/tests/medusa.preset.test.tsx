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

    expect(service.getSummary).toHaveBeenCalledWith({}, expect.any(AbortSignal))
  })
})
