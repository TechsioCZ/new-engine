import { beforeEach, describe, expect, it, vi } from "vitest"

const COMPANY_MODULE = "company"

const mocks = vi.hoisted(() => {
  class MockMedusaError extends Error {
    static Types = {
      NOT_FOUND: "not_found",
    }

    type: string

    constructor(type: string, message: string) {
      super(message)
      this.type = type
    }
  }

  return { MockMedusaError }
})

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
  MedusaError: mocks.MockMedusaError,
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

vi.mock("../../../../../src/modules/company", () => ({
  COMPANY_MODULE: "company",
}))

type CompanyService = {
  updateEmployees: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = (
  input: {
    company_id?: string
    id: string
    is_admin?: boolean
    spending_limit?: number
  },
  context: { container: MockContainer }
) => Promise<{
  compensateInput?: unknown
  payload: unknown
}>

const makeContainer = ({
  companyService,
  graph,
}: {
  companyService: CompanyService
  graph: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    if (key === COMPANY_MODULE) {
      return companyService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("updateEmployeesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("validates the route company and does not pass company_id into the update payload", async () => {
    const { updateEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/update-employees"
    )
    const graph = vi
      .fn()
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
    const companyService = {
      updateEmployees: vi.fn().mockResolvedValue({ id: "emp_1" }),
    }
    const container = makeContainer({ companyService, graph })

    const result = await (updateEmployeesStep as MockStep)(
      {
        company_id: "comp_1",
        id: "emp_1",
        is_admin: true,
        spending_limit: 100,
      },
      { container }
    )

    expect(graph).toHaveBeenNthCalledWith(
      1,
      {
        entity: "employee",
        fields: ["*"],
        filters: {
          company_id: "comp_1",
          id: "emp_1",
        },
      },
      { throwIfKeyNotFound: true }
    )
    expect(companyService.updateEmployees).toHaveBeenCalledWith({
      id: "emp_1",
      is_admin: true,
      spending_limit: 100,
    })
    expect(companyService.updateEmployees).not.toHaveBeenCalledWith(
      expect.objectContaining({ company_id: "comp_1" })
    )
    expect(graph).toHaveBeenNthCalledWith(
      2,
      {
        entity: "employee",
        fields: ["*", "customer.*", "company.*"],
        filters: {
          company_id: "comp_1",
          id: "emp_1",
        },
      },
      { throwIfKeyNotFound: true }
    )
    expect(result.compensateInput).toEqual({ id: "emp_1", is_admin: false })
  })

  it("throws when the employee does not belong to the requested company", async () => {
    const { updateEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/update-employees"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const companyService = {
      updateEmployees: vi.fn(),
    }
    const container = makeContainer({ companyService, graph })

    await expect(
      (updateEmployeesStep as MockStep)(
        {
          company_id: "comp_1",
          id: "emp_2",
          is_admin: true,
        },
        { container }
      )
    ).rejects.toMatchObject({
      message: "Employee was not found for the requested company.",
      type: "not_found",
    })
    expect(companyService.updateEmployees).not.toHaveBeenCalled()
  })
})
