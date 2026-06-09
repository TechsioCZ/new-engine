import { beforeEach, describe, expect, it, vi } from "vitest"
import { APPROVAL_MODULE } from "../../../../../src/modules/approval"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
  StepResponse: class StepResponse<
    TPayload = unknown,
    TCompensationInput = unknown,
  > {
    compensateInput: TCompensationInput | undefined
    payload: TPayload

    constructor(payload: TPayload, compensateInput?: TCompensationInput) {
      this.payload = payload
      this.compensateInput = compensateInput
    }
  },
}))

type ApprovalService = {
  createApprovalSettings: ReturnType<typeof vi.fn>
  deleteApprovalSettings: ReturnType<typeof vi.fn>
  listApprovalSettings: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep<TInput> = {
  (
    input: TInput,
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    context: { container: MockContainer }
  ) => Promise<void>
}

const makeApprovalService = (
  overrides: Partial<ApprovalService> = {}
): ApprovalService => ({
  createApprovalSettings: vi.fn(),
  deleteApprovalSettings: vi.fn(),
  listApprovalSettings: vi.fn(),
  ...overrides,
})

const makeContainer = (approvalService: ApprovalService) => ({
  resolve: vi.fn((key: string) => {
    if (key === APPROVAL_MODULE) {
      return approvalService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("approval settings steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("recreates deleted approval settings with their previous flags on compensation", async () => {
    const { deleteApprovalSettingsStep } = await import(
      "../../../../../src/workflows/approval/steps/delete-approval-settings"
    )
    const approvalService = makeApprovalService({
      listApprovalSettings: vi.fn().mockResolvedValue([
        {
          company_id: "comp_1",
          id: "apprset_1",
          requires_admin_approval: true,
          requires_sales_manager_approval: true,
        },
      ]),
    })
    const container = makeContainer(approvalService)

    const result = await (
      deleteApprovalSettingsStep as MockStep<{ companyIds: string[] }>
    )({ companyIds: ["comp_1"] }, { container })

    expect(approvalService.deleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_1",
    ])

    await (
      deleteApprovalSettingsStep as MockStep<{ companyIds: string[] }>
    ).compensate(result.compensateInput, {
      container,
    })

    expect(approvalService.createApprovalSettings).toHaveBeenCalledWith([
      {
        company_id: "comp_1",
        requires_admin_approval: true,
        requires_sales_manager_approval: true,
      },
    ])
  })

  it("creates default approval settings only for restored companies that are missing them", async () => {
    const { ensureApprovalSettingsStep } = await import(
      "../../../../../src/workflows/approval/steps/ensure-approval-settings"
    )
    const approvalService = makeApprovalService({
      createApprovalSettings: vi.fn().mockResolvedValue([
        {
          company_id: "comp_2",
          id: "apprset_2",
          requires_admin_approval: false,
          requires_sales_manager_approval: false,
        },
      ]),
      listApprovalSettings: vi.fn().mockResolvedValue([
        {
          company_id: "comp_1",
          id: "apprset_1",
        },
      ]),
    })
    const container = makeContainer(approvalService)

    const result = await (ensureApprovalSettingsStep as MockStep<string[]>)(
      ["comp_1", "comp_2"],
      { container }
    )

    expect(approvalService.listApprovalSettings).toHaveBeenCalledWith({
      company_id: ["comp_1", "comp_2"],
    })
    expect(approvalService.createApprovalSettings).toHaveBeenCalledWith([
      {
        company_id: "comp_2",
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
    ])
    expect(result.compensateInput).toEqual(["apprset_2"])

    await (ensureApprovalSettingsStep as MockStep<string[]>).compensate(
      result.compensateInput,
      {
        container,
      }
    )

    expect(approvalService.deleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_2",
    ])
  })
})
