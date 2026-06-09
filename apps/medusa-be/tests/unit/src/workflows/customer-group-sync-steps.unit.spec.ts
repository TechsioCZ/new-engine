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
  dismiss: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

type CompanyService = {
  listCompanies: ReturnType<typeof vi.fn>
  restoreEmployees: ReturnType<typeof vi.fn>
  retrieveCompany: ReturnType<typeof vi.fn>
  softDeleteEmployees: ReturnType<typeof vi.fn>
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
  dismiss: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  ...overrides,
})

const makeCompanyService = (
  overrides: Partial<CompanyService> = {}
): CompanyService => ({
  listCompanies: vi.fn().mockResolvedValue([]),
  restoreEmployees: vi.fn(),
  retrieveCompany: vi
    .fn()
    .mockResolvedValue({ deleted_at: null, id: "comp_1" }),
  softDeleteEmployees: vi.fn(),
  ...overrides,
})

const makeContainer = ({
  companyService = makeCompanyService(),
  customerService = makeCustomerService(),
  linkService = makeLinkService(),
  graph,
}: {
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
    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { company_id: "comp_deleted" },
      customer: { customer_group_id: "cgrp_new" },
    })
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

  it("removes the company customer group link and employee group memberships before company deletion", async () => {
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

  it("cleans a stale employee customer link owned by a soft-deleted company", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const companyService = makeCompanyService()
    const linkService = makeLinkService({
      list: vi.fn().mockResolvedValue([
        {
          customer_id: "cus_1",
          employee_id: "emp_deleted",
        },
      ]),
    })
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          company: {
            deleted_at: new Date(),
            id: "comp_deleted",
            name: "Deleted Co",
          },
          id: "emp_deleted",
        },
      ],
    })
    const container = makeContainer({
      companyService,
      graph,
      linkService,
    })

    const result = await (
      prepareEmployeeCustomerLinkStep as MockStep<{
        company_id: string
        customer_id: string
      }>
    )({ company_id: "comp_1", customer_id: "cus_1" }, { container })

    expect(linkService.dismiss).toHaveBeenCalledWith({
      company: { employee_id: "emp_deleted" },
      customer: { customer_id: "cus_1" },
    })
    expect(companyService.softDeleteEmployees).toHaveBeenCalledWith([
      "emp_deleted",
    ])
    expect(result.compensateInput).toEqual({
      links: [{ customer_id: "cus_1", employee_id: "emp_deleted" }],
      soft_deleted_employee_ids: ["emp_deleted"],
    })
  })

  it("rejects an employee customer link owned by an active company", async () => {
    const { prepareEmployeeCustomerLinkStep } = await import(
      "../../../../../src/workflows/employee/steps/prepare-employee-customer-link"
    )
    const companyService = makeCompanyService()
    const linkService = makeLinkService({
      list: vi.fn().mockResolvedValue([
        {
          customer_id: "cus_1",
          employee_id: "emp_2",
        },
      ]),
    })
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          company: {
            deleted_at: null,
            id: "comp_2",
            name: "Active Co",
          },
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
    expect(companyService.softDeleteEmployees).not.toHaveBeenCalled()
  })
})
