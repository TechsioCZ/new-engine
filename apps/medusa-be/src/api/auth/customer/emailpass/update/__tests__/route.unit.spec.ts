import { describe, expect, it, vi } from "vitest"
import { PRIVATE_FLOW_NOT_FOUND_MESSAGE } from "../../../../../store/private-flow-utils"
import { POST } from "../route"

describe("POST /auth/customer/emailpass/update", () => {
  it("fails closed without resolving or mutating the auth provider", () => {
    const resolve = vi.fn()
    const request = {
      auth_context: {
        actor_id: "customer@example.com",
        actor_type: "customer",
      },
      body: { password: "new-secure-password" },
      headers: { authorization: "Bearer reset-token" },
      scope: { resolve },
    }
    const response = {
      json: vi.fn(),
      setHeader: vi.fn(),
      status: vi.fn(),
    }
    response.status.mockReturnValue(response)
    response.json.mockReturnValue(response)

    POST(request as never, response as never)

    expect(resolve).not.toHaveBeenCalled()
    expect(response.setHeader).toHaveBeenNthCalledWith(
      1,
      "Cache-Control",
      "private, no-store"
    )
    expect(response.setHeader).toHaveBeenNthCalledWith(2, "Pragma", "no-cache")
    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({
      message: PRIVATE_FLOW_NOT_FOUND_MESSAGE,
      type: "not_found",
    })
  })
})
