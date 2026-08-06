import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  AdminGetCompanyParamsType,
  AdminUpdateCompanyType,
} from "../../../../../../src/api/admin/companies/validators"

const workflowMocks = vi.hoisted(() => {
  const updateCompaniesRun = vi.fn<() => Promise<unknown>>()

  return {
    updateCompaniesRun,
    updateCompaniesWorkflow:
      vi.fn<(scope: unknown) => { run: typeof updateCompaniesRun }>(),
  }
})

vi.mock(import("../../../../../../src/workflows/company/workflows/"), () => ({
  deleteCompaniesWorkflow: {
    run: vi.fn<() => Promise<unknown>>(),
  },
  updateCompaniesWorkflow: workflowMocks.updateCompaniesWorkflow,
}))

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
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

/**
 * Wraps `expect.objectContaining` with an explicit `unknown` return type.
 * Vitest types this matcher factory as `any`, so using it directly as a
 * nested object-literal property value trips `no-unsafe-assignment`.
 */
const objectContaining = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value)

const REQUEST_KEYS = [
  "body",
  "filterableFields",
  "params",
  "queryConfig",
  "scope",
  "validatedBody",
  "validatedQuery",
] as const

type MockMedusaResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn>
  setHeader: ReturnType<typeof vi.fn>
}

const createMockResponse = (): MockMedusaResponse => {
  const candidate: unknown = {
    json: vi.fn<(body?: unknown) => unknown>().mockReturnThis(),
    setHeader: vi
      .fn<(name: string, value: string) => unknown>()
      .mockReturnThis(),
  }

  assertMockShape<MockMedusaResponse>(candidate, ["json", "setHeader"])
  return candidate
}

interface GraphQueryResult {
  data: Record<string, unknown>[]
  metadata?: { count: number; skip: number; take: number }
}

const createGraphMock = (result: GraphQueryResult) =>
  vi
    .fn<(args: Record<string, unknown>) => Promise<GraphQueryResult>>()
    .mockResolvedValue(result)

const createMockRequest = <T>(
  options: {
    body?: Record<string, unknown>
    filterableFields?: Record<string, unknown>
    graph: ReturnType<typeof createGraphMock>
    logger?: { info: ReturnType<typeof vi.fn> }
    params?: Record<string, string>
    pagination?: { order?: Record<string, string>; skip: number; take?: number }
    validatedBody?: Record<string, unknown>
    validatedQuery?: Record<string, unknown>
    withDeleted?: boolean
  },
  requiredKeys: readonly (keyof T)[],
): T => {
  const {
    body = { name: "stale body name" },
    filterableFields = {},
    graph,
    logger = { info: vi.fn<(message: string) => void>() },
    params = { id: "comp_1" },
    pagination,
    validatedBody = { name: "updated company name" },
    validatedQuery = {},
    withDeleted,
  } = options

  const candidate: unknown = {
    body,
    filterableFields,
    params,
    queryConfig: {
      fields: ["id", "name"],
      pagination,
      withDeleted,
    },
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
    validatedBody,
    validatedQuery,
  }

  assertMockShape<T>(candidate, requiredKeys)
  return candidate
}

describe("GET /admin/companies", () => {
  it("searches active companies by name, email, or phone by default", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/companies/route")
    const graph = createGraphMock({
      data: [{ id: "comp_1", name: "Acme" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<unknown, AdminGetCompanyParamsType>
    >(
      {
        filterableFields: {
          q: " Acme ",
          status: "active",
        },
        graph,
        pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {
        $or: [
          { name: { $ilike: "%Acme%" } },
          { email: { $ilike: "%Acme%" } },
          { phone: { $ilike: "%Acme%" } },
        ],
      },
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      withDeleted: false,
    })
    expect(res.json).toHaveBeenCalledWith({
      companies: [{ id: "comp_1", name: "Acme" }],
      count: 1,
      limit: 20,
      offset: 0,
    })
  })

  it("can filter to deleted companies only", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/companies/route")
    const graph = createGraphMock({
      data: [{ deleted_at: "2026-06-10T00:00:00.000Z", id: "comp_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<unknown, AdminGetCompanyParamsType>
    >(
      {
        filterableFields: {
          status: "deleted",
        },
        graph,
        pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
        validatedQuery: {
          order_by: "-name",
        },
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {
        deleted_at: { $ne: null },
      },
      pagination: { order: { name: "DESC" }, skip: 0, take: 20 },
      withDeleted: true,
    })
  })

  it("keeps with_deleted=true requests as all statuses when status is omitted", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/companies/route")
    const graph = createGraphMock({
      data: [],
      metadata: { count: 0, skip: 0, take: 20 },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<unknown, AdminGetCompanyParamsType>
    >(
      {
        graph,
        pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
        withDeleted: true,
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {},
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      withDeleted: true,
    })
  })
})

describe("POST /admin/companies/:id", () => {
  beforeEach(() => {
    workflowMocks.updateCompaniesWorkflow.mockReset()
    workflowMocks.updateCompaniesRun.mockReset()
    workflowMocks.updateCompaniesWorkflow.mockReturnValue({
      run: workflowMocks.updateCompaniesRun,
    })
  })

  it("updates a company with the validated body", async () => {
    const { POST } =
      await import("../../../../../../src/api/admin/companies/[id]/route")
    const graph = createGraphMock({
      data: [{ id: "comp_1", name: "updated company name" }],
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<AdminUpdateCompanyType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.updateCompaniesWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.updateCompaniesRun).toHaveBeenCalledWith({
      input: {
        id: "comp_1",
        update: {
          name: "updated company name",
        },
      },
    })
    expect(workflowMocks.updateCompaniesRun).not.toHaveBeenCalledWith(
      objectContaining({
        input: objectContaining({
          update: objectContaining({ name: "stale body name" }),
        }),
      }),
    )
    expect(res.json).toHaveBeenCalledWith({
      company: { id: "comp_1", name: "updated company name" },
    })
  })
})
