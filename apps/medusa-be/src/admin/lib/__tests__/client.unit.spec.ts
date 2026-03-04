var mockMedusaConstructor: jest.Mock

jest.mock("@medusajs/js-sdk", () => ({
  __esModule: true,
  default: (mockMedusaConstructor = jest.fn(function mockMedusa(
    this: any,
    config
  ) {
    this.__kind = "mock-sdk"
    this.config = config
  })),
}))

import { sdk } from "../client"

describe("admin sdk client", () => {
  it("constructs sdk with session auth configuration", () => {
    expect(mockMedusaConstructor).toHaveBeenCalledWith({
      baseUrl: "/",
      auth: {
        type: "session",
      },
    })

    expect(sdk).toMatchObject({
      __kind: "mock-sdk",
      config: {
        baseUrl: "/",
        auth: {
          type: "session",
        },
      },
    })
  })
})
