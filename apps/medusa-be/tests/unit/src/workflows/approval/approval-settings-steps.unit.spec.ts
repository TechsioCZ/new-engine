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
  restoreApprovalSettings: ReturnType<typeof vi.fn>
  softDeleteApprovalSettings: ReturnType<typeof vi.fn>
}

type LinkService = {
  create: ReturnType<typeof vi.fn>
  dismiss: ReturnType<typeof vi.fn>
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
  restoreApprovalSettings: vi.fn(),
  softDeleteApprovalSettings: vi.fn(),
  ...overrides,
})

const makeLinkService = (
  overrides: Partial<LinkService> = {}
): LinkService => ({
  create: vi.fn(),
  dismiss: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  approvalService,
  graph = vi.fn(),
  linkService = makeLinkService(),
}: {
  approvalService: ApprovalService
  graph?: ReturnType<typeof vi.fn>
  linkService?: LinkService
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === APPROVAL_MODULE) {
      return approvalService
    }

    if (key === "link") {
      return linkService
    }

    if (key === "query") {
      return { graph }
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("approval settings steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("soft-deletes approval settings and restores the same row on compensation", async () => {
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
    const container = makeContainer({ approvalService })

    const result = await (
      deleteApprovalSettingsStep as MockStep<{ companyIds: string[] }>
    )({ companyIds: ["comp_1"] }, { container })

    expect(approvalService.softDeleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_1",
    ])
    expect(approvalService.deleteApprovalSettings).not.toHaveBeenCalled()

    await (
      deleteApprovalSettingsStep as MockStep<{ companyIds: string[] }>
    ).compensate(result.compensateInput, {
      container,
    })

    expect(approvalService.restoreApprovalSettings).toHaveBeenCalledWith([
      "apprset_1",
    ])
    expect(approvalService.createApprovalSettings).not.toHaveBeenCalled()
  })

  it("restores recoverable approval settings and creates defaults only when missing", async () => {
    const { ensureApprovalSettingsStep } = await import(
      "../../../../../src/workflows/approval/steps/ensure-approval-settings"
    )
    const restoredSetting = {
      company_id: "comp_2",
      deleted_at: "2026-01-02T00:00:00.000Z",
      id: "apprset_deleted",
      requires_admin_approval: true,
      requires_sales_manager_approval: true,
      updated_at: "2026-01-02T00:00:00.000Z",
    }
    const createdSetting = {
      company_id: "comp_3",
      id: "apprset_created",
      requires_admin_approval: false,
      requires_sales_manager_approval: false,
    }
    const approvalService = makeApprovalService({
      createApprovalSettings: vi.fn().mockResolvedValue([createdSetting]),
      listApprovalSettings: vi.fn().mockResolvedValue([
        {
          company_id: "comp_1",
          deleted_at: null,
          id: "apprset_active",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        restoredSetting,
      ]),
    })
    const container = makeContainer({ approvalService })

    const result = await (ensureApprovalSettingsStep as MockStep<string[]>)(
      ["comp_1", "comp_2", "comp_3"],
      { container }
    )

    expect(approvalService.listApprovalSettings).toHaveBeenCalledWith(
      {
        company_id: ["comp_1", "comp_2", "comp_3"],
      },
      {
        withDeleted: true,
      }
    )
    expect(approvalService.restoreApprovalSettings).toHaveBeenCalledWith([
      "apprset_deleted",
    ])
    expect(approvalService.createApprovalSettings).toHaveBeenCalledWith([
      {
        company_id: "comp_3",
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      },
    ])
    expect(result.payload).toEqual({
      approval_settings: [restoredSetting, createdSetting],
      created_approval_settings: [createdSetting],
    })
    expect(result.compensateInput).toEqual({
      created_ids: ["apprset_created"],
      restored_ids: ["apprset_deleted"],
    })

    await (ensureApprovalSettingsStep as MockStep<string[]>).compensate(
      result.compensateInput,
      {
        container,
      }
    )

    expect(approvalService.deleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_created",
    ])
    expect(approvalService.softDeleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_deleted",
    ])
  })

  it("dismisses stale company approval-settings links with the link API", async () => {
    const { dismissCompanyApprovalSettingsLinksStep } = await import(
      "../../../../../src/workflows/approval/steps/dismiss-company-approval-settings-links"
    )
    const staleLink = {
      approval: { approval_settings_id: "apprset_missing" },
      company: { company_id: "comp_1" },
    }
    const approvalService = makeApprovalService()
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          approval_settings_id: "apprset_missing",
          company_id: "comp_1",
        },
      ],
    })
    const linkService = makeLinkService()
    const container = makeContainer({ approvalService, graph, linkService })

    const result = await (
      dismissCompanyApprovalSettingsLinksStep as MockStep<string[]>
    )(["comp_1"], { container })

    expect(graph).toHaveBeenCalledWith({
      entity: "company_approval_settings",
      fields: ["company_id", "approval_settings_id"],
      filters: {
        company_id: ["comp_1"],
      },
    })
    expect(linkService.dismiss).toHaveBeenCalledWith([staleLink])

    await (
      dismissCompanyApprovalSettingsLinksStep as MockStep<string[]>
    ).compensate(result.compensateInput, { container })

    expect(linkService.create).toHaveBeenCalledWith([staleLink])
  })
})
