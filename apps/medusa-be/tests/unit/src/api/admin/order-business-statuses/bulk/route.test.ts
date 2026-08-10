import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PostAdminOrderBusinessStatusesBulkSchemaType } from "../../../../../../../src/api/admin/order-business-statuses/validators"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      LOGGER: "logger",
      QUERY: "query",
    },
    Modules: {
      CACHING: "caching",
      ORDER: "order",
    },
  }),
)

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
): asserts candidate is T => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

type MockJsonResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn<(body: unknown) => unknown>>
}

const createMockResponse = (): MockJsonResponse => {
  const candidate: unknown = {
    json: vi.fn<(body: unknown) => unknown>().mockReturnThis(),
  }
  assertMockShape<MockJsonResponse>(candidate, ["json"])
  return candidate
}

const asMockRequest = (
  candidate: unknown,
): MedusaRequest<PostAdminOrderBusinessStatusesBulkSchemaType> => {
  assertMockShape<MedusaRequest<PostAdminOrderBusinessStatusesBulkSchemaType>>(
    candidate,
    ["scope", "validatedBody"],
  )
  return candidate
}

describe("POST /admin/order-business-statuses/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("updates eligible orders and skips blocked ones", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-business-statuses/bulk/route")
    const clearCache = vi
      .fn<(input: { tags: string[] }) => Promise<void>>()
      .mockImplementation(async () => {})
    const warn = vi.fn<(message: string) => void>()
    const updateOrders = vi
      .fn<(id: string, update: unknown) => Promise<void>>()
      .mockImplementation(async () => {})
    const graph = vi
      .fn<(input: unknown) => Promise<{ data: unknown[] }>>()
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            payment_status: "captured",
          },
          {
            display_id: 1002,
            fulfillment_status: "delivered",
            id: "order_2",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            metadata: { order_business_status_manual: "processing" },
            payment_status: "captured",
          },
        ],
      })
    const req = asMockRequest({
      scope: {
        resolve: vi.fn<(key: unknown) => unknown>((key) => {
          if (key === "query") {
            return { graph }
          }

          if (key === "order") {
            return { updateOrders }
          }

          if (key === "caching") {
            return { clear: clearCache }
          }

          if (key === "logger") {
            return { warn }
          }

          throw new Error(`Unexpected container key: ${String(key)}`)
        }),
      },
      validatedBody: {
        order_ids: ["order_1", "order_2", "order_missing"],
        status: "processing",
      },
    })
    const res = createMockResponse()

    await POST(req, res)

    expect(updateOrders).toHaveBeenCalledExactlyOnceWith("order_1", {
      metadata: { order_business_status_manual: "processing" },
    })
    expect(clearCache).toHaveBeenCalledWith({
      tags: ["order-expedition:summary"],
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        skipped: [
          {
            id: "order_2",
            order_display_id: "#1002",
            reason: "delivered status has higher priority",
          },
          {
            id: "order_missing",
            order_display_id: "order_missing",
            reason: "Order was not found",
          },
        ],
        skipped_count: 2,
      }),
    )
  })

  it("keeps updating eligible orders when one update fails", async () => {
    const { POST } =
      await import("../../../../../../../src/api/admin/order-business-statuses/bulk/route")
    const clearCache = vi
      .fn<(input: { tags: string[] }) => Promise<void>>()
      .mockImplementation(async () => {})
    const warn = vi.fn<(message: string) => void>()
    const updateOrders = vi.fn<(id: string, update?: unknown) => Promise<void>>(
      async (id) => {
        if (id === "order_2") {
          await Promise.reject(new Error("database conflict"))
        }

        await Promise.resolve()
      },
    )
    const graph = vi
      .fn<(input: unknown) => Promise<{ data: unknown[] }>>()
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            payment_status: "captured",
          },
          {
            display_id: 1002,
            id: "order_2",
            payment_status: "captured",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            display_id: 1001,
            id: "order_1",
            metadata: { order_business_status_manual: "processing" },
            payment_status: "captured",
          },
        ],
      })
    const req = asMockRequest({
      scope: {
        resolve: vi.fn<(key: unknown) => unknown>((key) => {
          if (key === "query") {
            return { graph }
          }

          if (key === "order") {
            return { updateOrders }
          }

          if (key === "caching") {
            return { clear: clearCache }
          }

          if (key === "logger") {
            return { warn }
          }

          throw new Error(`Unexpected container key: ${String(key)}`)
        }),
      },
      validatedBody: {
        order_ids: ["order_1", "order_2"],
        status: "processing",
      },
    })
    const res = createMockResponse()

    await POST(req, res)

    expect(updateOrders).toHaveBeenCalledTimes(2)
    expect(clearCache).toHaveBeenCalledWith({
      tags: ["order-expedition:summary"],
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        skipped: [
          {
            id: "order_2",
            order_display_id: "#1002",
            reason: "Update failed: database conflict",
          },
        ],
        skipped_count: 1,
      }),
    )
  })
})
