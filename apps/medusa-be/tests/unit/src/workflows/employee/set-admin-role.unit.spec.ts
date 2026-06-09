import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  Modules: {
    AUTH: "auth",
  },
}))

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

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = {
  (
    input: { employeeId: string; customerId: string },
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: { providerIdentityId: string }
    payload: unknown
  }>
  compensate: (
    input: { providerIdentityId: string } | undefined,
    context: { container: MockContainer }
  ) => Promise<void>
}

const makeContainer = ({
  graph,
  updateProviderIdentities = vi.fn(),
}: {
  graph: ReturnType<typeof vi.fn>
  updateProviderIdentities?: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "auth") {
      return { updateProviderIdentities }
    }

    throw new Error(`Unexpected dependency: ${String(key)}`)
  }),
})

describe("setAdminRoleStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does nothing when the customer has no emailpass provider identity", async () => {
    const { setAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/set-admin-role"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "employee_1", customer: { has_account: true } }],
      })
      .mockResolvedValueOnce({ data: [{ email: "employee@example.com" }] })
      .mockResolvedValueOnce({ data: [] })
    const updateProviderIdentities = vi.fn()
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (setAdminRoleStep as MockStep)(
      { customerId: "cus_1", employeeId: "employee_1" },
      { container }
    )

    expect(updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput).toBeUndefined()
  })

  it("sets the company admin role and returns compensation input", async () => {
    const { setAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/set-admin-role"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "employee_1", customer: { has_account: true } }],
      })
      .mockResolvedValueOnce({ data: [{ email: "employee@example.com" }] })
      .mockResolvedValueOnce({ data: [{ id: "authpi_1" }] })
    const updateProviderIdentities = vi.fn().mockResolvedValue(undefined)
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (setAdminRoleStep as MockStep)(
      { customerId: "cus_1", employeeId: "employee_1" },
      { container }
    )

    expect(updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: "company_admin",
        },
      },
    ])
    expect(result.compensateInput).toEqual({ providerIdentityId: "authpi_1" })
  })

  it("clears the company admin role on compensation", async () => {
    const { setAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/set-admin-role"
    )
    const graph = vi.fn()
    const updateProviderIdentities = vi.fn().mockResolvedValue(undefined)
    const container = makeContainer({ graph, updateProviderIdentities })

    await (setAdminRoleStep as MockStep).compensate(
      { providerIdentityId: "authpi_1" },
      { container }
    )

    expect(updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
  })
})
