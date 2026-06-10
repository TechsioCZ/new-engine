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
  validatedBody = {
    id: "apprset_from_body",
    requires_admin_approval: true,
    requires_sales_manager_approval: false,
  },
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

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
    validatedBody,
  }) as any

const createMockResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
  }) as any

describe("POST /admin/companies/:id/approval-settings", () => {
  beforeEach(() => {
    workflowMocks.ensureApprovalSettingsRun.mockReset()
    workflowMocks.updateApprovalSettingsRun.mockReset()
  })

  it("updates approval settings resolved by route company id", async () => {
    const { POST } = await import(
      "../../../../../../src/api/admin/companies/[id]/approval-settings/route"
    )
    const graph = vi
      .fn()
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
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(graph).toHaveBeenNthCalledWith(1, {
      entity: "approval_settings",
      fields: ["id"],
      filters: { company_id: "comp_1" },
    })
    expect(workflowMocks.ensureApprovalSettingsRun).not.toHaveBeenCalled()
    expect(workflowMocks.updateApprovalSettingsRun).toHaveBeenCalledWith({
      container: req.scope,
      input: {
        company_id: "comp_1",
        id: "apprset_from_company",
        requires_admin_approval: true,
        requires_sales_manager_approval: false,
      },
    })
    expect(workflowMocks.updateApprovalSettingsRun).not.toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ id: "apprset_from_body" }),
      })
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
    const { POST } = await import(
      "../../../../../../src/api/admin/companies/[id]/approval-settings/route"
    )
    const graph = vi
      .fn()
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
