import { describe, expect, it } from "vitest"
import { resolveStorefrontAuthMessages } from "./_messages"

describe("resolveStorefrontAuthMessages", () => {
  it("returns first-class Czech messages", () => {
    const messages = resolveStorefrontAuthMessages("cz")

    expect(messages.authenticationFailed).toBe(
      "E-mailová adresa nebo heslo nejsou správné."
    )
    expect(messages.authenticationRequestFailed(401)).toBe(
      "Požadavek na ověření selhal se stavem 401."
    )
    expect(messages.wholesaleCompanyIdentifierRequired).toBe(
      "IČO nebo jiný identifikátor společnosti je povinný."
    )
  })

  it("returns first-class Hungarian messages", () => {
    const messages = resolveStorefrontAuthMessages("hu")

    expect(messages.authenticationFailed).toBe(
      "Az e-mail-cím vagy a jelszó helytelen."
    )
    expect(messages.authenticationRequestFailed(403)).toBe(
      "A hitelesítési kérés 403 állapotkóddal sikertelen volt."
    )
    expect(messages.wholesaleCompanyIdentifierRequired).toBe(
      "Az adószám vagy a cégazonosító megadása kötelező."
    )
  })

  it.each([
    "de",
    "__proto__",
    "toString",
  ])("fails closed for unsupported runtime market %s", (market) => {
    expect(() =>
      resolveStorefrontAuthMessages(
        market as Parameters<typeof resolveStorefrontAuthMessages>[0]
      )
    ).toThrow("Unsupported storefront auth market")
  })
})
