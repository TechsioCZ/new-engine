import { describe, expect, it } from "vitest"
import {
  buildAuthRouteHref,
  resolveAfterAuthHref,
  resolveSafeRedirectHref,
} from "./auth-helpers"

describe("auth public URL helpers", () => {
  it("adds a safe next target to an already localized auth path", () => {
    expect(buildAuthRouteHref("/prihlasenie", "/moj-ucet?tab=orders")).toBe(
      "/prihlasenie?next=%2Fmoj-ucet%3Ftab%3Dorders"
    )
  })

  it("does not add an empty next query", () => {
    expect(buildAuthRouteHref("/prihlasenie")).toBe("/prihlasenie")
  })

  it("accepts only same-origin relative redirect targets", () => {
    expect(resolveSafeRedirectHref("/moj-ucet")).toBe("/moj-ucet")
    expect(resolveSafeRedirectHref("//attacker.example/path")).toBeNull()
    expect(resolveSafeRedirectHref("/\\attacker.example/path")).toBeNull()
    expect(resolveSafeRedirectHref("https://attacker.example/path")).toBeNull()
  })

  it("uses the caller-provided localized fallback", () => {
    expect(resolveAfterAuthHref(undefined, "/moj-ucet")).toBe("/moj-ucet")
  })
})
