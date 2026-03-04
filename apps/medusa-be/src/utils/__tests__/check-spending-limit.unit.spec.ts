import { ModuleCompanySpendingLimitResetFrequency } from "../../types"
import {
  checkSpendingLimit,
  getOrderTotalInSpendWindow,
  getSpendWindow,
} from "../check-spending-limit"

describe("check-spending-limit utils", () => {
  const baseCompany = {
    spending_limit_reset_frequency:
      ModuleCompanySpendingLimitResetFrequency.MONTHLY,
  } as any

  it("returns default spend window for missing company", () => {
    const window = getSpendWindow(null as any)
    expect(window.start.getTime()).toBe(0)
    expect(window.end.getTime()).toBeGreaterThan(0)
  })

  it("calculates spend windows for each reset frequency", () => {
    const frequencies = [
      ModuleCompanySpendingLimitResetFrequency.NEVER,
      ModuleCompanySpendingLimitResetFrequency.DAILY,
      ModuleCompanySpendingLimitResetFrequency.WEEKLY,
      ModuleCompanySpendingLimitResetFrequency.MONTHLY,
      ModuleCompanySpendingLimitResetFrequency.YEARLY,
    ]

    for (const frequency of frequencies) {
      const window = getSpendWindow({
        ...baseCompany,
        spending_limit_reset_frequency: frequency,
      } as any)
      expect(window.start).toBeInstanceOf(Date)
      expect(window.end).toBeInstanceOf(Date)
      expect(window.end.getTime()).toBeGreaterThanOrEqual(window.start.getTime())
    }
  })

  it("sums only orders within the spend window", () => {
    const spendWindow = {
      start: new Date("2026-01-10T00:00:00.000Z"),
      end: new Date("2026-01-20T23:59:59.999Z"),
    }

    const total = getOrderTotalInSpendWindow(
      [
        { created_at: "2026-01-09T23:00:00.000Z", total: 10 },
        { created_at: "2026-01-11T12:00:00.000Z", total: 20 },
        { created_at: "2026-01-19T12:00:00.000Z", total: 30 },
        { created_at: "2026-01-21T00:00:00.000Z", total: 40 },
      ] as any,
      spendWindow
    )

    expect(total).toBe(50)
  })

  it("returns false when required cart/customer context is missing", () => {
    expect(checkSpendingLimit(null as any, null as any)).toBe(false)
    expect(checkSpendingLimit({ total: 100 } as any, null as any)).toBe(false)
    expect(
      checkSpendingLimit({ total: 100 } as any, { employee: null } as any)
    ).toBe(false)
  })

  it("returns false when employee spending limit is missing or zero", () => {
    const cart = { total: 100 } as any
    expect(
      checkSpendingLimit(cart, {
        employee: { spending_limit: null, company: baseCompany },
        orders: [],
      } as any)
    ).toBe(false)

    expect(
      checkSpendingLimit(cart, {
        employee: { spending_limit: 0, company: baseCompany },
        orders: [],
      } as any)
    ).toBe(false)
  })

  it("returns true only when cart total pushes spending above the limit", () => {
    const customer = {
      employee: {
        spending_limit: 100,
        company: {
          spending_limit_reset_frequency:
            ModuleCompanySpendingLimitResetFrequency.NEVER,
        },
      },
      orders: [{ created_at: "2025-01-01T00:00:00.000Z", total: 40 }],
    } as any

    expect(checkSpendingLimit({ total: 50 } as any, customer)).toBe(false)
    expect(checkSpendingLimit({ total: 61 } as any, customer)).toBe(true)
  })
})
