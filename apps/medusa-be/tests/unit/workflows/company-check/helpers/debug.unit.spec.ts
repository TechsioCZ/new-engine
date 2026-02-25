import {
  hashValueForLogs,
  logAddressCountDebug,
  logCompanyInfoDebug,
} from "../../../../../src/workflows/company-check/helpers/debug"

describe("debug helpers", () => {
  it("returns null hash for missing or blank input", () => {
    expect(hashValueForLogs(undefined)).toBeNull()
    expect(hashValueForLogs(null)).toBeNull()
    expect(hashValueForLogs("   ")).toBeNull()
  })

  it("returns deterministic hash for trimmed values", () => {
    const first = hashValueForLogs("  ACME  ")
    const second = hashValueForLogs("ACME")

    expect(first).toBe(second)
    expect(first).toMatch(/^[a-f0-9]{12}$/)
  })

  it("logs info and address-count scopes with default and explicit details", () => {
    const logger = {
      info: jest.fn(),
    }

    logCompanyInfoDebug(logger as any, "step_started")
    logAddressCountDebug(logger as any, "step_start")
    logAddressCountDebug(logger as any, "step_done", { count: 2 })

    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      "Company check info: step_started {}"
    )
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      "Company check address-count: step_start {}"
    )
    expect(logger.info).toHaveBeenNthCalledWith(
      3,
      'Company check address-count: step_done {"count":2}'
    )
  })
})
