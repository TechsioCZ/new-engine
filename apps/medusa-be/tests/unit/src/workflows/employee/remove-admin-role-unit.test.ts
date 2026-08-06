import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

type Graph = (input: unknown) => Promise<{ data: unknown[] }>
type UpdateProviderIdentities = (input: unknown) => Promise<unknown>
type StepInvoke = (input: unknown, context: unknown) => Promise<unknown>
type StepCompensate = (input: unknown, context: unknown) => Promise<void>
type CreateStep = (
  name: string,
  invoke: StepInvoke,
  compensate: StepCompensate,
) => StepInvoke & { compensate: StepCompensate }

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      QUERY: "query",
    },
    Modules: {
      AUTH: "auth",
    },
  }),
)

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

type MockContainer = ReturnType<typeof makeContainer>

interface MockStep {
  (
    input: {
      customer_id?: string
      email: string
      excluded_employee_ids?: string[]
    },
    context: { container: MockContainer },
  ): Promise<{
    compensateInput?: string[]
    payload: unknown
  }>
  compensate: (
    providerIdentityIds: string[] | undefined,
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

const makeContainer = ({
  graph,
  updateProviderIdentities = vi.fn<UpdateProviderIdentities>(),
}: {
  graph: Mock<Graph>
  updateProviderIdentities?: Mock<UpdateProviderIdentities>
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "auth") {
      return { updateProviderIdentities }
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("removeAdminRoleStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does nothing when the employee customer has no emailpass provider identity", async () => {
    const { removeAdminRoleStep } =
      await import("../../../../../src/workflows/employee/steps/remove-admin-role")
    const graph = vi
      .fn<Graph>()
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
    const updateProviderIdentities = vi.fn<UpdateProviderIdentities>()
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await asMockStep(removeAdminRoleStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
      { container },
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
    expect(result.compensateInput).toStrictEqual([])
  })

  it("clears the company admin role when a provider identity exists", async () => {
    const { removeAdminRoleStep } =
      await import("../../../../../src/workflows/employee/steps/remove-admin-role")
    const graph = vi
      .fn<Graph>()
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
    const updateProviderIdentities = vi
      .fn<UpdateProviderIdentities>()
      .mockImplementation(async () => {})
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await asMockStep(removeAdminRoleStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
      { container },
    )

    expect(updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
    expect(result.compensateInput).toStrictEqual(["authpi_1"])
  })

  it("keeps the company admin role when another active admin employee remains", async () => {
    const { removeAdminRoleStep } =
      await import("../../../../../src/workflows/employee/steps/remove-admin-role")
    const graph = vi
      .fn<Graph>()
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
    const updateProviderIdentities = vi
      .fn<UpdateProviderIdentities>()
      .mockImplementation(async () => {})
    const container = makeContainer({ graph, updateProviderIdentities })

    const result = await asMockStep(removeAdminRoleStep)(
      {
        customer_id: "cus_1",
        email: "employee@example.com",
        excluded_employee_ids: ["emp_1"],
      },
      { container },
    )

    expect(updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput).toStrictEqual([])
  })
})
