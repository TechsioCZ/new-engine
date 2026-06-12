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
    LINK: "link",
    QUERY: "query",
  },
  MedusaError: mocks.MockMedusaError,
  Modules: {
    AUTH: "auth",
    CUSTOMER: "customer",
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

type CustomerService = {
  addCustomerToGroup: ReturnType<typeof vi.fn>
  removeCustomerFromGroup: ReturnType<typeof vi.fn>
}

type AuthService = {
  updateProviderIdentities: ReturnType<typeof vi.fn>
}

type LinkService = {
  delete: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
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
      employee_link_delete_input: {
        company: {
          employee_id: string[]
        }
      }
      employee_ids: string[]
      provider_identity_ids: string[]
      removed_customer_groups: Array<{
        customer_group_id: string
        customer_id: string
      }>
    }
    payload: unknown
  }>
  compensate: (
    input:
      | {
          employee_link_delete_input: {
            company: {
              employee_id: string[]
            }
          }
          employee_ids: string[]
          provider_identity_ids: string[]
          removed_customer_groups: Array<{
            customer_group_id: string
            customer_id: string
          }>
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

const makeCustomerService = (
  overrides: Partial<CustomerService> = {}
): CustomerService => ({
  addCustomerToGroup: vi.fn(),
  removeCustomerFromGroup: vi.fn(),
  ...overrides,
})

const makeLinkService = (
  overrides: Partial<LinkService> = {}
): LinkService => ({
  delete: vi.fn(),
  restore: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  authService = makeAuthService(),
  companyService = makeCompanyService(),
  customerService = makeCustomerService(),
  graph,
  linkService = makeLinkService(),
}: {
  authService?: AuthService
  companyService?: CompanyService
  customerService?: CustomerService
  graph: ReturnType<typeof vi.fn>
  linkService?: LinkService
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === "query") {
      return { graph }
    }

    if (key === "link") {
      return linkService
    }

    if (key === "auth") {
      return authService
    }

    if (key === "customer") {
      return customerService
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
            company: { customer_group: { id: "cgrp_1" } },
            customer: { email: "admin@example.com", id: "cus_1" },
            id: "emp_1",
            is_admin: true,
          },
          {
            company: { customer_group: { id: "cgrp_1" } },
            customer: { email: "employee@example.com", id: "cus_2" },
            id: "emp_2",
            is_admin: false,
          },
        ],
      })
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
            is_admin: true,
          },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: "authpi_1" }] })
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const container = makeContainer({
      authService,
      companyService,
      customerService,
      graph,
      linkService,
    })

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
        fields: [
          "id",
          "is_admin",
          "company.customer_group.id",
          "customer.email",
          "customer.id",
        ],
        filters: {
          company_id: "comp_1",
          id: ["emp_1", "emp_2"],
        },
      },
      { throwIfKeyNotFound: true }
    )
    expect(graph).toHaveBeenNthCalledWith(4, {
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
    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      {
        customer_group_id: "cgrp_1",
        customer_id: "cus_1",
      },
      {
        customer_group_id: "cgrp_1",
        customer_id: "cus_2",
      },
    ])
    expect(linkService.delete).toHaveBeenCalledWith({
      company: {
        employee_id: ["emp_1", "emp_2"],
      },
    })
    expect(companyService.softDeleteEmployees).toHaveBeenCalledWith([
      "emp_1",
      "emp_2",
    ])
    expect(result.compensateInput).toEqual({
      employee_link_delete_input: {
        company: {
          employee_id: ["emp_1", "emp_2"],
        },
      },
      employee_ids: ["emp_1", "emp_2"],
      provider_identity_ids: ["authpi_1"],
      removed_customer_groups: [
        {
          customer_group_id: "cgrp_1",
          customer_id: "cus_1",
        },
        {
          customer_group_id: "cgrp_1",
          customer_id: "cus_2",
        },
      ],
    })
  })

  it("keeps admin auth metadata when another active admin employee remains", async () => {
    const { deleteEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/delete-employees"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            company: { customer_group: { id: "cgrp_1" } },
            customer: { email: "admin@example.com", id: "cus_1" },
            id: "emp_1",
            is_admin: true,
          },
        ],
      })
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
            is_admin: true,
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
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const container = makeContainer({
      authService,
      companyService,
      customerService,
      graph,
      linkService,
    })

    const result = await (deleteEmployeesStep as MockStep)(
      {
        company_id: "comp_1",
        id: "emp_1",
      },
      { container }
    )

    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput?.provider_identity_ids).toEqual([])
  })

  it("restores deleted employees and admin metadata on compensation", async () => {
    const { deleteEmployeesStep } = await import(
      "../../../../../src/workflows/employee/steps/delete-employees"
    )
    const graph = vi.fn()
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const container = makeContainer({
      authService,
      companyService,
      customerService,
      graph,
      linkService,
    })

    await (deleteEmployeesStep as MockStep).compensate(
      {
        employee_link_delete_input: {
          company: {
            employee_id: ["emp_1"],
          },
        },
        employee_ids: ["emp_1"],
        provider_identity_ids: ["authpi_1"],
        removed_customer_groups: [
          {
            customer_group_id: "cgrp_1",
            customer_id: "cus_1",
          },
        ],
      },
      { container }
    )

    expect(companyService.restoreEmployees).toHaveBeenCalledWith(["emp_1"])
    expect(linkService.restore).toHaveBeenCalledWith({
      company: {
        employee_id: ["emp_1"],
      },
    })
    expect(customerService.addCustomerToGroup).toHaveBeenCalledWith([
      {
        customer_group_id: "cgrp_1",
        customer_id: "cus_1",
      },
    ])
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
    const linkService = makeLinkService()
    const container = makeContainer({
      authService,
      companyService,
      graph,
      linkService,
    })

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
    expect(linkService.delete).not.toHaveBeenCalled()
    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
  })
})
