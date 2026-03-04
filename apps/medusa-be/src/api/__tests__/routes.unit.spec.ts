import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

const mockUpdateApprovalsRun = jest.fn()
const mockCreateApprovalsRun = jest.fn()
const mockUpdateApprovalSettingsRun = jest.fn()

const mockCreateCompaniesRun = jest.fn()
const mockUpdateCompaniesRun = jest.fn()
const mockDeleteCompaniesRun = jest.fn()
const mockAddCompanyToCustomerGroupRun = jest.fn()
const mockRemoveCompanyFromCustomerGroupRun = jest.fn()

const mockCreateEmployeesRun = jest.fn()
const mockUpdateEmployeesRun = jest.fn()
const mockDeleteEmployeesRun = jest.fn()

const mockCustomerAcceptQuoteRun = jest.fn()
const mockCustomerRejectQuoteRun = jest.fn()
const mockMerchantSendQuoteRun = jest.fn()
const mockMerchantRejectQuoteRun = jest.fn()
const mockCreateQuoteMessageRun = jest.fn()
const mockCreateRequestForQuoteRun = jest.fn()

const mockCompanyCheckAddressCountRun = jest.fn()
const mockAddToCartRun = jest.fn()

const mockHandleCompanyCheckCzInfoGet = jest.fn()
const mockHandleCompanyCheckViesGet = jest.fn()

jest.mock("../../workflows/approval/workflows", () => ({
  updateApprovalsWorkflow: {
    run: (...args: unknown[]) => mockUpdateApprovalsRun(...args),
  },
  createApprovalsWorkflow: {
    run: (...args: unknown[]) => mockCreateApprovalsRun(...args),
  },
  updateApprovalSettingsWorkflow: {
    run: (...args: unknown[]) => mockUpdateApprovalSettingsRun(...args),
  },
}))

jest.mock("../../workflows/approval/workflows/update-approval-settings", () => ({
  updateApprovalSettingsWorkflow: {
    run: (...args: unknown[]) => mockUpdateApprovalSettingsRun(...args),
  },
}))

jest.mock("../../workflows/company/workflows", () => ({
  updateCompaniesWorkflow: {
    run: (...args: unknown[]) => mockUpdateCompaniesRun(...args),
  },
  deleteCompaniesWorkflow: {
    run: (...args: unknown[]) => mockDeleteCompaniesRun(...args),
  },
  addCompanyToCustomerGroupWorkflow: {
    run: (...args: unknown[]) => mockAddCompanyToCustomerGroupRun(...args),
  },
}))

jest.mock("../../workflows/company/workflows/create-companies", () => ({
  createCompaniesWorkflow: {
    run: (...args: unknown[]) => mockCreateCompaniesRun(...args),
  },
}))

jest.mock(
  "../../workflows/company/workflows/remove-company-from-customer-group",
  () => ({
    removeCompanyFromCustomerGroupWorkflow: {
      run: (...args: unknown[]) => mockRemoveCompanyFromCustomerGroupRun(...args),
    },
  })
)

jest.mock("../../workflows/employee/workflows", () => ({
  createEmployeesWorkflow: {
    run: (...args: unknown[]) => mockCreateEmployeesRun(...args),
  },
  updateEmployeesWorkflow: {
    run: (...args: unknown[]) => mockUpdateEmployeesRun(...args),
  },
  deleteEmployeesWorkflow: {
    run: (...args: unknown[]) => mockDeleteEmployeesRun(...args),
  },
}))

jest.mock("../../workflows/quote/workflows", () => ({
  customerAcceptQuoteWorkflow: () => ({
    run: (...args: unknown[]) => mockCustomerAcceptQuoteRun(...args),
  }),
  customerRejectQuoteWorkflow: () => ({
    run: (...args: unknown[]) => mockCustomerRejectQuoteRun(...args),
  }),
  merchantSendQuoteWorkflow: () => ({
    run: (...args: unknown[]) => mockMerchantSendQuoteRun(...args),
  }),
  merchantRejectQuoteWorkflow: () => ({
    run: (...args: unknown[]) => mockMerchantRejectQuoteRun(...args),
  }),
  createQuoteMessageWorkflow: () => ({
    run: (...args: unknown[]) => mockCreateQuoteMessageRun(...args),
  }),
}))

