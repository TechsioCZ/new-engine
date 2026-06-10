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
    input: {
      customer_id?: string
      email: string
      excluded_employee_ids?: string[]
    },
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: string[]
    payload: unknown
  }>
  compensate: (
    providerIdentityIds: string[] | undefined,
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
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ customer_id: "cus_1", employee_id: "emp_1" }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { deleted_at: null, id: "comp_1" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_1",
            is_admin: false,
          },
        ],
      })
      .mockResolvedValueOnce({ data: [] })
    const updateProviderIdentities = vi.fn()
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (removeAdminRoleStep as MockStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
      { container }
    )

    expect(graph).toHaveBeenNthCalledWith(3, {
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: ["employee@example.com"],
        provider: "emailpass",
      },
    })
    expect(updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput).toEqual([])
  })

  it("clears the company admin role when a provider identity exists", async () => {
    const { removeAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/remove-admin-role"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ customer_id: "cus_1", employee_id: "emp_1" }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { deleted_at: null, id: "comp_1" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_1",
            is_admin: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ id: "authpi_1" }],
      })
    const updateProviderIdentities = vi.fn().mockResolvedValue(undefined)
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (removeAdminRoleStep as MockStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
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
    expect(result.compensateInput).toEqual(["authpi_1"])
  })

  it("keeps the company admin role when another active admin employee remains", async () => {
    const { removeAdminRoleStep } = await import(
      "../../../../../src/workflows/employee/steps/remove-admin-role"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { customer_id: "cus_1", employee_id: "emp_1" },
          { customer_id: "cus_1", employee_id: "emp_2" },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { deleted_at: null, id: "comp_1" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_1",
            is_admin: false,
          },
          {
            company: { deleted_at: null, id: "comp_2" },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_2",
            is_admin: true,
          },
        ],
      })
    const updateProviderIdentities = vi.fn().mockResolvedValue(undefined)
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await (removeAdminRoleStep as MockStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
      { container }
    )

    expect(updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput).toEqual([])
  })
})
