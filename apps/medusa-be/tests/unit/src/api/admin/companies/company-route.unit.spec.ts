import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowMocks = vi.hoisted(() => ({
  updateCompaniesRun: vi.fn(),
}))

vi.mock("../../../../../../src/workflows/company/workflows/", () => ({
  deleteCompaniesWorkflow: {
    run: vi.fn(),
  },
  updateCompaniesWorkflow: {
    run: workflowMocks.updateCompaniesRun,
  },
}))

const createMockResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  }) as any

const createMockRequest = ({
  body = { name: "stale body name" },
  filterableFields = {},
  graph,
  logger = { info: vi.fn() },
  params = { id: "comp_1" },
  pagination,
  validatedBody = { name: "updated company name" },
  validatedQuery = {},
  withDeleted,
}: {
  body?: Record<string, unknown>
  filterableFields?: Record<string, unknown>
  graph: ReturnType<typeof vi.fn>
  logger?: { info: ReturnType<typeof vi.fn> }
  params?: Record<string, string>
  pagination?: Record<string, unknown>
  validatedBody?: Record<string, unknown>
  validatedQuery?: Record<string, unknown>
  withDeleted?: boolean
}) =>
  ({
    body,
    filterableFields,
    params,
    queryConfig: {
      fields: ["id", "name"],
      pagination,
      withDeleted,
    },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
    validatedBody,
    validatedQuery,
  }) as any

describe("GET /admin/companies", () => {
  it("searches active companies by name, email, or phone by default", async () => {
    const { GET } = await import(
      "../../../../../../src/api/admin/companies/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "comp_1", name: "Acme" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const req = createMockRequest({
      filterableFields: {
        q: " Acme ",
        status: "active",
      },
      graph,
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {
        $or: [
          { name: { $ilike: "%Acme%" } },
          { email: { $ilike: "%Acme%" } },
          { phone: { $ilike: "%Acme%" } },
        ],
      },
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      withDeleted: false,
    })
    expect(res.json).toHaveBeenCalledWith({
      companies: [{ id: "comp_1", name: "Acme" }],
      count: 1,
      limit: 20,
      offset: 0,
    })
  })

  it("can filter to deleted companies only", async () => {
    const { GET } = await import(
      "../../../../../../src/api/admin/companies/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ deleted_at: "2026-06-10T00:00:00.000Z", id: "comp_1" }],
      metadata: { count: 1, skip: 0, take: 20 },
    })
    const req = createMockRequest({
      filterableFields: {
        status: "deleted",
      },
      graph,
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      validatedQuery: {
        order_by: "-name",
      },
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {
        deleted_at: { $ne: null },
      },
      pagination: { order: { name: "DESC" }, skip: 0, take: 20 },
      withDeleted: true,
    })
  })

  it("keeps with_deleted=true requests as all statuses when status is omitted", async () => {
    const { GET } = await import(
      "../../../../../../src/api/admin/companies/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [],
      metadata: { count: 0, skip: 0, take: 20 },
    })
    const req = createMockRequest({
      graph,
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      withDeleted: true,
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: ["id", "name"],
      filters: {},
      pagination: { order: { name: "ASC" }, skip: 0, take: 20 },
      withDeleted: true,
    })
  })
})

describe("POST /admin/companies/:id", () => {
  beforeEach(() => {
    workflowMocks.updateCompaniesRun.mockReset()
  })

  it("updates a company with the validated body", async () => {
    const { POST } = await import(
      "../../../../../../src/api/admin/companies/[id]/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "comp_1", name: "updated company name" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await POST(req, res)

    expect(workflowMocks.updateCompaniesRun).toHaveBeenCalledWith({
      container: req.scope,
      input: {
        id: "comp_1",
        update: {
          name: "updated company name",
        },
      },
    })
    expect(workflowMocks.updateCompaniesRun).not.toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          update: expect.objectContaining({ name: "stale body name" }),
        }),
      })
    )
    expect(res.json).toHaveBeenCalledWith({
      company: { id: "comp_1", name: "updated company name" },
    })
  })
})
