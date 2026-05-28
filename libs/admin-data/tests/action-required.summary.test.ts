import { toActionRequiredSummary } from "../src/action-required/summary"
import type {
  ActionRequiredOrdersResponse,
  PendingB2BCustomersResponse,
} from "../src/action-required/types"
import { AdminApiError } from "../src/shared/error-utils"

const orders = {
  count: 1,
  count_exact: true,
  has_next: false,
  limit: 50,
  offset: 0,
  orders: [],
} satisfies ActionRequiredOrdersResponse

const customers = {
  count: 1,
  count_exact: true,
  customers: [],
  has_next: false,
  limit: 50,
  offset: 0,
} satisfies PendingB2BCustomersResponse

describe("toActionRequiredSummary", () => {
  it("keeps the fulfilled side when the other side has a non-auth failure", () => {
    expect(
      toActionRequiredSummary(
        { status: "fulfilled", value: orders },
        { reason: new Error("customers unavailable"), status: "rejected" }
      )
    ).toEqual({
      customers: null,
      orders,
    })

    expect(
      toActionRequiredSummary(
        { reason: new Error("orders unavailable"), status: "rejected" },
        { status: "fulfilled", value: customers }
      )
    ).toEqual({
      customers,
      orders: null,
    })
  })

  it("does not hide auth failures", () => {
    expect(() =>
      toActionRequiredSummary(
        { status: "fulfilled", value: orders },
        { reason: new AdminApiError("Unauthorized", 401), status: "rejected" }
      )
    ).toThrow(AdminApiError)

    let thrown: unknown

    try {
      toActionRequiredSummary(
        { reason: { status: 403 }, status: "rejected" },
        { status: "fulfilled", value: customers }
      )
    } catch (error) {
      thrown = error
    }

    expect(thrown).toMatchObject({ status: 403 })
  })
})