jest.mock("../../workflows/quote/workflows/create-request-for-quote", () => ({
  createRequestForQuoteWorkflow: () => ({
    run: (...args: unknown[]) => mockCreateRequestForQuoteRun(...args),
  }),
}))

jest.mock("../../workflows/company-check/workflows/address-count", () => ({
  companyCheckCzAddressCountWorkflow: () => ({
    run: (...args: unknown[]) => mockCompanyCheckAddressCountRun(...args),
  }),
}))

jest.mock("@medusajs/medusa/core-flows", () => ({
  addToCartWorkflow: () => ({
    run: (...args: unknown[]) => mockAddToCartRun(...args),
  }),
}))

jest.mock("@medusajs/utils", () => {
  const { createRequire } = require("module")
  const frameworkUtilsPath = require.resolve("@medusajs/framework/utils")
  const frameworkRequire = createRequire(frameworkUtilsPath)
  const resolvedMedusaUtilsPath = frameworkRequire.resolve("@medusajs/utils")
  return jest.requireActual(resolvedMedusaUtilsPath)
}, { virtual: true })

jest.mock("../companies/check/cz/info/get-handler", () => ({
  handleCompanyCheckCzInfoGet: (...args: unknown[]) =>
    mockHandleCompanyCheckCzInfoGet(...args),
}))

jest.mock("../companies/check/vies/get-handler", () => ({
  handleCompanyCheckViesGet: (...args: unknown[]) =>
    mockHandleCompanyCheckViesGet(...args),
}))

import * as adminApprovalsRoute from "../admin/approvals/route"
import * as adminApprovalsByIdRoute from "../admin/approvals/[id]/route"
import * as adminCompaniesRoute from "../admin/companies/route"
import * as adminCompanyByIdRoute from "../admin/companies/[id]/route"
import * as adminCompanyEmployeesRoute from "../admin/companies/[id]/employees/route"
import * as adminCompanyEmployeeByIdRoute from "../admin/companies/[id]/employees/[employeeId]/route"
import * as adminCompanyApprovalSettingsRoute from "../admin/companies/[id]/approval-settings/route"
import * as adminCompanyCustomerGroupRoute from "../admin/companies/[id]/customer-group/route"
import * as adminCompanyCustomerGroupByIdRoute from "../admin/companies/[id]/customer-group/[customerGroupId]/route"
import * as adminQuotesRoute from "../admin/quotes/route"
import * as adminQuoteByIdRoute from "../admin/quotes/[id]/route"
import * as adminQuoteSendRoute from "../admin/quotes/[id]/send/route"
import * as adminQuoteRejectRoute from "../admin/quotes/[id]/reject/route"
import * as adminQuoteMessagesRoute from "../admin/quotes/[id]/messages/route"
import * as adminCompanyCheckCzInfoRoute from "../admin/companies/check/cz/info/route"
import * as adminCompanyCheckViesRoute from "../admin/companies/check/vies/route"
import * as adminCompanyCheckAddressCountRoute from "../admin/companies/check/cz/address-count/route"

import * as storeApprovalsRoute from "../store/approvals/route"
import * as storeApprovalByIdRoute from "../store/approvals/[id]/route"
import * as storeCartApprovalsRoute from "../store/carts/[id]/approvals/route"
import * as storeCartBulkItemsRoute from "../store/carts/[id]/line-items/bulk/route"
import * as storeCompaniesRoute from "../store/companies/route"
import * as storeCompanyByIdRoute from "../store/companies/[id]/route"
import * as storeCompanyEmployeesRoute from "../store/companies/[id]/employees/route"
import * as storeCompanyEmployeeByIdRoute from "../store/companies/[id]/employees/[employeeId]/route"
import * as storeCompanyApprovalSettingsRoute from "../store/companies/[id]/approval-settings/route"
import * as storeQuotesRoute from "../store/quotes/route"
import * as storeQuoteByIdRoute from "../store/quotes/[id]/route"
import * as storeQuoteAcceptRoute from "../store/quotes/[id]/accept/route"
import * as storeQuoteRejectRoute from "../store/quotes/[id]/reject/route"
import * as storeQuoteMessagesRoute from "../store/quotes/[id]/messages/route"
import * as storeQuotePreviewRoute from "../store/quotes/[id]/preview/route"

