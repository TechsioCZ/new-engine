var mockCaptureException: jest.Mock
var mockOriginalErrorHandler: jest.Mock
var mockErrorHandlerFactory: jest.Mock
var mockDefineMiddlewares: jest.Mock
var mockAuthenticate: jest.Mock
var mockValidateAndTransformBody: jest.Mock
var mockValidateAndTransformQuery: jest.Mock

jest.mock("@medusajs/framework/http", () => {
  mockOriginalErrorHandler = jest.fn()
  mockErrorHandlerFactory = jest.fn(() => mockOriginalErrorHandler)

  return {
    errorHandler: (...args: unknown[]) => mockErrorHandlerFactory(...args),
    validateAndTransformBody: () => jest.fn(),
  }
})

jest.mock("@medusajs/framework", () => {
  mockAuthenticate = jest.fn(() => jest.fn())
  mockValidateAndTransformBody = jest.fn(() => jest.fn())
  mockValidateAndTransformQuery = jest.fn(() => jest.fn())

  return {
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
    validateAndTransformBody: (...args: unknown[]) =>
      mockValidateAndTransformBody(...args),
    validateAndTransformQuery: (...args: unknown[]) =>
      mockValidateAndTransformQuery(...args),
  }
})

jest.mock("@medusajs/medusa", () => {
  mockDefineMiddlewares = jest.fn((config: unknown) => config)
  return {
    defineMiddlewares: (...args: unknown[]) => mockDefineMiddlewares(...args),
  }
})

jest.mock("@sentry/node", () => {
  mockCaptureException = jest.fn()
  return {
    captureException: (...args: unknown[]) => mockCaptureException(...args),
  }
})

jest.mock("../companies/check/middlewares", () => ({
  companiesCheckRoutesMiddlewares: [{ matcher: "/company-check" }],
}))

jest.mock("../admin/ppl-config/middlewares", () => ({
  adminPplConfigRoutesMiddlewares: [{ matcher: "/ppl-config" }],
}))

jest.mock("../store/producers/middlewares", () => ({
  storeProducersRoutesMiddlewares: [{ matcher: "/producers" }],
}))

import { MedusaError } from "@medusajs/framework/utils"
import middlewaresConfig from "../middlewares"

describe("api middlewares", () => {
  beforeEach(() => {
    mockCaptureException.mockClear()
    mockOriginalErrorHandler.mockClear()
    mockErrorHandlerFactory.mockClear()
    mockOriginalErrorHandler.mockReturnValue("handled")
  })

  it("defines route middlewares and custom error handler", () => {
    expect(middlewaresConfig).toEqual(
      expect.objectContaining({
        routes: expect.any(Array),
        errorHandler: expect.any(Function),
      })
    )
  })

  it("captures exceptions for non-client errors", () => {
    const result = middlewaresConfig.errorHandler(
      new Error("boom"),
      {} as never,
      {} as never,
      jest.fn()
    )

    expect(mockCaptureException).toHaveBeenCalledTimes(1)
    expect(mockOriginalErrorHandler).toHaveBeenCalledTimes(1)
    expect(result).toBe("handled")
  })

  it("does not capture client-side Medusa errors", () => {
    middlewaresConfig.errorHandler(
      new MedusaError(MedusaError.Types.INVALID_DATA, "invalid"),
      {} as never,
      {} as never,
      jest.fn()
    )

    expect(mockCaptureException).not.toHaveBeenCalled()
    expect(mockOriginalErrorHandler).toHaveBeenCalledTimes(1)
  })

  it("marks /store/customers/me requests as employee-allowed", () => {
    const storeCustomerMeRoute = middlewaresConfig.routes.find(
      (route) => route.matcher === "/store/customers/me"
    )

    expect(storeCustomerMeRoute).toBeDefined()

    const middleware = storeCustomerMeRoute?.middlewares?.[0]
    expect(typeof middleware).toBe("function")

    const req = {} as { allowed?: string[] }
    const next = jest.fn()

    middleware?.(req as never, {} as never, next)

    expect(req.allowed).toEqual(["employee"])
    expect(next).toHaveBeenCalledTimes(1)
  })
})
