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

type Graph = (input: unknown) => Promise<{ data: unknown[] }>
type ServiceMethod = (...input: unknown[]) => Promise<unknown>
type StepInvoke = (input: unknown, context: unknown) => Promise<unknown>
type StepCompensate = (input: unknown, context: unknown) => Promise<void>
type CreateStep = (
  name: string,
  invoke: StepInvoke,
  compensate: StepCompensate,
) => StepInvoke & { compensate: StepCompensate }

const COMPANY_MODULE = "company"

const stepResponse = function stepResponse(
  payload: unknown,
  compensateInput?: unknown,
) {
  return { compensateInput, payload }
}

const mocks = vi.hoisted(() => {
  class MockMedusaError extends Error {
    static readonly Types = {
      NOT_FOUND: "not_found",
    }

    type: string

    constructor(type: string, message: string) {
      super(message)
      this.name = "MockMedusaError"
      this.type = type
    }
  }

  return { MockMedusaError }
})

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      LINK: "link",
      QUERY: "query",
    },
    MedusaError: mocks.MockMedusaError,
    Modules: {
      AUTH: "auth",
      CUSTOMER: "customer",
    },
  }),
)

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    StepResponse: stepResponse,
    createStep: vi.fn<CreateStep>((_name, invoke, compensate) =>
      Object.assign(invoke, { compensate }),
    ),
  }),
)

vi.mock(import("../../../../../src/modules/company"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    COMPANY_MODULE: "company",
  }),
)

interface CompanyService {
  restoreEmployees: Mock<ServiceMethod>
  softDeleteEmployees: Mock<ServiceMethod>
}

interface CustomerService {
  addCustomerToGroup: Mock<ServiceMethod>
  removeCustomerFromGroup: Mock<ServiceMethod>
}

interface AuthService {
  updateProviderIdentities: Mock<ServiceMethod>
}

interface LinkService {
  delete: Mock<ServiceMethod>
  restore: Mock<ServiceMethod>
}

type MockContainer = ReturnType<typeof makeContainer>

interface MockStep {
  (
    input:
      | string
      | string[]
      | {
          company_id?: string
          id: string | string[]
        },
    context: { container: MockContainer },
  ): Promise<{
    compensateInput?: {
      employee_link_delete_input: {
        company: {
          employee_id: string[]
        }
      }
      employee_ids: string[]
      provider_identity_ids: string[]
      removed_customer_groups: {
        customer_group_id: string
        customer_id: string
      }[]
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
          removed_customer_groups: {
            customer_group_id: string
            customer_id: string
          }[]
        }
      | undefined,
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

const makeCompanyService = (
  overrides: Partial<CompanyService> = {},
): CompanyService => ({
  restoreEmployees: vi.fn<ServiceMethod>(),
  softDeleteEmployees: vi.fn<ServiceMethod>(),
  ...overrides,
})

const makeAuthService = (
  overrides: Partial<AuthService> = {},
): AuthService => ({
  updateProviderIdentities: vi.fn<ServiceMethod>(),
  ...overrides,
})

const makeCustomerService = (
  overrides: Partial<CustomerService> = {},
): CustomerService => ({
  addCustomerToGroup: vi.fn<ServiceMethod>(),
  removeCustomerFromGroup: vi.fn<ServiceMethod>(),
  ...overrides,
})

const makeLinkService = (
  overrides: Partial<LinkService> = {},
): LinkService => ({
  delete: vi.fn<ServiceMethod>(),
  restore: vi.fn<ServiceMethod>(),
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
  graph: Mock<Graph>
  linkService?: LinkService
}) => ({
  resolve: vi.fn<(key: string) => unknown>((key) => {
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
    const { deleteEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/delete-employees")
    const graph = vi
      .fn<Graph>()
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

    const result = await asMockStep(deleteEmployeesStep)(
      {
        company_id: "comp_1",
        id: ["emp_1", "emp_2"],
      },
      { container },
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
      { throwIfKeyNotFound: true },
    )
    expect(graph).toHaveBeenNthCalledWith(4, {
      entity: "provider_identity",
      fields: ["id"],
      filters: {
        entity_id: ["admin@example.com"],
        provider: "emailpass",
      },
    })
    expect({
      authCalls: authService.updateProviderIdentities.mock.calls,
      customerGroupCalls: customerService.removeCustomerFromGroup.mock.calls,
      employeeDeleteCalls: companyService.softDeleteEmployees.mock.calls,
      linkDeleteCalls: linkService.delete.mock.calls,
    }).toStrictEqual({
      authCalls: [
        [
          [
            {
              id: "authpi_1",
              user_metadata: { role: null },
            },
          ],
        ],
      ],
      customerGroupCalls: [
        [
          [
            {
              customer_group_id: "cgrp_1",
              customer_id: "cus_1",
            },
            {
              customer_group_id: "cgrp_1",
              customer_id: "cus_2",
            },
          ],
        ],
      ],
      employeeDeleteCalls: [[["emp_1", "emp_2"]]],
      linkDeleteCalls: [
        [
          {
            company: { employee_id: ["emp_1", "emp_2"] },
          },
        ],
      ],
    })
    expect(result.compensateInput).toStrictEqual({
      employee_ids: ["emp_1", "emp_2"],
      employee_link_delete_input: {
        company: {
          employee_id: ["emp_1", "emp_2"],
        },
      },
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
    const { deleteEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/delete-employees")
    const graph = vi
      .fn<Graph>()
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

    const result = await asMockStep(deleteEmployeesStep)(
      {
        company_id: "comp_1",
        id: "emp_1",
      },
      { container },
    )

    expect(authService.updateProviderIdentities).not.toHaveBeenCalled()
    expect(result.compensateInput?.provider_identity_ids).toStrictEqual([])
  })

  it("restores deleted employees and admin metadata on compensation", async () => {
    const { deleteEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/delete-employees")
    const graph = vi.fn<Graph>()
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

    await asMockStep(deleteEmployeesStep).compensate(
      {
        employee_ids: ["emp_1"],
        employee_link_delete_input: {
          company: {
            employee_id: ["emp_1"],
          },
        },
        provider_identity_ids: ["authpi_1"],
        removed_customer_groups: [
          {
            customer_group_id: "cgrp_1",
            customer_id: "cus_1",
          },
        ],
      },
      { container },
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
    const { deleteEmployeesStep } =
      await import("../../../../../src/workflows/employee/steps/delete-employees")
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
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
      asMockStep(deleteEmployeesStep)(
        {
          company_id: "comp_1",
          id: "emp_2",
        },
        { container },
      ),
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
