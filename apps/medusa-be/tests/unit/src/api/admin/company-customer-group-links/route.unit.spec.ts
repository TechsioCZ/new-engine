import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { COMPANY_MODULE } from "../../../../../../src/modules/company"

const COMPANY_CUSTOMER_GROUP_ENTRY_POINT = "company_customer_group"

const createMockResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
  }) as any

const createMockRequest = ({
  companyService,
  graph,
  requestQuery = { group_id: ["cgrp_1", "cgrp_2"] },
}: {
  companyService: { listCompanies: ReturnType<typeof vi.fn> }
  graph: ReturnType<typeof vi.fn>
  requestQuery?: Record<string, unknown>
}) =>
  ({
    query: requestQuery,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        if (key === COMPANY_MODULE) {
          return companyService
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as any

describe("GET /admin/company-customer-group-links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns companies linked to requested customer groups including deleted companies", async () => {
    const { GET } = await import(
      "../../../../../../src/api/admin/company-customer-group-links/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [
        { company_id: "comp_1", customer_group_id: "cgrp_1" },
        { company_id: "comp_2", customer_group_id: "cgrp_2" },
      ],
    })
    const companyService = {
      listCompanies: vi.fn().mockResolvedValue([
        { deleted_at: null, id: "comp_1", name: "Active company" },
        { deleted_at: "2026-06-01T00:00:00.000Z", id: "comp_2", name: "Old" },
      ]),
    }
    const req = createMockRequest({ companyService, graph })
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: COMPANY_CUSTOMER_GROUP_ENTRY_POINT,
      fields: ["company_id", "customer_group_id"],
      filters: {
        customer_group_id: {
          $in: ["cgrp_1", "cgrp_2"],
        },
      },
    })
    expect(companyService.listCompanies).toHaveBeenCalledWith(
      { id: ["comp_1", "comp_2"] },
      {
        select: ["id", "name", "deleted_at"],
        withDeleted: true,
      }
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
    const { GET } = await import(
      "../../../../../../src/api/admin/company-customer-group-links/route"
    )
    const graph = vi.fn()
    const companyService = { listCompanies: vi.fn() }
    const req = createMockRequest({
      companyService,
      graph,
      requestQuery: {},
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(req.scope.resolve).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ customer_group_links: [] })
  })
})