type ReqResBundle = {
  req: any
  res: MedusaResponse
  graphMock: jest.Mock
  orderService: { previewOrderChange: jest.Mock }
}

const makeReqRes = (overrides: Record<string, unknown> = {}): ReqResBundle => {
  const graphMock = jest.fn()
  const orderService = {
    previewOrderChange: jest.fn().mockResolvedValue({ id: "preview_1" }),
  }

  const req = {
    params: {},
    body: {},
    validatedBody: {},
    validatedQuery: {},
    filterableFields: {},
    queryConfig: {
      fields: ["id"],
      pagination: { skip: 0, take: 20 },
    },
    remoteQueryConfig: {
      fields: ["id"],
      pagination: { skip: 0, take: 20 },
    },
    auth_context: {
      actor_id: "actor_1",
      auth_identity_id: "auth_1",
      app_metadata: {
        customer_id: "customer_1",
        user_id: "user_1",
      },
    },
    scope: {
      resolve: (key: unknown) => {
        if (key === Modules.ORDER) {
          return orderService
        }
        if (String(key).toLowerCase().includes("logger")) {
          return {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          }
        }
        if (String(key).toLowerCase().includes("query")) {
          return {
            graph: graphMock,
          }
        }

        throw new Error(`Unexpected container key: ${String(key)}`)
      },
    },
    ...overrides,
  } satisfies Partial<MedusaRequest>

  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as MedusaResponse

  return { req, res, graphMock, orderService }
}

