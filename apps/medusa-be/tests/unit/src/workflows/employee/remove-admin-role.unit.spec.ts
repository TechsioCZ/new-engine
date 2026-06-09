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
    input: { email: string },
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: string
    payload: unknown
  }>
  compensate: (
    providerIdentityId: string | undefined,
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

describe("removeAdminRoleStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does nothing when the employee customer has no emailpass provider identity", async () => {
    const { removeAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/remove-admin-role"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const updateProviderIdentities = vi.fn()
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (removeAdminRoleStep as MockStep)(
      { email: "employee@example.com" },
      { container }
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: "employee@example.com",
        provider: "emailpass",
      },
    })
    expect(updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput).toBeUndefined()
  })

  it("clears the company admin role when a provider identity exists", async () => {
    const { removeAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/remove-admin-role"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "authpi_1" }],
    })
    const updateProviderIdentities = vi.fn().mockResolvedValue(undefined)
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (removeAdminRoleStep as MockStep)(
      { email: "employee@example.com" },
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
    expect(result.compensateInput).toBe("authpi_1")
  })
})
