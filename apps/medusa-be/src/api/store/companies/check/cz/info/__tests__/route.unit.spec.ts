import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { TimeoutError } from "../../../../../../../utils/http"

const mockRun = jest.fn()
const mockWorkflow = jest.fn(() => ({
  run: mockRun,
}))

jest.mock(
  "../../../../../../../workflows/company-check/workflows/company-info",
  () => ({
    companyCheckCzInfoWorkflow: (...args: unknown[]) => mockWorkflow(...args),
  })
)

import { GET } from "../route"

function createResponseMock() {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  } as {
    json: jest.Mock
    status: jest.Mock
  }
  res.status.mockImplementation(() => res)
  return res
}

describe("GET /store/companies/check/cz/info", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns workflow result on success", async () => {
    mockRun.mockResolvedValue({
      result: [{ company_identification_number: "00000001" }],
    })

    const req = {
      validatedQuery: {
        company_name: "ACME",
      },
      scope: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.LOGGER) {
            return { error: jest.fn() }
          }
          throw new Error(`Unexpected key: ${key}`)
        },
      },
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(mockWorkflow).toHaveBeenCalledWith(req.scope)
    expect(mockRun).toHaveBeenCalledWith({
      input: req.validatedQuery,
    })
    expect(res.json).toHaveBeenCalledWith([
      { company_identification_number: "00000001" },
    ])
  })

  it("returns 504 on timeout", async () => {
    mockRun.mockRejectedValue(new TimeoutError("timeout"))
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        company_name: "ACME",
      },
      scope: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.LOGGER) {
            return logger
          }
          throw new Error(`Unexpected key: ${key}`)
        },
      },
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(504)
    expect(res.json).toHaveBeenCalledWith({
      error: "Company info request timed out",
    })
  })

  it("returns 400 for INVALID_DATA errors", async () => {
    mockRun.mockRejectedValue(
      new MedusaError(MedusaError.Types.INVALID_DATA, "Bad query")
    )
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        company_name: "ACME",
      },
      scope: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.LOGGER) {
            return logger
          }
          throw new Error(`Unexpected key: ${key}`)
        },
      },
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: "Bad query",
    })
  })

  it("returns 502 for unexpected errors", async () => {
    mockRun.mockRejectedValue(new Error("boom"))
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        company_name: "ACME",
      },
      scope: {
        resolve: (key: string) => {
          if (key === ContainerRegistrationKeys.LOGGER) {
            return logger
          }
          throw new Error(`Unexpected key: ${key}`)
        },
      },
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({
      error: "Company info request failed",
    })
  })
})
