import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

import type { PostAdminOrderExpeditionStatusSchemaType } from "../../../../../../../src/api/admin/order-expedition/validators"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

type Graph = (input: unknown) => Promise<{ data: unknown[] }>
type Json = (body: unknown) => unknown
type RunWorkflow = (input: unknown) => Promise<unknown>
type SetStatus = (status: number) => unknown

type MockStatusResponse = MedusaResponse & {
  json: Mock<Json>
  status: Mock<SetStatus>
}

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      QUERY: "query",
    },
  }),
)

const {
  mockArchiveRun,
  mockBulkCancelRun,
  mockBulkUpdateRun,
  mockCompleteRun,
} = vi.hoisted(() => ({
  mockArchiveRun: vi.fn<RunWorkflow>(),
  mockBulkCancelRun: vi.fn<RunWorkflow>(),
  mockBulkUpdateRun: vi.fn<RunWorkflow>(),
  mockCompleteRun: vi.fn<RunWorkflow>(),
}))

vi.mock(import("@medusajs/medusa/core-flows"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    archiveOrderWorkflow: vi.fn<() => { run: Mock<RunWorkflow> }>(() => ({
      run: mockArchiveRun,
    })),
    completeOrderWorkflow: vi.fn<() => { run: Mock<RunWorkflow> }>(() => ({
      run: mockCompleteRun,
    })),
  }),
)

vi.mock(
  import("../../../../../../../src/workflows/order-expedition/bulk-cancel-orders"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      bulkCancelOrdersWorkflow: vi.fn<() => { run: Mock<RunWorkflow> }>(() => ({
        run: mockBulkCancelRun,
      })),
    }),
)

vi.mock(
  import("../../../../../../../src/workflows/order-expedition/bulk-update-order-statuses"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      bulkUpdateOrderStatusesWorkflow: vi.fn<() => { run: Mock<RunWorkflow> }>(
        () => ({ run: mockBulkUpdateRun }),
      ),
      isOrderExpeditionDirectUpdateStatus: vi.fn<(status: string) => boolean>(
        (status) => ["pending", "draft", "requires_action"].includes(status),
      ),
    }),
)

const isMockStatusResponse = (
  candidate: unknown,
): candidate is MockStatusResponse =>
  isRecord(candidate) &&
  typeof candidate["json"] === "function" &&
  typeof candidate["status"] === "function"

const createMockResponse = (): MockStatusResponse => {
  const candidate: unknown = {
    json: vi.fn<Json>().mockReturnThis(),
    status: vi.fn<SetStatus>().mockReturnThis(),
  }
  if (!isMockStatusResponse(candidate)) {
    throw new TypeError("Expected a response with json and status functions")
  }
  return candidate
}

const isMockRequest = (
  candidate: unknown,
): candidate is MedusaRequest<PostAdminOrderExpeditionStatusSchemaType> =>
  isRecord(candidate) &&
  isRecord(candidate["scope"]) &&
  typeof candidate["scope"]["resolve"] === "function" &&
  isRecord(candidate["validatedBody"])

const createMockRequest = (
  validatedBody: Record<string, unknown>,
  graph: Graph,
): MedusaRequest<PostAdminOrderExpeditionStatusSchemaType> => {
  const candidate: unknown = {
    scope: {
      resolve: vi.fn<(token: string) => { graph: Graph }>(() => ({ graph })),
    },
    validatedBody,
  }
  if (!isMockRequest(candidate)) {
    throw new TypeError("Expected a request with scope and validated body")
  }
  return candidate
}
describe("POST /admin/order-expedition/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("prevalidates every selected order and blocks the whole batch when one is missing", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ display_id: 1001, id: "order_1", status: "pending" }],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_missing"],
        target_status: "completed",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_missing",
            order_display_id: "order_missing",
            reason: "Order was not found",
          },
        ],
        code: "order_expedition_status_blocked",
      }),
    )
    expect({
      archiveCalls: mockArchiveRun.mock.calls,
      bulkCancelCalls: mockBulkCancelRun.mock.calls,
      bulkUpdateCalls: mockBulkUpdateRun.mock.calls,
      completeCalls: mockCompleteRun.mock.calls,
    }).toStrictEqual({
      archiveCalls: [],
      bulkCancelCalls: [],
      bulkUpdateCalls: [],
      completeCalls: [],
    })
  })

  it("runs completed as one bulk workflow after prevalidation", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({
        data: [
          { display_id: 1001, id: "order_1", status: "pending" },
          { display_id: 1002, id: "order_2", status: "pending" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { display_id: 1001, id: "order_1", status: "completed" },
          { display_id: 1002, id: "order_2", status: "completed" },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_2"],
        target_status: "completed",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockCompleteRun).toHaveBeenCalledWith({
      input: { orderIds: ["order_1", "order_2"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        target_status: "completed",
      }),
    )
  })

  it("runs direct Medusa status updates through the custom bulk update workflow", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({
        data: [
          { display_id: 1001, id: "order_1", status: "pending" },
          { display_id: 1002, id: "order_2", status: "pending" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { display_id: 1001, id: "order_1", status: "requires_action" },
          { display_id: 1002, id: "order_2", status: "requires_action" },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1", "order_2"],
        target_status: "requires_action",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockBulkUpdateRun).toHaveBeenCalledWith({
      input: {
        order_ids: ["order_1", "order_2"],
        target_status: "requires_action",
      },
    })
    expect(mockCompleteRun).not.toHaveBeenCalled()
    expect(mockArchiveRun).not.toHaveBeenCalled()
    expect(mockBulkCancelRun).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        target_status: "requires_action",
      }),
    )
  })

  it("blocks cancellation before mutation when a selected order has active fulfillments", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          display_id: 1001,
          fulfillments: [{ canceled_at: null, id: "ful_1" }],
          id: "order_1",
          status: "pending",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "canceled",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_1",
            order_display_id: "#1001",
            reason: "Orders with active fulfillments cannot be canceled",
          },
        ],
      }),
    )
    expect(mockBulkCancelRun).not.toHaveBeenCalled()
  })

  it("blocks direct status updates for final archived orders", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          display_id: 1001,
          id: "order_1",
          status: "archived",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "pending",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_1",
            order_display_id: "#1001",
            reason: "Archived orders cannot be changed",
          },
        ],
      }),
    )
    expect(mockBulkUpdateRun).not.toHaveBeenCalled()
  })

  it("blocks archive for mutable orders that must be finalized first", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          display_id: 1001,
          id: "order_1",
          status: "pending",
        },
      ],
    })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "archived",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        blocked_orders: [
          {
            id: "order_1",
            order_display_id: "#1001",
            reason: "Pending orders cannot be changed to archived",
          },
        ],
      }),
    )
    expect(mockArchiveRun).not.toHaveBeenCalled()
  })

  it("allows canceled orders to be archived", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            status: "canceled",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            status: "archived",
          },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "archived",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockArchiveRun).toHaveBeenCalledWith({
      input: { orderIds: ["order_1"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        target_status: "archived",
      }),
    )
  })

  it("runs cancel through the custom bulk cancel workflow after prevalidation", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-expedition/status/route")
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            fulfillments: [],
            id: "order_1",
            status: "pending",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            status: "canceled",
          },
        ],
      })
    const req = createMockRequest(
      {
        order_ids: ["order_1"],
        target_status: "canceled",
      },
      graph,
    )
    const res = createMockResponse()

    await POST(req, res)

    expect(mockBulkCancelRun).toHaveBeenCalledWith({
      input: { order_ids: ["order_1"] },
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        target_status: "canceled",
      }),
    )
  })
})
