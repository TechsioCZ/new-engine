import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { COMPANY_MODULE } from "../../../../../src/modules/company"

const COMPANY_CUSTOMER_GROUP_ENTRY_POINT = "company_customer_group"

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

type CustomerService = {
  addCustomerToGroup: ReturnType<typeof vi.fn>
  removeCustomerFromGroup: ReturnType<typeof vi.fn>
  retrieveCustomerGroup: ReturnType<typeof vi.fn>
}

type LinkService = {
  create: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  dismiss: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
}

type CompanyService = {
  createEmployees: ReturnType<typeof vi.fn>
  deleteEmployees: ReturnType<typeof vi.fn>
  listCompanies: ReturnType<typeof vi.fn>
  retrieveCompany: ReturnType<typeof vi.fn>
  restoreEmployees: ReturnType<typeof vi.fn>
  softDeleteEmployees: ReturnType<typeof vi.fn>
  updateEmployees: ReturnType<typeof vi.fn>
}

type AuthService = {
  updateProviderIdentities: ReturnType<typeof vi.fn>
}

type MockContainer = ReturnType<typeof makeContainer>

type MockStep<TInput> = (
  input: TInput,
  context: { container: MockContainer }
) => Promise<{
  compensateInput?: unknown
  payload: unknown
}>

const makeCustomerService = (
  overrides: Partial<CustomerService> = {}
): CustomerService => ({
  addCustomerToGroup: vi.fn(),
  removeCustomerFromGroup: vi.fn(),
  retrieveCustomerGroup: vi.fn().mockResolvedValue({ id: "cgrp_1" }),
  ...overrides,
})

const makeLinkService = (
  overrides: Partial<LinkService> = {}
): LinkService => ({
  create: vi.fn(),
  delete: vi.fn(),
  dismiss: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  restore: vi.fn(),
  ...overrides,
})

