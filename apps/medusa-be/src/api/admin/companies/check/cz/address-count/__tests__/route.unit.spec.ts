import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { TimeoutError } from "../../../../../../../utils/http"

const mockRun = jest.fn()
const mockWorkflow = jest.fn(() => ({
  run: mockRun,
}))

jest.mock(
  "../../../../../../../workflows/company-check/workflows/address-count",
  () => ({
    companyCheckCzAddressCountWorkflow: (...args: unknown[]) => mockWorkflow(...args),
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

describe("GET /admin/companies/check/cz/address-count", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns workflow count result on success", async () => {
    mockRun.mockResolvedValue({
      result: { count: 12 },
    })
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        street: "Main 10",
        city: "Prague",
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

    expect(mockWorkflow).toHaveBeenCalledWith(req.scope)
    expect(mockRun).toHaveBeenCalledWith({
      input: req.validatedQuery,
    })
    expect(res.json).toHaveBeenCalledWith({ count: 12 })
  })

  it("returns 504 on timeout", async () => {
    mockRun.mockRejectedValue(new TimeoutError("timeout"))
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        street: "Main 10",
        city: "Prague",
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
      error: "ARES request timed out",
    })
  })

  it("returns 400 for INVALID_DATA errors", async () => {
    mockRun.mockRejectedValue(
      new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid address")
    )
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        street: " ",
        city: "Prague",
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
      error: "Invalid address",
    })
  })

  it("returns 502 for unexpected errors", async () => {
    mockRun.mockRejectedValue(new Error("boom"))
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        street: "Main 10",
        city: "Prague",
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
      error: "ARES request failed",
    })
  })
})