describe("api route handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUpdateApprovalsRun.mockResolvedValue({ result: { id: "appr_1" }, errors: [] })
    mockCreateApprovalsRun.mockResolvedValue({ result: [{ id: "appr_1" }], errors: [] })
    mockUpdateApprovalSettingsRun.mockResolvedValue({
      result: { id: "aset_1" },
      errors: [],
    })

    mockCreateCompaniesRun.mockResolvedValue({ result: [{ id: "comp_1" }] })
    mockUpdateCompaniesRun.mockResolvedValue({ result: { id: "comp_1" } })
    mockDeleteCompaniesRun.mockResolvedValue({ result: { id: "comp_1" } })
    mockAddCompanyToCustomerGroupRun.mockResolvedValue({})
    mockRemoveCompanyFromCustomerGroupRun.mockResolvedValue({})

    mockCreateEmployeesRun.mockResolvedValue({ result: { id: "empl_1" } })
    mockUpdateEmployeesRun.mockResolvedValue({})
    mockDeleteEmployeesRun.mockResolvedValue({})

    mockCustomerAcceptQuoteRun.mockResolvedValue({})
    mockCustomerRejectQuoteRun.mockResolvedValue({})
    mockMerchantSendQuoteRun.mockResolvedValue({})
    mockMerchantRejectQuoteRun.mockResolvedValue({})
    mockCreateQuoteMessageRun.mockResolvedValue({})
    mockCreateRequestForQuoteRun.mockResolvedValue({
      result: {
        quote: { id: "quote_1" },
      },
    })

    mockCompanyCheckAddressCountRun.mockResolvedValue({ result: { count: 2 } })
    mockAddToCartRun.mockResolvedValue({})
  })

  it("covers admin company-check route wrappers", async () => {
    const { req, res } = makeReqRes()

    await adminCompanyCheckCzInfoRoute.GET(req, res)
    await adminCompanyCheckViesRoute.GET(req, res)

    expect(mockHandleCompanyCheckCzInfoGet).toHaveBeenCalledTimes(1)
    expect(mockHandleCompanyCheckViesGet).toHaveBeenCalledTimes(1)
  })

  it("handles admin approvals list and update routes", async () => {
    const list = makeReqRes()
    list.req.validatedQuery = { status: "pending" }
    list.graphMock.mockResolvedValue({
      data: [{ cart: { id: "cart_1" } }, { cart: null }],
      metadata: { count: 1 },
    })
    await adminApprovalsRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      carts_with_approvals: [{ id: "cart_1" }],
      count: 1,
    })

    const listWithoutStatus = makeReqRes({
      validatedQuery: {},
      queryConfig: { fields: ["id"] },
    })
    listWithoutStatus.graphMock.mockResolvedValue({
      data: [{ cart: { id: "cart_2" } }],
      metadata: { count: 1 },
    })
    await adminApprovalsRoute.GET(listWithoutStatus.req, listWithoutStatus.res)
    expect(listWithoutStatus.res.json).toHaveBeenCalledWith({
      carts_with_approvals: [{ id: "cart_2" }],
      count: 1,
    })

    const listWithUndefinedQuery = makeReqRes({
      validatedQuery: undefined,
      queryConfig: { fields: ["id"] },
    })
    listWithUndefinedQuery.graphMock.mockResolvedValue({
      data: [{ cart: { id: "cart_3" } }],
      metadata: { count: 1 },
    })
    await adminApprovalsRoute.GET(
      listWithUndefinedQuery.req,
      listWithUndefinedQuery.res
    )
    expect(listWithUndefinedQuery.res.json).toHaveBeenCalledWith({
      carts_with_approvals: [{ id: "cart_3" }],
      count: 1,
    })

    const update = makeReqRes({ params: { id: "appr_1" }, validatedBody: { status: "approved" } })
    await adminApprovalsByIdRoute.POST(update.req, update.res)
    expect(mockUpdateApprovalsRun).toHaveBeenCalled()
    expect(update.res.json).toHaveBeenCalledWith({ approval: { id: "appr_1" } })

    mockUpdateApprovalsRun.mockResolvedValueOnce({
      result: null,
      errors: [{ error: { message: "invalid approval transition" } }],
    })
    const failedUpdate = makeReqRes({
      params: { id: "appr_2" },
      validatedBody: { status: "rejected" },
    })
    await adminApprovalsByIdRoute.POST(failedUpdate.req, failedUpdate.res)
    expect(failedUpdate.res.status).toHaveBeenCalledWith(400)
  })

  it("handles admin companies list/create and company detail update/delete", async () => {
    const list = makeReqRes()
    list.graphMock.mockResolvedValue({
      data: [{ id: "comp_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await adminCompaniesRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      companies: [{ id: "comp_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const create = makeReqRes({
      validatedBody: { name: "ACME" },
      queryConfig: { fields: ["id"] },
    })
    create.graphMock.mockResolvedValueOnce({
      data: [{ id: "comp_1" }],
    })
    await adminCompaniesRoute.POST(create.req, create.res)
    expect(mockCreateCompaniesRun).toHaveBeenCalled()
    expect(create.res.json).toHaveBeenCalledWith({ companies: [{ id: "comp_1" }] })

    const createMany = makeReqRes({
      validatedBody: [{ name: "ACME 1" }, { name: "ACME 2" }],
      queryConfig: { fields: ["id"] },
    })
    createMany.graphMock.mockResolvedValueOnce({
      data: [{ id: "comp_1" }, { id: "comp_2" }],
    })
    await adminCompaniesRoute.POST(createMany.req, createMany.res)
    expect(mockCreateCompaniesRun).toHaveBeenCalled()
    expect(createMany.res.json).toHaveBeenCalledWith({
      companies: [{ id: "comp_1" }, { id: "comp_2" }],
    })

    const detail = makeReqRes({ params: { id: "comp_1" } })
    detail.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1" }] })
    await adminCompanyByIdRoute.GET(detail.req, detail.res)
    expect(detail.res.json).toHaveBeenCalledWith({ company: { id: "comp_1" } })

    const update = makeReqRes({
      params: { id: "comp_1" },
      body: { name: "ACME Updated" },
      queryConfig: { fields: ["id"] },
    })
    update.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1", name: "ACME Updated" }] })
    await adminCompanyByIdRoute.POST(update.req, update.res)
    expect(mockUpdateCompaniesRun).toHaveBeenCalled()
    expect(update.res.json).toHaveBeenCalledWith({
      company: { id: "comp_1", name: "ACME Updated" },
    })

    const remove = makeReqRes({ params: { id: "comp_1" } })
    await adminCompanyByIdRoute.DELETE(remove.req, remove.res)
    expect(mockDeleteCompaniesRun).toHaveBeenCalled()
    expect(remove.res.status).toHaveBeenCalledWith(200)
  })

  it("handles admin company employee routes", async () => {
    const list = makeReqRes({ params: { id: "comp_1" } })
    list.graphMock.mockResolvedValueOnce({
      data: [{ employees: [{ id: "empl_1" }] }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await adminCompanyEmployeesRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      employees: [{ id: "empl_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const create = makeReqRes({
      params: { id: "comp_1" },
      validatedBody: { customer_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    create.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await adminCompanyEmployeesRoute.POST(create.req, create.res)
    expect(mockCreateEmployeesRun).toHaveBeenCalled()
    expect(create.res.json).toHaveBeenCalledWith({ employee: { id: "empl_1" } })

    const getById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
      queryConfig: { fields: ["id"] },
    })
    getById.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await adminCompanyEmployeeByIdRoute.GET(getById.req, getById.res)
    expect(getById.res.json).toHaveBeenCalledWith({ employee: { id: "empl_1" } })

    const updateById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
      body: { spending_limit: 500, is_admin: true },
      queryConfig: { fields: ["id"] },
    })
    updateById.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await adminCompanyEmployeeByIdRoute.POST(updateById.req, updateById.res)
    expect(mockUpdateEmployeesRun).toHaveBeenCalled()

    const deleteById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
    })
    await adminCompanyEmployeeByIdRoute.DELETE(deleteById.req, deleteById.res)
    expect(mockDeleteEmployeesRun).toHaveBeenCalled()
    expect(deleteById.res.status).toHaveBeenCalledWith(200)
  })

  it("handles admin approval-settings and customer-group routes", async () => {
    const listSettings = makeReqRes({
      filterableFields: { company_id: "comp_1" },
      remoteQueryConfig: { pagination: { skip: 0, take: 20 } },
    })
    listSettings.graphMock.mockResolvedValueOnce({
      data: [{ id: "aset_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await adminCompanyApprovalSettingsRoute.GET(listSettings.req, listSettings.res)
    expect(listSettings.res.json).toHaveBeenCalledWith({
      approvalSettings: [{ id: "aset_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const updateSettings = makeReqRes({
      validatedBody: { id: "aset_1", requires_admin_approval: true },
    })
    updateSettings.graphMock.mockResolvedValueOnce({ data: [{ id: "aset_1" }] })
    await adminCompanyApprovalSettingsRoute.POST(updateSettings.req, updateSettings.res)
    expect(mockUpdateApprovalSettingsRun).toHaveBeenCalled()
    expect(updateSettings.res.json).toHaveBeenCalledWith({
      approvalSettings: [{ id: "aset_1" }],
    })

    const addGroup = makeReqRes({
      params: { id: "comp_1" },
      body: { group_id: "cg_1" },
      remoteQueryConfig: { fields: ["id"] },
    })
    addGroup.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1" }] })
    await adminCompanyCustomerGroupRoute.POST(addGroup.req, addGroup.res)
    expect(mockAddCompanyToCustomerGroupRun).toHaveBeenCalled()

    const removeGroup = makeReqRes({
      params: { id: "comp_1", customerGroupId: "cg_1" },
    })
    await adminCompanyCustomerGroupByIdRoute.DELETE(removeGroup.req, removeGroup.res)
    expect(mockRemoveCompanyFromCustomerGroupRun).toHaveBeenCalled()
    expect(removeGroup.res.status).toHaveBeenCalledWith(200)
  })

  it("handles admin quote routes", async () => {
    const list = makeReqRes({ remoteQueryConfig: { fields: ["id"], pagination: { skip: 0, take: 20 } } })
    list.graphMock.mockResolvedValueOnce({
      data: [{ id: "quote_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await adminQuotesRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      quotes: [{ id: "quote_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const detail = makeReqRes({ params: { id: "quote_1" }, queryConfig: { fields: ["id"] } })
    detail.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await adminQuoteByIdRoute.GET(detail.req, detail.res)
    expect(detail.res.json).toHaveBeenCalledWith({ quote: { id: "quote_1" } })

    const send = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { expires_at: "2026-02-24" },
      queryConfig: { fields: ["id"] },
    })
    send.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await adminQuoteSendRoute.POST(send.req, send.res)
    expect(mockMerchantSendQuoteRun).toHaveBeenCalled()

    const reject = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { message: "No longer available" },
      queryConfig: { fields: ["id"] },
    })
    reject.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await adminQuoteRejectRoute.POST(reject.req, reject.res)
    expect(mockMerchantRejectQuoteRun).toHaveBeenCalled()

    const message = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { text: "Hello" },
      queryConfig: { fields: ["id"] },
      auth_context: { actor_id: "admin_1" },
    })
    message.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await adminQuoteMessagesRoute.POST(message.req, message.res)
    expect(mockCreateQuoteMessageRun).toHaveBeenCalled()
  })

  it("handles admin company-check address-count route success and failure", async () => {
    const success = makeReqRes({ validatedQuery: { street: "Main 1", city: "Prague" } })
    await adminCompanyCheckAddressCountRoute.GET(success.req, success.res)
    expect(success.res.json).toHaveBeenCalledWith({ count: 2 })

    mockCompanyCheckAddressCountRun.mockRejectedValueOnce(new Error("upstream failed"))
    const fail = makeReqRes({ validatedQuery: { street: "Main 1", city: "Prague" } })
    await adminCompanyCheckAddressCountRoute.GET(fail.req, fail.res)
    expect(fail.res.status).toHaveBeenCalledWith(502)
  })

  it("handles store approvals list route branches", async () => {
    const noCompany = makeReqRes({
      auth_context: { app_metadata: { customer_id: "customer_1" } },
    })
    noCompany.graphMock.mockResolvedValueOnce({ data: [{}] })
    await storeApprovalsRoute.GET(noCompany.req, noCompany.res)
    expect(noCompany.res.json).toHaveBeenCalledWith({ approvals: [], count: 0 })

    const noCarts = makeReqRes({
      auth_context: { app_metadata: { customer_id: "customer_1" } },
      validatedQuery: {},
      queryConfig: { fields: ["id"] },
    })
    noCarts.graphMock
      .mockResolvedValueOnce({ data: [{ employee: { company: { id: "comp_1" } } }] })
      .mockResolvedValueOnce({ data: [{ carts: null }] })
    await storeApprovalsRoute.GET(noCarts.req, noCarts.res)
    expect(noCarts.res.json).toHaveBeenCalledWith({ carts_with_approvals: [], count: 0 })

    const full = makeReqRes({
      auth_context: { app_metadata: { customer_id: "customer_1" } },
      validatedQuery: { status: "pending" },
      queryConfig: { fields: ["id"] },
    })
    full.graphMock
      .mockResolvedValueOnce({
        data: [{ employee: { company: { id: "comp_1" } } }],
      })
      .mockResolvedValueOnce({
        data: [{ carts: [{ id: "cart_1" }, { id: "cart_2" }] }],
      })
      .mockResolvedValueOnce({
        data: [
          { cart: { approvals: [{ id: "appr_1" }] } },
          { cart: { approvals: [{ id: "appr_2" }] } },
        ],
        metadata: { count: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ id: "appr_1", cart_id: "cart_1" }],
      })
    await storeApprovalsRoute.GET(full.req, full.res)
    expect(full.res.json).toHaveBeenCalledWith({
      carts_with_approvals: [{ id: "cart_1", approvals: [{ id: "appr_1", cart_id: "cart_1" }] }],
      count: 2,
    })
  })

  it("handles store approval update and cart approval creation (success and error paths)", async () => {
    const updateOk = makeReqRes({
      params: { id: "appr_1" },
      validatedBody: { status: "approved" },
      auth_context: { app_metadata: { customer_id: "customer_1" } },
    })
    await storeApprovalByIdRoute.POST(updateOk.req, updateOk.res)
    expect(updateOk.res.json).toHaveBeenCalledWith({ approval: { id: "appr_1" } })

    mockUpdateApprovalsRun.mockResolvedValueOnce({
      result: null,
      errors: [{ error: { message: "invalid state" } }],
    })
    const updateFail = makeReqRes({
      params: { id: "appr_1" },
      validatedBody: { status: "approved" },
      auth_context: { app_metadata: { customer_id: "customer_1" } },
    })
    await storeApprovalByIdRoute.POST(updateFail.req, updateFail.res)
    expect(updateFail.res.status).toHaveBeenCalledWith(400)

    const createOk = makeReqRes({
      params: { id: "cart_1" },
      auth_context: { app_metadata: { customer_id: "customer_1" } },
    })
    await storeCartApprovalsRoute.POST(createOk.req, createOk.res)
    expect(createOk.res.json).toHaveBeenCalledWith({ approvals: [{ id: "appr_1" }] })

    mockCreateApprovalsRun.mockResolvedValueOnce({
      result: [],
      errors: [{ error: { message: "cannot create approvals" } }],
    })
    const createFail = makeReqRes({
      params: { id: "cart_1" },
      auth_context: { app_metadata: { customer_id: "customer_1" } },
    })
    await storeCartApprovalsRoute.POST(createFail.req, createFail.res)
    expect(createFail.res.status).toHaveBeenCalledWith(400)
  })

  it("handles store cart bulk line-items route", async () => {
    const ctx = makeReqRes({
      params: { id: "cart_1" },
      validatedBody: { line_items: [{ variant_id: "var_1", quantity: 1 }] },
      queryConfig: { fields: ["id"] },
    })
    ctx.graphMock
      .mockResolvedValueOnce({ data: [{ id: "cart_1" }] })
      .mockResolvedValueOnce({ data: [{ id: "cart_1", items: [] }] })

    await storeCartBulkItemsRoute.POST(ctx.req, ctx.res)
    expect(mockAddToCartRun).toHaveBeenCalled()
    expect(ctx.res.json).toHaveBeenCalledWith({
      cart: { id: "cart_1", items: [] },
    })
  })

  it("handles store companies routes", async () => {
    const create = makeReqRes({
      validatedBody: { name: "ACME" },
      queryConfig: { fields: ["id"] },
    })
    create.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1" }] })
    await storeCompaniesRoute.POST(create.req, create.res)
    expect(mockCreateCompaniesRun).toHaveBeenCalled()
    expect(create.res.json).toHaveBeenCalledWith({ companies: [{ id: "comp_1" }] })

    const createMany = makeReqRes({
      validatedBody: [{ name: "ACME 1" }, { name: "ACME 2" }],
      queryConfig: { fields: ["id"] },
    })
    createMany.graphMock.mockResolvedValueOnce({
      data: [{ id: "comp_1" }, { id: "comp_2" }],
    })
    await storeCompaniesRoute.POST(createMany.req, createMany.res)
    expect(mockCreateCompaniesRun).toHaveBeenCalled()
    expect(createMany.res.json).toHaveBeenCalledWith({
      companies: [{ id: "comp_1" }, { id: "comp_2" }],
    })

    const getById = makeReqRes({
      params: { id: "comp_1" },
      queryConfig: { fields: ["id"] },
    })
    getById.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1" }] })
    await storeCompanyByIdRoute.GET(getById.req, getById.res)
    expect(getById.res.json).toHaveBeenCalledWith({ company: { id: "comp_1" } })

    const updateById = makeReqRes({
      params: { id: "comp_1" },
      body: { name: "Updated" },
      queryConfig: { fields: ["id"] },
    })
    updateById.graphMock.mockResolvedValueOnce({ data: [{ id: "comp_1", name: "Updated" }] })
    await storeCompanyByIdRoute.POST(updateById.req, updateById.res)
    expect(mockUpdateCompaniesRun).toHaveBeenCalled()

    const deleteById = makeReqRes({ params: { id: "comp_1" } })
    await storeCompanyByIdRoute.DELETE(deleteById.req, deleteById.res)
    expect(mockDeleteCompaniesRun).toHaveBeenCalled()
    expect(deleteById.res.status).toHaveBeenCalledWith(204)
  })

  it("handles store company employees and approval-settings routes", async () => {
    const list = makeReqRes({
      params: { id: "comp_1" },
      queryConfig: { fields: ["id"] },
    })
    list.graphMock.mockResolvedValueOnce({
      data: [{ employees: [{ id: "empl_1" }] }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await storeCompanyEmployeesRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      employees: [{ id: "empl_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const create = makeReqRes({
      params: { id: "comp_1" },
      validatedBody: { customer_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    create.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await storeCompanyEmployeesRoute.POST(create.req, create.res)
    expect(mockCreateEmployeesRun).toHaveBeenCalled()

    const getById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
      filterableFields: {},
      queryConfig: { fields: ["id"] },
    })
    getById.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await storeCompanyEmployeeByIdRoute.GET(getById.req, getById.res)
    expect(getById.res.json).toHaveBeenCalledWith({ employee: { id: "empl_1" } })

    const updateById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
      validatedBody: { spending_limit: 100, is_admin: false },
      filterableFields: {},
      queryConfig: { fields: ["id"] },
    })
    updateById.graphMock.mockResolvedValueOnce({ data: [{ id: "empl_1" }] })
    await storeCompanyEmployeeByIdRoute.POST(updateById.req, updateById.res)
    expect(mockUpdateEmployeesRun).toHaveBeenCalled()

    const deleteById = makeReqRes({
      params: { id: "comp_1", employeeId: "empl_1" },
    })
    await storeCompanyEmployeeByIdRoute.DELETE(deleteById.req, deleteById.res)
    expect(mockDeleteEmployeesRun).toHaveBeenCalled()
    expect(deleteById.res.json).toHaveBeenCalledWith({
      id: "empl_1",
      object: "employee",
      deleted: true,
    })

    const updateSettings = makeReqRes({
      params: { id: "comp_1" },
      validatedBody: { requires_admin_approval: true },
    })
    updateSettings.graphMock.mockResolvedValueOnce({
      data: [{ id: "aset_1" }],
    })
    await storeCompanyApprovalSettingsRoute.POST(updateSettings.req, updateSettings.res)
    expect(mockUpdateApprovalSettingsRun).toHaveBeenCalled()
    expect(updateSettings.res.status).toHaveBeenCalledWith(201)
  })

  it("handles store quote routes", async () => {
    const list = makeReqRes({
      auth_context: { actor_id: "cust_1" },
      queryConfig: { fields: ["id"], pagination: { skip: 0, take: 20 } },
    })
    list.graphMock.mockResolvedValueOnce({
      data: [{ id: "quote_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    await storeQuotesRoute.GET(list.req, list.res)
    expect(list.res.json).toHaveBeenCalledWith({
      quotes: [{ id: "quote_1" }],
      count: 1,
      offset: 0,
      limit: 20,
    })

    const create = makeReqRes({
      validatedBody: { cart_id: "cart_1" },
      auth_context: { actor_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    create.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await storeQuotesRoute.POST(create.req, create.res)
    expect(mockCreateRequestForQuoteRun).toHaveBeenCalled()

    const getById = makeReqRes({
      params: { id: "quote_1" },
      auth_context: { actor_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    getById.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await storeQuoteByIdRoute.GET(getById.req, getById.res)
    expect(getById.res.json).toHaveBeenCalledWith({ quote: { id: "quote_1" } })

    const accept = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { message: "accept" },
      auth_context: { actor_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    accept.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await storeQuoteAcceptRoute.POST(accept.req, accept.res)
    expect(mockCustomerAcceptQuoteRun).toHaveBeenCalled()

    const reject = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { message: "reject" },
      queryConfig: { fields: ["id"] },
    })
    reject.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await storeQuoteRejectRoute.POST(reject.req, reject.res)
    expect(mockCustomerRejectQuoteRun).toHaveBeenCalled()

    const message = makeReqRes({
      params: { id: "quote_1" },
      validatedBody: { text: "hello" },
      auth_context: { actor_id: "cust_1" },
      queryConfig: { fields: ["id"] },
    })
    message.graphMock.mockResolvedValueOnce({ data: [{ id: "quote_1" }] })
    await storeQuoteMessagesRoute.POST(message.req, message.res)
    expect(mockCreateQuoteMessageRun).toHaveBeenCalled()

    const preview = makeReqRes({
      params: { id: "quote_1" },
      queryConfig: { fields: ["id", "draft_order_id"] },
    })
    preview.graphMock.mockResolvedValueOnce({
      data: [{ id: "quote_1", draft_order_id: "draft_1" }],
    })
    await storeQuotePreviewRoute.GET(preview.req, preview.res)
    expect(preview.orderService.previewOrderChange).toHaveBeenCalledWith("draft_1")
    expect(preview.res.status).toHaveBeenCalledWith(200)
  })
})
