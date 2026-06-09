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

vi.mock("../../../../../src/modules/company", () => ({
  COMPANY_MODULE: "company",
}))

type CompanyService = {
  restoreEmployees: ReturnType<typeof vi.fn>
  softDeleteEmployees: ReturnType<typeof vi.fn>
}

type AuthService = {
  updateProviderIdentities: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep = {
  (
    input:
      | string
      | string[]
      | {
          company_id?: string
          id: string | string[]
        },
    context: { container: MockContainer }
  ): Promise<{
    compensateInput?: {
      employee_ids: string[]
      provider_identity_ids: string[]
    }
    payload: unknown
  }>
  compensate: (
    input:
      | {
          employee_ids: string[]
          provider_identity_ids: string[]
        }
      | undefined,
    context: { container: MockContainer }
  ) => Promise<void>
}

const makeCompanyService = (
  overrides: Partial<CompanyService> = {}
): CompanyService => ({
  restoreEmployees: vi.fn(),
  softDeleteEmployees: vi.fn(),
  ...overrides,
})

const makeAuthService = (
  overrides: Partial<AuthService> = {}
): AuthService => ({
  updateProviderIdentities: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  authService = makeAuthService(),
  companyService = makeCompanyService(),
  graph,
}: {
  authService?: AuthService
  companyService?: CompanyService
  graph: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "auth") {
      return authService
    }

    if (key === COMPANY_MODULE) {
      return companyService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("deleteEmployeesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scopes deletion to the route company and clears admin auth metadata", async () => {
    const { deleteEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/delete-employees"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer: { email: "admin@example.com" },
            id: "emp_1",
            is_admin: true,
          },
          {
            customer: { email: "employee@example.com" },
            id: "emp_2",
            is_admin: false,
          },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: "authpi_1" }] })
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const container = makeContainer({ authService, companyService, graph })

    const result = await (deleteEmployeesStep as MockStep)(
      {
        company_id: "comp_1",
        id: ["emp_1", "emp_2"],
      },
      { container }
    )

    expect(graph).toHaveBeenNthCalledWith(
      1,
      {
        entity: "employee",
        fields: ["id", "is_admin", "customer.email"],
        filters: {
          company_id: "comp_1",
          id: ["emp_1", "emp_2"],
        },
      },
      { throwIfKeyNotFound: true }
    )
    expect(graph).toHaveBeenNthCalledWith(2, {
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: ["admin@example.com"],
        provider: "emailpass",
      },
    })
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
    expect(companyService.softDeleteEmployees).toHaveBeenCalledWith([
      "emp_1",
      "emp_2",
    ])
    expect(result.compensateInput).toEqual({
      employee_ids: ["emp_1", "emp_2"],
      provider_identity_ids: ["authpi_1"],
    })
  })

  it("restores deleted employees and admin metadata on compensation", async () => {
    const { deleteEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/delete-employees"
    )
    const graph = vi.fn()
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const container = makeContainer({ authService, companyService, graph })

    await (deleteEmployeesStep as MockStep).compensate(
      {
        employee_ids: ["emp_1"],
        provider_identity_ids: ["authpi_1"],
      },
      { container }
    )

    expect(companyService.restoreEmployees).toHaveBeenCalledWith(["emp_1"])
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: "company_admin",
        },
      },
    ])
  })

  it("throws when an employee is not found for the requested company", async () => {
    const { deleteEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/delete-employees"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const container = makeContainer({ authService, companyService, graph })

    await expect(
      (deleteEmployeesStep as MockStep)(
        {
          company_id: "comp_1",
          id: "emp_2",
        },
        { container }
      )
    ).rejects.toMatchObject({
      message:
        "One or more employees were not found for the requested company.",
      type: "not_found",
    })
    expect(companyService.softDeleteEmployees).not.toHaveBeenCalled()
    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
  })
})
