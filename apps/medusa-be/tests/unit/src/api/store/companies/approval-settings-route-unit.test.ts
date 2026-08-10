import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StoreUpdateApprovalSettingsType } from "../../../../../../src/api/store/companies/validators"

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

vi.mock(
  import("../../../../../../src/workflows/approval/workflows/ensure-approval-settings"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      ensureApprovalSettingsWorkflow:
        workflowMocks.ensureApprovalSettingsWorkflow,
    }),
)
vi.mock(
  import("../../../../../../src/workflows/approval/workflows/update-approval-settings"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
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

const REQUEST_KEYS = ["params", "scope", "validatedBody"] as const

const createGraphMock = () =>
  vi.fn<
    (args: object) => Promise<{
      data: object[]
    }>
  >()

type MockSendResponse = MedusaResponse & {
  send: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
}

const createMockResponse = (): MockSendResponse => {
  const candidate: unknown = {
    send: vi.fn<() => unknown>().mockReturnThis(),
    status: vi.fn<(code: number) => unknown>().mockReturnThis(),
  }

  assertMockShape<MockSendResponse>(candidate, ["send", "status"])
  return candidate
}

const createMockRequest = <T>(
  options: {
    graph: ReturnType<typeof createGraphMock>
    params?: Record<string, string>
    validatedBody?: object
  },
  requiredKeys: readonly (keyof T)[],
): T => {
  const {
    graph,
    params = { id: "comp_1" },
    validatedBody = { requires_admin_approval: true },
  } = options

  const candidate: unknown = {
    params,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        throw new Error(`Unexpected container key: ${key}`)
      }),
    },
    validatedBody,
  }

  assertMockShape<T>(candidate, requiredKeys)
  return candidate
}

describe("POST /store/companies/:id/approval-settings", () => {
  beforeEach(() => {
    workflowMocks.ensureApprovalSettingsWorkflow.mockReset()
    workflowMocks.updateApprovalSettingsWorkflow.mockReset()
    workflowMocks.ensureApprovalSettingsRun.mockReset()
    workflowMocks.updateApprovalSettingsRun.mockReset()
    workflowMocks.ensureApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.ensureApprovalSettingsRun,
    })
    workflowMocks.updateApprovalSettingsWorkflow.mockReturnValue({
      run: workflowMocks.updateApprovalSettingsRun,
    })
  })

  it("creates missing approval settings before applying the update", async () => {
    const { POST } =
      await import("../../../../../../src/api/store/companies/[id]/approval-settings/route")
    const graph = createGraphMock().mockResolvedValue({ data: [] })
    workflowMocks.ensureApprovalSettingsRun.mockResolvedValue({
      result: [{ company_id: "comp_1", id: "apprset_created" }],
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<StoreUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.ensureApprovalSettingsRun).toHaveBeenCalledWith({
      input: ["comp_1"],
    })
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
  })

  it("applies the update using the newly created approval settings id", async () => {
    const { POST } =
      await import("../../../../../../src/api/store/companies/[id]/approval-settings/route")
    const graph = createGraphMock().mockResolvedValue({ data: [] })
    workflowMocks.ensureApprovalSettingsRun.mockResolvedValue({
      result: [{ company_id: "comp_1", id: "apprset_created" }],
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<StoreUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      input: {
        company_id: "comp_1",
        id: "apprset_created",
        requires_admin_approval: true,
      },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith()
  })

  it("updates the existing approval settings record", async () => {
    const { POST } =
      await import("../../../../../../src/api/store/companies/[id]/approval-settings/route")
    const graph = createGraphMock().mockResolvedValue({
      data: [{ company_id: "comp_1", id: "apprset_1" }],
    })
    const req = createMockRequest<
      AuthenticatedMedusaRequest<StoreUpdateApprovalSettingsType>
    >({ graph }, REQUEST_KEYS)
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsRun).not.toHaveBeenCalled()
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope,
    )
    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      input: {
        company_id: "comp_1",
        id: "apprset_1",
        requires_admin_approval: true,
      },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith()
  })
})
