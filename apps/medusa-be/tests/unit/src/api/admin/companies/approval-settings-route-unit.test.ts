import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AdminUpdateApprovalSettingsType } from "../../../../../../src/api/admin/companies/validators"

const workflowMocks = vi.hoisted(() => {
  const ensureApprovalSettingsRun = vi.fn<() => Promise<unknown>>()
  const updateApprovalSettingsRun = vi.fn<() => Promise<unknown>>()

  return {
    ensureApprovalSettingsRun,
    ensureApprovalSettingsWorkflow:
      vi.fn<(scope: unknown) => { run: typeof ensureApprovalSettingsRun }>(),
    updateApprovalSettingsRun,
    updateApprovalSettingsWorkflow:
      vi.fn<(scope: unknown) => { run: typeof updateApprovalSettingsRun }>(),
  }
})

vi.mock(
  import("../../../../../../src/workflows/approval/workflows/ensure-approval-settings"),
  () => ({
    ensureApprovalSettingsWorkflow:
      workflowMocks.ensureApprovalSettingsWorkflow,
  }),
)

vi.mock(
  import("../../../../../../src/workflows/approval/workflows/update-approval-settings"),
  () => ({
    updateApprovalSettingsWorkflow:
      workflowMocks.updateApprovalSettingsWorkflow,
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
  "filterableFields",
  "params",
  "queryConfig",
  "scope",
  "validatedBody",
] as const

interface GraphQueryResult {
  data: Record<string, unknown>[]
  metadata?: { count: number; skip: number; take: number }
}

const createGraphMock = () =>
  vi.fn<(args: Record<string, unknown>) => Promise<GraphQueryResult>>()

type MockJsonResponse = MedusaResponse & { json: ReturnType<typeof vi.fn> }

const createMockResponse = (): MockJsonResponse => {
  const candidate: unknown = {
    json: vi.fn<(body?: unknown) => unknown>().mockReturnThis(),
  }

  assertMockShape<MockJsonResponse>(candidate, ["json"])
  return candidate
}

const createMockRequest = <T>(
  options: {
    filterableFields?: Record<string, unknown>
    graph: ReturnType<typeof createGraphMock>
    params?: Record<string, string>
    queryConfig?: { pagination: Record<string, unknown> }
    validatedBody?: Record<string, unknown>
  },
  requiredKeys: readonly (keyof T)[],
): T => {
  const {
    filterableFields = {},
    graph,
    params = { id: "comp_1" },
    queryConfig = { pagination: { skip: 0, take: 20 } },
    validatedBody = {
      id: "apprset_from_body",
      requires_admin_approval: true,
      requires_sales_manager_approval: false,
    },
  } = options

  const candidate: unknown = {
    filterableFields,
    params,
    queryConfig,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
    validatedBody,
  }

  assertMockShape<T>(candidate, requiredKeys)
  return candidate
}

describe("GET /admin/companies/:id/approval-settings", () => {
  beforeEach(() => {
    workflowMocks.ensureApprovalSettingsWorkflow.mockReset()
    workflowMocks.ensureApprovalSettingsRun.mockReset()
    workflowMocks.ensureApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.ensureApprovalSettingsRun,
    })
    workflowMocks.updateApprovalSettingsWorkflow.mockReset()
    workflowMocks.updateApprovalSettingsRun.mockReset()
    workflowMocks.updateApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.updateApprovalSettingsRun,
    })
  })

  it("lists approval settings scoped to the route company id", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/companies/[id]/approval-settings/route")
    const graph = createGraphMock().mockResolvedValue({
      data: [
        {
          company_id: "comp_1",
          id: "apprset_1",
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      ],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const req = createMockRequest<AuthenticatedMedusaRequest>(
      {
        filterableFields: { company_id: "comp_from_query" },
        graph,
      },
      REQUEST_KEYS,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "approval_settings",
      fields: [
        "id",
        "company_id",
        "requires_admin_approval",
        "requires_sales_manager_approval",
        "*company",
      ],
      filters: {
        company_id: "comp_1",
      },
      pagination: {
        skip: 0,
        take: 20,
      },
    })
    expect(res.json).toHaveBeenCalledWith({
      approvalSettings: [
        {
          company_id: "comp_1",
          id: "apprset_1",
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      ],
      count: 1,
      limit: 20,
      offset: 0,
    })
  })
})

