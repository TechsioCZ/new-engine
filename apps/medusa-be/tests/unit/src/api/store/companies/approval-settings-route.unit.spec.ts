import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowMocks = vi.hoisted(() => ({
  ensureApprovalSettingsRun: vi.fn(),
  updateApprovalSettingsRun: vi.fn(),
}))

vi.mock("../../../../../../src/workflows/approval/workflows", () => ({
  ensureApprovalSettingsWorkflow: {
    run: workflowMocks.ensureApprovalSettingsRun,
  },
  updateApprovalSettingsWorkflow: {
    run: workflowMocks.updateApprovalSettingsRun,
  },
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
      }),
    },
    validatedBody,
  }) as any

const createMockResponse = () =>
  ({
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }) as any

describe("POST /store/companies/:id/approval-settings", () => {
  beforeEach(() => {
    workflowMocks.ensureApprovalSettingsRun.mockReset()
    workflowMocks.updateApprovalSettingsRun.mockReset()
  })

  it("creates missing approval settings before applying the update", async () => {
    const { POST } = await import(
      "../../../../../../src/api/store/companies/[id]/approval-settings/route"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    workflowMocks.ensureApprovalSettingsRun.mockResolvedValue({
      result: [{ id: "apprset_created", company_id: "comp_1" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsRun).toHaveBeenCalledWith({
      container: req.scope,
      input: ["comp_1"],
    })
    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      container: req.scope,
      input: {
        company_id: "comp_1",
        id: "apprset_created",
        requires_admin_approval: true,
      },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalled()
  })

  it("updates the existing approval settings record", async () => {
    const { POST } = await import(
      "../../../../../../src/api/store/companies/[id]/approval-settings/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "apprset_1", company_id: "comp_1" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.ensureApprovalSettingsRun).not.toHaveBeenCalled()
    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      container: req.scope,
      input: {
        company_id: "comp_1",
        id: "apprset_1",
        requires_admin_approval: true,
      },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalled()
  })
})
