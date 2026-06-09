import { ContainerRegistrationKeys, MedusaError } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowMocks = vi.hoisted(() => ({
  updateApprovalSettingsRun: vi.fn(),
}))

vi.mock(
  "../../../../../../src/workflows/approval/workflows/update-approval-settings",
  () => ({
    updateApprovalSettingsWorkflow: {
      run: workflowMocks.updateApprovalSettingsRun,
    },
  })
)

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
    workflowMocks.updateApprovalSettingsRun.mockReset()
  })

  it("returns a controlled not-found error when approval settings are missing", async () => {
    const { POST } = await import(
      "../../../../../../src/api/store/companies/[id]/approval-settings/route"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await expect(POST(req, res)).rejects.toMatchObject({
      message: "Approval settings for company comp_1 were not found",
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(workflowMocks.updateApprovalSettingsRun).not.toHaveBeenCalled()
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

    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      container: req.scope,
      input: {
        id: "apprset_1",
        requires_admin_approval: true,
      },
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalled()
  })
})