describe("POST /admin/companies/:id/approval-settings", () => {
  beforeEach(() => {
    workflowMocks.ensureApprovalSettingsWorkflow.mockReset()
    workflowMocks.ensureApprovalSettingsRun.mockReset()
    workflowMocks.ensureApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.ensureApprovalSettingsRun,
    })
    workflowMocks.updateApprovalSettingsWorkflow.mockReset()
    workflowMocks.updateApprovalSettingsRun.mockReset()
    workflowMocks.updateApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.updateApprovalSettingsRun,
    })
  })

  it("resolves the approval settings id from the route company id before updating", async () => {
    const { POST } =
      await import("../../../../../../src/api/admin/companies/[id]/approval-settings/route")
    const graph = createGraphMock()
      .mockResolvedValueOnce({
        data: [{ id: "apprset_from_company" }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company_id: "comp_1",
            id: "apprset_from_company",
            requires_admin_approval: true,
            requires_sales_manager_approval: false,
          },
        ],
      })
    workflowMocks.updateApprovalSettingsRun.mockResolvedValue({
      result: { id: "apprset_from_company" },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<AdminUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(graph).toHaveBeenNthCalledWith(1, {
      entity: "approval_settings",
      fields: ["id"],
      filters: { company_id: "comp_1" },
    })
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.ensureApprovalSettingsRun).not.toHaveBeenCalled()
  })

  it("ignores the stale body id and returns the resolved approval settings", async () => {
    const { POST } =
      await import("../../../../../../src/api/admin/companies/[id]/approval-settings/route")
    const graph = createGraphMock()
      .mockResolvedValueOnce({
        data: [{ id: "apprset_from_company" }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company_id: "comp_1",
            id: "apprset_from_company",
            requires_admin_approval: true,
            requires_sales_manager_approval: false,
          },
        ],
      })
    workflowMocks.updateApprovalSettingsRun.mockResolvedValue({
      result: { id: "apprset_from_company" },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<AdminUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      input: {
        company_id: "comp_1",
        id: "apprset_from_company",
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
    })
    expect(workflowMocks.updateApprovalSettingsRun).not.toHaveBeenCalledWith(
      objectContaining({
        input: objectContaining({ id: "apprset_from_body" }),
      }),
    )
    expect(res.json).toHaveBeenCalledWith({
      approvalSettings: [
        {
          company_id: "comp_1",
          id: "apprset_from_company",
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      ],
    })
  })

  it("creates missing approval settings before applying the update", async () => {
    const { POST } =
      await import("../../../../../../src/api/admin/companies/[id]/approval-settings/route")
    const graph = createGraphMock()
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            company_id: "comp_1",
            id: "apprset_created",
            requires_admin_approval: true,
            requires_sales_manager_approval: false,
          },
        ],
      })
    workflowMocks.ensureApprovalSettingsRun.mockResolvedValue({
      result: [{ id: "apprset_created" }],
    })
    workflowMocks.updateApprovalSettingsRun.mockResolvedValue({
      result: { id: "apprset_created" },
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<AdminUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsRun).toHaveBeenCalledWith({
      input: ["comp_1"],
    })
    expect(workflowMocks.ensureApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      input: {
        company_id: "comp_1",
        id: "apprset_created",
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
    })
    expect(res.json).toHaveBeenCalledWith({
      approvalSettings: [
        {
          company_id: "comp_1",
          id: "apprset_created",
          requires_admin_approval: true,
          requires_sales_manager_approval: false,
        },
      ],
    })
  })
})
