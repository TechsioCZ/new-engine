import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowMocks = vi.hoisted(() => ({
  ensureApprovalSettingsRun: vi.fn(),
  ensureApprovalSettingsWorkflow: vi.fn(),
  updateApprovalSettingsRun: vi.fn(),
  updateApprovalSettingsWorkflow: vi.fn(),
}))

vi.mock(import("../../../../../../src/workflows/approval/workflows"), () => ({
  ensureApprovalSettingsWorkflow: workflowMocks.ensureApprovalSettingsWorkflow,
  updateApprovalSettingsWorkflow: workflowMocks.updateApprovalSettingsWorkflow,
}))

const createMockRequest = ({
  graph,
  params = { id: "comp_1" },
  validatedBody = { requires_admin_approval: true },
}: {
  graph: ReturnType<typeof vi.fn>
  params?: Record<string, string>
  validatedBody?: Record<string, unknown>
}) =>
  ({
    params,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        throw new Error(`Unexpected container key: ${key}`)
      }),
    },
    validatedBody,
  }) as any

const createMockResponse = () =>
  ({
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

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
    const graph = vi.fn().mockResolvedValue({ data: [] })
    workflowMocks.ensureApprovalSettingsRun.mockResolvedValue({
      result: [{ company_id: "comp_1", id: "apprset_created" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope
    )
    expect(workflowMocks.ensureApprovalSettingsRun).toHaveBeenCalledWith({
      input: ["comp_1"],
    })
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope
    )
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
    const graph = vi.fn().mockResolvedValue({
      data: [{ company_id: "comp_1", id: "apprset_1" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsRun).not.toHaveBeenCalled()
    expect(workflowMocks.updateApprovalSettingsWorkflow).toHaveBeenCalledWith(
      req.scope
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