const makeCompanyService = (
  overrides: Partial<CompanyService> = {}
): CompanyService => ({
  createEmployees: vi.fn(),
  deleteEmployees: vi.fn(),
  listCompanies: vi.fn().mockResolvedValue([]),
  retrieveCompany: vi
    .fn()
    .mockResolvedValue({ deleted_at: null, id: "comp_1" }),
  restoreEmployees: vi.fn(),
  softDeleteEmployees: vi.fn(),
  updateEmployees: vi.fn(),
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
  customerService = makeCustomerService(),
  linkService = makeLinkService(),
  graph,
}: {
  authService?: AuthService
  companyService?: CompanyService
  customerService?: CustomerService
  linkService?: LinkService
  graph: ReturnType<typeof vi.fn>
}) => ({
  resolve: vi.fn((key: string) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }

    if (key === Modules.CUSTOMER) {
      return customerService
    }

    if (key === Modules.AUTH) {
      return authService
    }

    if (key === ContainerRegistrationKeys.LINK) {
      return linkService
    }

    if (key === COMPANY_MODULE) {
      return companyService
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

describe("customer-group sync steps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adds a newly linked employee customer to the company's customer group by known customer id", async () => {
    const { addEmployeeToCustomerGroupStep } = await import(
      "../../../../../src/workflows/employee/steps/add-employee-to-customer-group"
    )
    const customerService = makeCustomerService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "emp_1", company: { id: "comp_1" } }],
      })
      .mockResolvedValueOnce({
        data: [{ id: "comp_1", customer_group: { id: "cgrp_1" } }],
      })
    const container = makeContainer({ customerService, graph })

    const result = await (
      addEmployeeToCustomerGroupStep as MockStep<{
        customer_id: string
        employee_id: string
      }>
    )({ customer_id: "cus_1", employee_id: "emp_1" }, { container })

    expect(customerService.addCustomerToGroup).toHaveBeenCalledWith({
      customer_group_id: "cgrp_1",
      customer_id: "cus_1",
    })
    expect(result.compensateInput).toEqual({
      customer_id: "cus_1",
      group_id: "cgrp_1",
    })
  })

  it("replaces an existing company customer group link before creating the new link", async () => {
    const { setCompanyCustomerGroupStep } = await import(
      "../../../../../src/workflows/company/steps/set-company-customer-group"
    )
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_group: { id: "cgrp_old" },
            employees: [
              { customer: { id: "cus_1" } },
              { customer: { id: "cus_2" } },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ data: [] })
    const container = makeContainer({ customerService, linkService, graph })

    const result = await (
      setCompanyCustomerGroupStep as MockStep<{
        company_id: string
        group_id: string
      }>
    )({ company_id: "comp_1", group_id: "cgrp_new" }, { container })

    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { company_id: "comp_1" },
      customer: { customer_group_id: "cgrp_old" },
    })
    expect(linkService.create).toHaveBeenCalledWith({
      company: { company_id: "comp_1" },
      customer: { customer_group_id: "cgrp_new" },
    })
    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      { customer_group_id: "cgrp_old", customer_id: "cus_1" },
      { customer_group_id: "cgrp_old", customer_id: "cus_2" },
    ])
    expect(customerService.addCustomerToGroup).toHaveBeenCalledWith([
      { customer_group_id: "cgrp_new", customer_id: "cus_1" },
      { customer_group_id: "cgrp_new", customer_id: "cus_2" },
    ])
    expect(result.compensateInput).toEqual({
      company_id: "comp_1",
      customer_ids: ["cus_1", "cus_2"],
      dismissed_deleted_owner_links: [],
      new_group_id: "cgrp_new",
      previous_group_id: "cgrp_old",
    })
  })

  it("dismisses a stale soft-deleted company owner before linking a customer group", async () => {
    const { setCompanyCustomerGroupStep } = await import(
      "../../../../../src/workflows/company/steps/set-company-customer-group"
    )
    const companyService = makeCompanyService({
      listCompanies: vi
        .fn()
        .mockResolvedValue([{ deleted_at: new Date(), id: "comp_deleted" }]),
    })
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_group: null,
            employees: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company_id: "comp_deleted",
            customer_group_id: "cgrp_new",
          },
        ],
      })
    const container = makeContainer({
      companyService,
      linkService,
      graph,
    })

    await (
      setCompanyCustomerGroupStep as MockStep<{
        company_id: string
        group_id: string
      }>
    )({ company_id: "comp_1", group_id: "cgrp_new" }, { container })

    expect(graph).toHaveBeenNthCalledWith(2, {
      entity: COMPANY_CUSTOMER_GROUP_ENTRY_POINT,
      fields: ["company_id", "customer_group_id"],
      filters: {
        customer_group_id: "cgrp_new",
      },
    })
    expect(linkService.dismiss).toHaveBeenCalledWith([
      {
        company: { company_id: "comp_deleted" },
        customer: { customer_group_id: "cgrp_new" },
      },
    ])
    expect(linkService.create).toHaveBeenCalledWith({
      company: { company_id: "comp_1" },
      customer: { customer_group_id: "cgrp_new" },
    })
  })

  it("rejects linking a customer group owned by another active company", async () => {
    const { setCompanyCustomerGroupStep } = await import(
      "../../../../../src/workflows/company/steps/set-company-customer-group"
    )
    const companyService = makeCompanyService({
      listCompanies: vi
        .fn()
        .mockResolvedValue([{ deleted_at: null, id: "comp_2", name: "ACME" }]),
    })
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_group: null,
            employees: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company_id: "comp_2",
            customer_group_id: "cgrp_new",
          },
        ],
      })
    const container = makeContainer({
      companyService,
      linkService,
      graph,
    })

    await expect(
      (
        setCompanyCustomerGroupStep as MockStep<{
          company_id: string
          group_id: string
        }>
      )({ company_id: "comp_1", group_id: "cgrp_new" }, { container })
    ).rejects.toThrow(MedusaError)

    expect(linkService.create).not.toHaveBeenCalled()
  })

  it("removes the company customer group link and employee group memberships when explicitly removed", async () => {
    const { removeCompanyCustomerGroupLinkStep } = await import(
      "../../../../../src/workflows/company/steps/remove-company-customer-group-link"
    )
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          customer_group: { id: "cgrp_1" },
          employees: [
            { customer: { id: "cus_1" } },
            { customer: { id: "cus_2" } },
          ],
        },
      ],
    })
    const container = makeContainer({ customerService, linkService, graph })

    const result = await (
      removeCompanyCustomerGroupLinkStep as MockStep<string>
    )("comp_1", { container })

    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      { customer_group_id: "cgrp_1", customer_id: "cus_1" },
      { customer_group_id: "cgrp_1", customer_id: "cus_2" },
    ])
    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { company_id: "comp_1" },
      customer: { customer_group_id: "cgrp_1" },
    })
    expect(result.compensateInput).toEqual({
      company_id: "comp_1",
      customer_ids: ["cus_1", "cus_2"],
      group_id: "cgrp_1",
      link_removed: true,
    })
  })

  it("preserves the company customer group link while removing memberships before company deletion", async () => {
    const { removeCompanyCustomerGroupLinkStep } = await import(
      "../../../../../src/workflows/company/steps/remove-company-customer-group-link"
    )
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          customer_group: { id: "cgrp_1" },
          employees: [
            { customer: { id: "cus_1" } },
            { customer: { id: "cus_2" } },
          ],
        },
      ],
    })
    const container = makeContainer({ customerService, linkService, graph })

    const result = await (
      removeCompanyCustomerGroupLinkStep as MockStep<{
        company_id: string
        preserve_link: boolean
      }>
    )({ company_id: "comp_1", preserve_link: true }, { container })

    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      { customer_group_id: "cgrp_1", customer_id: "cus_1" },
      { customer_group_id: "cgrp_1", customer_id: "cus_2" },
    ])
    expect(linkService.dismiss).not.toHaveBeenCalled()
    expect(result.compensateInput).toEqual({
      company_id: "comp_1",
      customer_ids: ["cus_1", "cus_2"],
      group_id: "cgrp_1",
      link_removed: false,
    })
  })

  it("does not remove a company customer group link when the expected group does not match", async () => {
    const { removeCompanyCustomerGroupLinkStep } = await import(
      "../../../../../src/workflows/company/steps/remove-company-customer-group-link"
    )
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          customer_group: { id: "cgrp_current" },
          employees: [{ customer: { id: "cus_1" } }],
        },
      ],
    })
    const container = makeContainer({ customerService, linkService, graph })

    await expect(
      (
        removeCompanyCustomerGroupLinkStep as MockStep<{
          company_id: string
          expected_group_id: string
        }>
      )(
        { company_id: "comp_1", expected_group_id: "cgrp_requested" },
        { container }
      )
    ).rejects.toThrow(MedusaError)

    expect(customerService.removeCustomerFromGroup).not.toHaveBeenCalled()
    expect(linkService.dismiss).not.toHaveBeenCalled()
  })

  it("rejects employee mutations for a soft-deleted company", async () => {
    const { validateCompanyActiveStep } = await import(
      "../../../../../src/workflows/company/steps/validate-company-active"
    )
    const companyService = makeCompanyService({
      retrieveCompany: vi.fn().mockResolvedValue({
        deleted_at: new Date(),
        id: "comp_deleted",
      }),
    })
    const graph = vi.fn()
    const container = makeContainer({ companyService, graph })

    await expect(
      (validateCompanyActiveStep as MockStep<string>)("comp_deleted", {
        container,
      })
    ).rejects.toThrow(MedusaError)
  })

  it("cleans stale employee state owned by a soft-deleted company", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              customer_group: { id: "cgrp_deleted" },
              deleted_at: new Date(),
              id: "comp_deleted",
              name: "Deleted Co",
            },
            customer: {
              email: "admin@example.com",
              id: "cus_1",
            },
            id: "emp_deleted",
            is_admin: true,
            spending_limit: 120,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              deleted_at: new Date(),
              id: "comp_deleted",
            },
            customer: { id: "cus_1" },
            deleted_at: null,
            id: "emp_deleted",
            is_admin: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ id: "authpi_1" }],
      })
    const container = makeContainer({
      authService,
      companyService,
      customerService,
      graph,
      linkService,
    })

    const result = await (
      prepareEmployeeCustomerLinkStep as MockStep<{
        company_id: string
        customer_id: string
      }>
    )({ company_id: "comp_1", customer_id: "cus_1" }, { container })

    expect(graph).toHaveBeenNthCalledWith(1, {
      entity: "employee_customer",
      fields: ["customer_id", "employee_id"],
      filters: {
        customer_id: "cus_1",
      },
    })
    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { employee_id: "emp_deleted" },
      customer: { customer_id: "cus_1" },
    })
    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      {
        customer_group_id: "cgrp_deleted",
        customer_id: "cus_1",
      },
    ])
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
    expect(companyService.softDeleteEmployees).toHaveBeenCalledWith([
      "emp_deleted",
    ])
    expect(result.compensateInput).toEqual({
      deleted_employees: [
        {
          company_id: "comp_deleted",
          customer_id: "cus_1",
          id: "emp_deleted",
          is_admin: true,
          spending_limit: 120,
        },
      ],
      links: [{ customer_id: "cus_1", employee_id: "emp_deleted" }],
      provider_identity_ids: ["authpi_1"],
      restored_customer_groups: [
        {
          customer_group_id: "cgrp_deleted",
          customer_id: "cus_1",
        },
      ],
    })
  })

  it("rejects an employee customer link owned by an active company", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const companyService = makeCompanyService()
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_2",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              deleted_at: null,
              id: "comp_2",
              name: "Active Co",
            },
            deleted_at: null,
            id: "emp_2",
          },
        ],
      })
    const container = makeContainer({
      companyService,
      graph,
      linkService,
    })

    await expect(
      (
        prepareEmployeeCustomerLinkStep as MockStep<{
          company_id: string
          customer_id: string
        }>
      )({ company_id: "comp_1", customer_id: "cus_1" }, { container })
    ).rejects.toThrow(MedusaError)

    expect(linkService.dismiss).not.toHaveBeenCalled()
    expect(companyService.deleteEmployees).not.toHaveBeenCalled()
  })

  it("cleans stale employee state when the employee is deleted but its company is active", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const authService = makeAuthService()
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              customer_group: { id: "cgrp_active" },
              deleted_at: null,
              id: "comp_active",
              name: "Active Co",
            },
            customer: {
              email: "admin@example.com",
              id: "cus_1",
            },
            deleted_at: new Date(),
            id: "emp_deleted",
            is_admin: true,
            spending_limit: 120,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              deleted_at: null,
              id: "comp_active",
            },
            customer: { id: "cus_1" },
            deleted_at: new Date(),
            id: "emp_deleted",
            is_admin: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ id: "authpi_1" }],
      })
    const container = makeContainer({
      authService,
      companyService,
      customerService,
      graph,
      linkService,
    })

    await (
      prepareEmployeeCustomerLinkStep as MockStep<{
        company_id: string
        customer_id: string
      }>
    )({ company_id: "comp_1", customer_id: "cus_1" }, { container })

    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { employee_id: "emp_deleted" },
      customer: { customer_id: "cus_1" },
    })
    expect(customerService.removeCustomerFromGroup).toHaveBeenCalledWith([
      {
        customer_group_id: "cgrp_active",
        customer_id: "cus_1",
      },
    ])
    expect(authService.updateProviderIdentities).toHaveBeenCalledWith([
      {
        id: "authpi_1",
        user_metadata: {
          role: null,
        },
      },
    ])
    expect(companyService.softDeleteEmployees).toHaveBeenCalledWith([
      "emp_deleted",
    ])
  })

  it("keeps a same-company soft-deleted employee available for restore", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const companyService = makeCompanyService()
    const customerService = makeCustomerService()
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: {
              customer_group: { id: "cgrp_active" },
              deleted_at: null,
              id: "comp_1",
              name: "Active Co",
            },
            customer: {
              email: "admin@example.com",
              id: "cus_1",
            },
            deleted_at: new Date(),
            id: "emp_deleted",
            is_admin: true,
            spending_limit: 120,
          },
        ],
      })
    const container = makeContainer({
      companyService,
      customerService,
      graph,
      linkService,
    })

    await (
      prepareEmployeeCustomerLinkStep as MockStep<{
        company_id: string
        customer_id: string
      }>
    )({ company_id: "comp_1", customer_id: "cus_1" }, { container })

    expect(linkService.dismiss).not.toHaveBeenCalled()
    expect(customerService.removeCustomerFromGroup).not.toHaveBeenCalled()
    expect(companyService.deleteEmployees).not.toHaveBeenCalled()
    expect(companyService.softDeleteEmployees).not.toHaveBeenCalled()
  })

  it("restores a same-company soft-deleted employee instead of creating a duplicate", async () => {
    const { createOrRestoreEmployeeStep } = await import(
      "../../../../../src/workflows/employee/steps/create-or-restore-employee"
    )
    const companyService = makeCompanyService({
      restoreEmployees: vi.fn(),
      updateEmployees: vi.fn().mockResolvedValue({ id: "emp_deleted" }),
    })
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            deleted_at: new Date(),
            employee_id: "emp_deleted",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { id: "comp_1" },
            deleted_at: new Date(),
            id: "emp_deleted",
            is_admin: true,
            spending_limit: 120,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ company: { id: "comp_1" }, id: "emp_deleted" }],
      })
    const container = makeContainer({
      companyService,
      graph,
      linkService,
    })

    const result = await (
      createOrRestoreEmployeeStep as MockStep<{
        company_id: string
        customer_id: string
        is_admin: boolean
        spending_limit: number
      }>
    )(
      {
        company_id: "comp_1",
        customer_id: "cus_1",
        is_admin: false,
        spending_limit: 50,
      },
      { container }
    )

    expect(companyService.restoreEmployees).toHaveBeenCalledWith([
      "emp_deleted",
    ])
    expect(linkService.restore).toHaveBeenCalledWith({
      company: {
        employee_id: ["emp_deleted"],
      },
    })
    expect(companyService.updateEmployees).toHaveBeenCalledWith({
      id: "emp_deleted",
      is_admin: false,
      spending_limit: 50,
    })
    expect(companyService.createEmployees).not.toHaveBeenCalled()
    expect(result.compensateInput).toEqual({
      action: "restored",
      employee_id: "emp_deleted",
      previous_is_admin: true,
      previous_spending_limit: 120,
      restored_link_input: {
        company: {
          employee_id: ["emp_deleted"],
        },
      },
    })
  })

  it("creates a new employee when only another company's soft-deleted employee exists", async () => {
    const { createOrRestoreEmployeeStep } = await import(
      "../../../../../src/workflows/employee/steps/create-or-restore-employee"
    )
    const companyService = makeCompanyService({
      createEmployees: vi.fn().mockResolvedValue({ id: "emp_new" }),
    })
    const linkService = makeLinkService()
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            customer_id: "cus_1",
            deleted_at: new Date(),
            employee_id: "emp_old",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            company: { id: "comp_old" },
            deleted_at: new Date(),
            id: "emp_old",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ company: { id: "comp_1" }, id: "emp_new" }],
      })
    const container = makeContainer({
      companyService,
      graph,
      linkService,
    })

    const result = await (
      createOrRestoreEmployeeStep as MockStep<{
        company_id: string
        customer_id: string
        is_admin: boolean
        spending_limit: number
      }>
    )(
      {
        company_id: "comp_1",
        customer_id: "cus_1",
        is_admin: false,
        spending_limit: 50,
      },
      { container }
    )

    expect(companyService.restoreEmployees).not.toHaveBeenCalled()
    expect(companyService.createEmployees).toHaveBeenCalledWith({
      company_id: "comp_1",
      customer_id: "cus_1",
      is_admin: false,
      spending_limit: 50,
    })
    expect(linkService.create).toHaveBeenCalledWith({
      company: { employee_id: "emp_new" },
      customer: { customer_id: "cus_1" },
    })
    expect(result.compensateInput).toEqual({
      action: "created",
      customer_id: "cus_1",
      employee_id: "emp_new",
    })
  })
})
