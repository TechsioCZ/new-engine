import { MedusaError } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

type MockApprovalService = {
  hasPendingApprovals: ReturnType<typeof vi.fn>
  updateApprovals: ReturnType<typeof vi.fn>
  updateApprovalStatuses: ReturnType<typeof vi.fn>
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
  overrides: Partial<MockApprovalService> = {}
): MockApprovalService => ({
  hasPendingApprovals: vi.fn(),
  updateApprovals: vi.fn(),
  updateApprovalStatuses: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  approvalService = makeApprovalService(),
  graph,
}: {
  approvalService?: MockApprovalService
  graph: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key: string) => {
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
    const { updateApprovalStep } = await import(
      "../../../../../src/workflows/approval/steps/update-approval"
    )
    const approvalService = makeApprovalService()
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const container = makeContainer({ approvalService, graph })

    await expect(
      (
        updateApprovalStep as MockStep<{
          handled_by: string
          id: string
          status: "approved"
        }>
      )(
        { handled_by: "cus_1", id: "appr_missing", status: "approved" },
        { container }
      )
    ).rejects.toMatchObject({
      message: "Approval appr_missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(approvalService.updateApprovals).not.toHaveBeenCalled()
  })

  it("throws a controlled not-found error when an approval status is missing", async () => {
    const { updateApprovalStatusStep } = await import(
      "../../../../../src/workflows/approval/steps/update-approval-statuses"
    )
    const approvalService = makeApprovalService()
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const container = makeContainer({ approvalService, graph })

    await expect(
      (
        updateApprovalStatusStep as MockStep<{
          cart_id: string
          created_by: string
          handled_by: string
          id: string
          status: "approved"
          type: "admin"
        }>
      )(
        {
          cart_id: "cart_missing",
          created_by: "cus_1",
          handled_by: "cus_2",
          id: "appr_1",
          status: "approved",
          type: "admin",
        },
        { container }
      )
    ).rejects.toMatchObject({
      message: "Approval status for cart cart_missing was not found",
      type: MedusaError.Types.NOT_FOUND,
    })
    expect(approvalService.hasPendingApprovals).not.toHaveBeenCalled()
    expect(approvalService.updateApprovalStatuses).not.toHaveBeenCalled()
  })
})
