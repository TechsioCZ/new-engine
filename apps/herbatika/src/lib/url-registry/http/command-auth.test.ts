import { describe, expect, it } from "vitest"
import {
  verifyBearerAuthorization,
  verifyUrlRegistryCommandAuthorization,
} from "./command-auth"

const TOKEN = "urlr-command-token-with-at-least-32-characters"

describe("verifyUrlRegistryCommandAuthorization", () => {
  it("keeps the command verifier as the shared bearer contract", () => {
    expect(verifyBearerAuthorization(`Bearer ${TOKEN}`, TOKEN)).toBe(
      "authorized"
    )
    expect(
      verifyUrlRegistryCommandAuthorization(`Bearer ${TOKEN}`, TOKEN)
    ).toBe(verifyBearerAuthorization(`Bearer ${TOKEN}`, TOKEN))
  })

  it("accepts only the exact bearer token", () => {
    expect(
      verifyUrlRegistryCommandAuthorization(`Bearer ${TOKEN}`, TOKEN)
    ).toBe("authorized")
    expect(
      verifyUrlRegistryCommandAuthorization(`bearer ${TOKEN}`, TOKEN)
    ).toBe("authorized")
  })

  it.each([
    null,
    "",
    `Basic ${TOKEN}`,
    "Bearer wrong-token-with-at-least-32-characters",
    `Bearer ${TOKEN}, Bearer ${TOKEN}`,
    `Bearer  ${TOKEN}`,
  ])("rejects an invalid authorization value: %s", (authorization) => {
    expect(verifyUrlRegistryCommandAuthorization(authorization, TOKEN)).toBe(
      "unauthorized"
    )
  })

  it.each([
    undefined,
    "",
    "short",
    ` ${TOKEN}`,
    `${TOKEN} `,
  ])("fails closed for a malformed configured token: %s", (configuredToken) => {
    expect(
      verifyUrlRegistryCommandAuthorization(
        `Bearer ${configuredToken ?? TOKEN}`,
        configuredToken
      )
    ).toBe("misconfigured")
  })
})
