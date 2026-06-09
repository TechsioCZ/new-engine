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
  graph,
  logger = { info: vi.fn() },
  params = { id: "comp_1" },
  validatedBody = { name: "updated company name" },
}: {
  body?: Record<string, unknown>
  graph: ReturnType<typeof vi.fn>
  logger?: { info: ReturnType<typeof vi.fn> }
  params?: Record<string, string>
  validatedBody?: Record<string, unknown>
}) =>
  ({
    body,
    params,
    queryConfig: {
      fields: ["id", "name"],
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
  }) as any

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
