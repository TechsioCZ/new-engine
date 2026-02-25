import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { COMPANY_CHECK_MODULE } from "../../../../../../../modules/company-check"
import { TimeoutError } from "../../../../../../../utils/http"
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

describe("GET /admin/companies/check/cz/tax-reliability", () => {
  it("returns reliability result on success", async () => {
    const service = {
      checkTaxReliability: jest.fn().mockResolvedValue({
        reliable: true,
        unreliable_published_at: null,
        subject_type: "PLATCE",
      }),
    }
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope: {
        resolve: (key: string) => {
          if (key === COMPANY_CHECK_MODULE) {
            return service
          }
          if (key === ContainerRegistrationKeys.LOGGER) {
            return logger
          }
          throw new Error(`Unexpected key: ${key}`)
        },
      },
    }
    const res = createResponseMock()

    await GET(req as never, res as never)

    expect(service.checkTaxReliability).toHaveBeenCalledWith("CZ12345678")
    expect(res.json).toHaveBeenCalledWith({
      reliable: true,
      unreliable_published_at: null,
      subject_type: "PLATCE",
    })
  })

  it("returns 400 for INVALID_DATA errors", async () => {
    const service = {
      checkTaxReliability: jest
        .fn()
        .mockRejectedValue(
          new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid DIC")
        ),
    }
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        vat_identification_number: "bad",
      },
      scope: {
        resolve: (key: string) => {
          if (key === COMPANY_CHECK_MODULE) {
            return service
          }
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
      error: "Invalid DIC",
    })
  })

  it("returns 504 for timeout errors", async () => {
    const service = {
      checkTaxReliability: jest
        .fn()
        .mockRejectedValue(new TimeoutError("timeout")),
    }
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope: {
        resolve: (key: string) => {
          if (key === COMPANY_CHECK_MODULE) {
            return service
          }
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
      error: "Moje Dane request timed out",
    })
  })

  it("returns 502 for unexpected errors", async () => {
    const service = {
      checkTaxReliability: jest.fn().mockRejectedValue(new Error("boom")),
    }
    const logger = { error: jest.fn() }
    const req = {
      validatedQuery: {
        vat_identification_number: "CZ12345678",
      },
      scope: {
        resolve: (key: string) => {
          if (key === COMPANY_CHECK_MODULE) {
            return service
          }
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
      error: "Moje Dane request failed",
    })
  })
})
