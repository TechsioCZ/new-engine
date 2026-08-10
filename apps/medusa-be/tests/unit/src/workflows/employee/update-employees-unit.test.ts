import type { Mock } from "vitest"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

const COMPANY_MODULE = "company"

vi.mock(
  import("@medusajs/framework/utils"),
  async (importOriginal) => await importOriginal(),
)

type StepImplementation = (...args: unknown[]) => unknown

type CreateStepFn = (
  name: string,
  invoke: StepImplementation,
  compensate?: StepImplementation,
) => StepImplementation & { compensate?: StepImplementation }

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) => {
  const original = await importOriginal()

  return overrideModule(original, {
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
  })
})

vi.mock(import("../../../../../src/modules/company"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    COMPANY_MODULE: "company",
  }),
)

type AsyncMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>

interface EmployeeRecord {
  company?: { id: string }
  customer?: { id: string }
  id: string
  is_admin?: boolean
  spending_limit?: number
}

interface EmployeeUpdate {
  id: string
  is_admin?: boolean
  spending_limit?: number
}

type Graph = (
  query: unknown,
  options?: unknown,
) => Promise<{ data: EmployeeRecord[] }>

interface CompanyService {
  updateEmployees: Mock<AsyncMockFn<[EmployeeUpdate], EmployeeRecord>>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = (
  input: {
    company_id?: string
    id: string
    is_admin?: boolean
    spending_limit?: number
  },
  context: { container: MockContainer },
) => Promise<{
  compensateInput?: unknown
  payload: unknown
}>

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function",
    )
  }

  return candidate
}

const makeContainer = ({
  companyService,
  graph,
}: {
  companyService: CompanyService
  graph: Mock<Graph>
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
    if (key === "query") {
      return { graph }
    }

    if (key === COMPANY_MODULE) {
      return companyService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

const makeCompanyService = (): CompanyService => ({
  updateEmployees: vi
    .fn<AsyncMockFn<[EmployeeUpdate], EmployeeRecord>>()
    .mockResolvedValue({ id: "emp_1" }),
})

describe("updateEmployeesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("validates the route company and does not pass company_id into the update payload", async () => {
    const { updateEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/update-employees")
    const graph = vi
      .fn<Graph>()
      .mockResolvedValueOnce({
        data: [{ id: "emp_1", is_admin: false }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { id: "comp_1" },
            customer: { id: "cus_1" },
            id: "emp_1",
            is_admin: true,
          },
        ],
      })
    const companyService = makeCompanyService()
    const container = makeContainer({ companyService, graph })

    const result = await asMockStep(updateEmployeesStep)(
      {
        company_id: "comp_1",
        id: "emp_1",
        is_admin: true,
        spending_limit: 100,
      },
      { container },
    )

    expect(graph.mock.calls).toStrictEqual([
      [
        {
          entity: "employee",
          fields: ["*"],
          filters: {
            company_id: "comp_1",
            id: "emp_1",
          },
        },
        { throwIfKeyNotFound: true },
      ],
      [
        {
          entity: "employee",
          fields: ["*", "customer.*", "company.*"],
          filters: {
            company_id: "comp_1",
            id: "emp_1",
          },
        },
        { throwIfKeyNotFound: true },
      ],
    ])
    expect(companyService.updateEmployees.mock.calls).toStrictEqual([
      [
        {
          id: "emp_1",
          is_admin: true,
          spending_limit: 100,
        },
      ],
    ])
    expect(result.compensateInput).toMatchObject({
      id: "emp_1",
      is_admin: false,
    })
    expect(result.payload).toStrictEqual({
      company: { id: "comp_1" },
      customer: { id: "cus_1" },
      id: "emp_1",
      is_admin: true,
    })
  })

  it("throws when the employee does not belong to the requested company", async () => {
    const { updateEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/update-employees")
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const companyService = makeCompanyService()
    const container = makeContainer({ companyService, graph })

    await expect(
      asMockStep(updateEmployeesStep)(
        {
          company_id: "comp_1",
          id: "emp_2",
          is_admin: true,
        },
        { container },
      ),
    ).rejects.toMatchObject({
      message: "Employee was not found for the requested company.",
      type: "not_found",
    })
    expect(companyService.updateEmployees).not.toHaveBeenCalled()
  })
})
