import { MedusaError } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

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

type StepInvoke = (input: unknown, context: unknown) => Promise<unknown>
type StepCompensate = (input: unknown, context: unknown) => Promise<void>
type CreateStep = (
  name: string,
  invoke: StepInvoke,
  compensate: StepCompensate,
) => StepInvoke & { compensate: StepCompensate }
type ServiceMethod = (input: unknown) => Promise<unknown>
type Graph = (input: unknown) => Promise<{ data: unknown[] }>

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
    createStep: vi.fn<CreateStep>((_name, invoke, compensate) =>
      Object.assign(invoke, { compensate }),
    ),
  }),
)

interface MockApprovalService {
  hasPendingApprovals: Mock<ServiceMethod>
  updateApprovals: Mock<ServiceMethod>
  updateApprovalStatuses: Mock<ServiceMethod>
}

type MockContainer = ReturnType<typeof makeContainer>

interface MockStep {
  (
    input: unknown,
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

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function" &&
  "compensate" in candidate &&
  typeof candidate.compensate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to expose invoke and compensate functions",
    )
  }
  return candidate
}

const makeApprovalService = (
  overrides: Partial<MockApprovalService> = {},
): MockApprovalService => ({
  hasPendingApprovals: vi.fn<ServiceMethod>(),
  updateApprovalStatuses: vi.fn<ServiceMethod>(),
  updateApprovals: vi.fn<ServiceMethod>(),
  ...overrides,
})

const makeContainer = ({
  approvalService = makeApprovalService(),
  graph,
}: {
  approvalService?: MockApprovalService
  graph: Mock<Graph>
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "approval") {
      return approvalService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("approval update steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws a controlled not-found error when updating a stale approval id", async () => {
    const { updateApprovalStep } =
      await import("../../../../../src/workflows/approval/steps/update-approval")
    const approvalService = makeApprovalService()
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const container = makeContainer({ approvalService, graph })

    await expect(
      asMockStep(updateApprovalStep)(
        { handled_by: "cus_1", id: "appr_missing", status: "approved" },
        { container },
      ),
    ).rejects.toMatchObject({
      message: "Approval appr_missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(approvalService.updateApprovals).not.toHaveBeenCalled()
  })

  it("throws a controlled not-found error when an approval status is missing", async () => {
    const { updateApprovalStatusStep } =
      await import("../../../../../src/workflows/approval/steps/update-approval-statuses")
    const approvalService = makeApprovalService()
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const container = makeContainer({ approvalService, graph })

    await expect(
      asMockStep(updateApprovalStatusStep)(
        {
          cart_id: "cart_missing",
          created_by: "cus_1",
          handled_by: "cus_2",
          id: "appr_1",
          status: "approved",
          type: "admin",
        },
        { container },
      ),
    ).rejects.toMatchObject({
      message: "Approval status for cart cart_missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(approvalService.hasPendingApprovals).not.toHaveBeenCalled()
    expect(approvalService.updateApprovalStatuses).not.toHaveBeenCalled()
  })
})
