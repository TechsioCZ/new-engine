import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { APPROVAL_MODULE } from "../../../../../src/modules/approval"

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

type StepImplementation = (...args: unknown[]) => unknown

type CreateStepFn = (
  name: string,
  invoke: StepImplementation,
  compensate?: StepImplementation,
) => StepImplementation & { compensate?: StepImplementation }

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
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
    createStep: vi.fn<CreateStepFn>((_name, invoke, compensate) => {
      if (compensate === undefined) {
        return invoke
      }
      return Object.assign(invoke, { compensate })
    }),
  }),
)

type AsyncMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>

interface ApprovalService {
  createApprovalSettings: Mock<AsyncMockFn>
  deleteApprovalSettings: Mock<AsyncMockFn>
  listApprovalSettings: Mock<AsyncMockFn>
  restoreApprovalSettings: Mock<AsyncMockFn>
  softDeleteApprovalSettings: Mock<AsyncMockFn>
}

interface LinkService {
  create: Mock<AsyncMockFn>
  dismiss: Mock<AsyncMockFn>
}

type GraphQueryFn = (input: unknown) => Promise<{ data: unknown[] }>

type MockContainer = ReturnType<typeof makeContainer>

interface MockStep<TInput> {
  (
    input: TInput,
    context: { container: MockContainer },
  ): Promise<{
    compensateInput?: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    context: { container: MockContainer },
  ) => Promise<void>
}

const isMockStep = <TInput>(
  candidate: unknown,
): candidate is MockStep<TInput> =>
  typeof candidate === "function" &&
  "compensate" in candidate &&
  typeof candidate.compensate === "function"

const asMockStep = <TInput>(candidate: unknown): MockStep<TInput> => {
  if (!isMockStep<TInput>(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to expose invoke and compensate functions",
    )
  }

  return candidate
}

const makeApprovalService = (
  overrides: Partial<ApprovalService> = {},
): ApprovalService => ({
  createApprovalSettings: vi.fn<AsyncMockFn>(),
  deleteApprovalSettings: vi.fn<AsyncMockFn>(),
  listApprovalSettings: vi.fn<AsyncMockFn>(),
  restoreApprovalSettings: vi.fn<AsyncMockFn>(),
  softDeleteApprovalSettings: vi.fn<AsyncMockFn>(),
  ...overrides,
})

const makeLinkService = (
  overrides: Partial<LinkService> = {},
): LinkService => ({
  create: vi.fn<AsyncMockFn>(),
  dismiss: vi.fn<AsyncMockFn>(),
  ...overrides,
})

const makeContainer = ({
  approvalService,
  graph = vi.fn<GraphQueryFn>(),
  linkService = makeLinkService(),
}: {
  approvalService: ApprovalService
  graph?: Mock<GraphQueryFn>
  linkService?: LinkService
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
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
    const { deleteApprovalSettingsStep } =
      await import("../../../../../src/workflows/approval/steps/delete-approval-settings")
    const approvalService = makeApprovalService({
      listApprovalSettings: vi.fn<AsyncMockFn>().mockResolvedValue([
        {
          company_id: "comp_1",
          id: "apprset_1",
          requires_admin_approval: true,
          requires_sales_manager_approval: true,
        },
      ]),
    })
    const container = makeContainer({ approvalService })

    const result = await asMockStep<{ companyIds: string[] }>(
      deleteApprovalSettingsStep,
    )({ companyIds: ["comp_1"] }, { container })

    expect(approvalService.softDeleteApprovalSettings).toHaveBeenCalledWith([
      "apprset_1",
    ])
    expect(approvalService.deleteApprovalSettings).not.toHaveBeenCalled()

    await asMockStep<{ companyIds: string[] }>(
      deleteApprovalSettingsStep,
    ).compensate(result.compensateInput, {
      container,
    })

    expect(approvalService.restoreApprovalSettings).toHaveBeenCalledWith([
      "apprset_1",
    ])
    expect(approvalService.createApprovalSettings).not.toHaveBeenCalled()
  })

  it("restores recoverable approval settings and creates defaults only when missing", async () => {
    const { ensureApprovalSettingsStep } =
      await import("../../../../../src/workflows/approval/steps/ensure-approval-settings")
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
      createApprovalSettings: vi
        .fn<AsyncMockFn>()
        .mockResolvedValue([createdSetting]),
      listApprovalSettings: vi.fn<AsyncMockFn>().mockResolvedValue([
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

    const result = await asMockStep<string[]>(ensureApprovalSettingsStep)(
      ["comp_1", "comp_2", "comp_3"],
      { container },
    )

    expect({
      compensateInput: result.compensateInput,
      createCalls: approvalService.createApprovalSettings.mock.calls,
      listCalls: approvalService.listApprovalSettings.mock.calls,
      payload: result.payload,
      restoreCalls: approvalService.restoreApprovalSettings.mock.calls,
    }).toStrictEqual({
      compensateInput: {
        created_ids: ["apprset_created"],
        restored_ids: ["apprset_deleted"],
      },
      createCalls: [
        [
          [
            {
              company_id: "comp_3",
              requires_admin_approval: false,
              requires_sales_manager_approval: false,
            },
          ],
        ],
      ],
      listCalls: [
        [{ company_id: ["comp_1", "comp_2", "comp_3"] }, { withDeleted: true }],
      ],
      payload: {
        approval_settings: [restoredSetting, createdSetting],
        created_approval_settings: [createdSetting],
      },
      restoreCalls: [[["apprset_deleted"]]],
    })

    await asMockStep<string[]>(ensureApprovalSettingsStep).compensate(
      result.compensateInput,
      {
        container,
      },
    )

    expect({
      deleteCalls: approvalService.deleteApprovalSettings.mock.calls,
      softDeleteCalls: approvalService.softDeleteApprovalSettings.mock.calls,
    }).toStrictEqual({
      deleteCalls: [[["apprset_created"]]],
      softDeleteCalls: [[["apprset_deleted"]]],
    })
  })

  it("dismisses stale company approval-settings links with the link API", async () => {
    const { dismissCompanyApprovalSettingsLinksStep } =
      await import("../../../../../src/workflows/approval/steps/dismiss-company-approval-settings-links")
    const staleLink = {
      approval: { approval_settings_id: "apprset_missing" },
      company: { company_id: "comp_1" },
    }
    const approvalService = makeApprovalService()
    const graph = vi.fn<GraphQueryFn>().mockResolvedValue({
      data: [
        {
          approval_settings_id: "apprset_missing",
          company_id: "comp_1",
        },
      ],
    })
    const linkService = makeLinkService()
    const container = makeContainer({ approvalService, graph, linkService })

    const result = await asMockStep<string[]>(
      dismissCompanyApprovalSettingsLinksStep,
    )(["comp_1"], { container })

    expect(graph).toHaveBeenCalledWith({
      entity: "company_approval_settings",
      fields: ["company_id", "approval_settings_id"],
      filters: {
        company_id: ["comp_1"],
      },
    })
    expect(linkService.dismiss).toHaveBeenCalledWith([staleLink])

    await asMockStep<string[]>(
      dismissCompanyApprovalSettingsLinksStep,
    ).compensate(result.compensateInput, { container })

    expect(linkService.create).toHaveBeenCalledWith([staleLink])
  })
})
