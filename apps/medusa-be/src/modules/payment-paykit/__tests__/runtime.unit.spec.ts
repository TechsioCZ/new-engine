import { describe, expect, it } from "vitest"
import { getGopayProviderOptions } from "../runtime"

describe("PayKit runtime helpers", () => {
  it("maps GoPay sandbox option to PayKit's public isSandbox option", () => {
    expect(
      getGopayProviderOptions({
        clientId: "client",
        clientSecret: "secret",
        goId: "goid",
        sandbox: false,
        webhookUrl: "https://example.com/hooks/gopay",
      })
    ).toEqual({
      clientId: "client",
      clientSecret: "secret",
      goId: "goid",
      isSandbox: false,
      webhookUrl: "https://example.com/hooks/gopay",
      webhookSecret: "",
      debug: false,
    })
  })
})
