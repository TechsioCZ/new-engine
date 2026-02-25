import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { COMPANY_CHECK_MODULE } from "../../../../../../modules/company-check"
import { TimeoutError } from "../../../../../../utils/http"
import { GET } from "../route"

type ScopeMock = {
  resolve: (key: string) => unknown
}

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

describe("GET /store/companies/check/vies", () => {
  it("returns mapped VIES response on success", async () => {
    const companyCheckService = {
      checkVatNumber: jest.fn().mockResolvedValue({
        valid: true,
        name: "ACME s.r.o.",
        address: "Prague",
      }),
    }
    const logger = { error: jest.fn() }
    const scope: ScopeMock = {
      resolve: (key: string) => {
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    }
    const req = {
      validatedQuery: {
        vat_identification_number: "cz12345678",
      },
      scope,
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(companyCheckService.checkVatNumber).toHaveBeenCalledWith({
      countryCode: "CZ",
      vatNumber: "12345678",
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        valid: true,
        name: "ACME s.r.o.",
      })
    )
  })

  it("returns 504 on timeout errors", async () => {
    const companyCheckService = {
      checkVatNumber: jest
        .fn()
        .mockRejectedValue(new TimeoutError("VIES timeout")),
    }
    const logger = { error: jest.fn() }
    const scope: ScopeMock = {
      resolve: (key: string) => {
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope,
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(504)
    expect(res.json).toHaveBeenCalledWith({
      error: "VIES request timed out",
    })
  })

  it("returns 502 on non-timeout errors", async () => {
    const companyCheckService = {
      checkVatNumber: jest.fn().mockRejectedValue(new Error("Upstream error")),
    }
    const logger = { error: jest.fn() }
    const scope: ScopeMock = {
      resolve: (key: string) => {
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope,
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({
      error: "VIES request failed",
    })
    expect(logger.error).toHaveBeenCalled()
  })

  it("returns 400 when VAT parsing throws INVALID_DATA", async () => {
    const companyCheckService = {
      checkVatNumber: jest.fn(),
    }
    const logger = { error: jest.fn() }
    const scope: ScopeMock = {
      resolve: (key: string) => {
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ",
      },
      scope,
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.any(String),
    })
    expect(logger.error).toHaveBeenCalled()
    expect(companyCheckService.checkVatNumber).not.toHaveBeenCalled()
  })

  it("returns 400 for INVALID_DATA errors from downstream service", async () => {
    const companyCheckService = {
      checkVatNumber: jest
        .fn()
        .mockRejectedValue(
          new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid VAT")
        ),
    }
    const logger = { error: jest.fn() }
    const scope: ScopeMock = {
      resolve: (key: string) => {
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope,
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid VAT",
    })
  })
})
