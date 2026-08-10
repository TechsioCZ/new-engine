import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { COMPANY_MODULE } from "../../../../../../src/modules/company"

const COMPANY_CUSTOMER_GROUP_ENTRY_POINT = "company_customer_group"

const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }
  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

type JsonMock = (body?: unknown) => unknown
type MockResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn<JsonMock>>
}

const createMockResponse = (): MockResponse => {
  const candidate: unknown = {
    json: vi.fn<JsonMock>().mockReturnThis(),
  }
  assertMockShape<MockResponse>(candidate, ["json"])
  return candidate
}

interface CompanyServiceMock {
  listCompanies: ReturnType<typeof vi.fn<() => Promise<unknown[]>>>
}

type GraphMock = ReturnType<
  typeof vi.fn<(input: object) => Promise<{ data: object[] }>>
>

const createMockRequest = ({
  companyService,
  graph,
  requestQuery = { group_id: ["cgrp_1", "cgrp_2"] },
}: {
  companyService: CompanyServiceMock
  graph: GraphMock
  requestQuery?: object
}): {
  request: AuthenticatedMedusaRequest
  resolve: ReturnType<typeof vi.fn<(key: string) => unknown>>
} => {
  const resolve = vi.fn<(key: string) => unknown>((key) => {
    if (key === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }
    if (key === COMPANY_MODULE) {
      return companyService
    }
    throw new Error(`Unexpected dependency: ${key}`)
  })
  const candidate: unknown = {
    query: requestQuery,
    scope: { resolve },
  }
  assertMockShape<AuthenticatedMedusaRequest>(candidate, ["query", "scope"])
  return { request: candidate, resolve }
}

describe("GET /admin/company-customer-group-links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns companies linked to requested customer groups including deleted companies", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/company-customer-group-links/route")
    const graph: GraphMock = vi
      .fn<(input: object) => Promise<{ data: object[] }>>()
      .mockResolvedValue({
        data: [
          { company_id: "comp_1", customer_group_id: "cgrp_1" },
          { company_id: "comp_2", customer_group_id: "cgrp_2" },
        ],
      })
    const companyService: CompanyServiceMock = {
      listCompanies: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([
        { deleted_at: null, id: "comp_1", name: "Active company" },
        { deleted_at: "2026-06-01T00:00:00.000Z", id: "comp_2", name: "Old" },
      ]),
    }
    const { request: req } = createMockRequest({ companyService, graph })
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: COMPANY_CUSTOMER_GROUP_ENTRY_POINT,
      fields: ["company_id", "customer_group_id"],
      filters: { customer_group_id: { $in: ["cgrp_1", "cgrp_2"] } },
    })
    expect(companyService.listCompanies).toHaveBeenCalledWith(
      { id: ["comp_1", "comp_2"] },
      { select: ["id", "name", "deleted_at"], withDeleted: true },
    )
    expect(res.json).toHaveBeenCalledWith({
      customer_group_links: [
        {
          company: { deleted_at: null, id: "comp_1", name: "Active company" },
          customer_group_id: "cgrp_1",
        },
        {
          company: {
            deleted_at: "2026-06-01T00:00:00.000Z",
            id: "comp_2",
            name: "Old",
          },
          customer_group_id: "cgrp_2",
        },
      ],
    })
  })

  it("returns an empty list without resolving services when no group IDs are requested", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/company-customer-group-links/route")
    const graph: GraphMock =
      vi.fn<(input: object) => Promise<{ data: object[] }>>()
    const companyService: CompanyServiceMock = {
      listCompanies: vi.fn<() => Promise<unknown[]>>(),
    }
    const { request: req, resolve } = createMockRequest({
      companyService,
      graph,
      requestQuery: {},
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(resolve).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ customer_group_links: [] })
  })
})
