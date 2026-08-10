import { describe, expect, it } from "vitest"

import {
  getCredentialBoolean,
  getCredentialString,
} from "../integration-config"
import { parseCredentials, serializeCredentials } from "../normalizers"

describe("API Store credentials", () => {
  it("round-trips arbitrary provider keys with recursive JSON values", () => {
    const credentials = {
      future_provider_key: " provider-secret ",
      nested: {
        enabled: true,
        retries: 3,
        scopes: ["reviews", null, { region: "cz" }],
      },
    }

    const serialized = JSON.stringify(credentials)

    expect(serializeCredentials(credentials)).toBe(serialized)
    expect(parseCredentials(serialized)).toStrictEqual(credentials)
    expect(getCredentialString(credentials, "future_provider_key")).toBe(
      "provider-secret",
    )
    expect(getCredentialBoolean(credentials, "nested", false)).toBeFalsy()
  })

  it("rejects valid JSON values that are not credential objects", () => {
    expect(parseCredentials("[]")).toBeNull()
    expect(parseCredentials("true")).toBeNull()
    expect(parseCredentials('"secret"')).toBeNull()
  })
})
