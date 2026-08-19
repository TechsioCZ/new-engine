import { describe, expect, it } from "vitest"
import {
  buildPublicFlowPath,
  buildPublicFlowUrl,
  parsePublicFlowMarket,
} from "../src/core/public-flow-routes"

const MARKET_ROUTES = [
  {
    deactivation: "/ucet/zrusenie-uctu",
    market: "sk",
    resetPassword: "/ucet/obnova-hesla",
    review: "/recenzie/produkt/Token%2FExact%2BCase",
  },
  {
    deactivation: "/ucet/zruseni-uctu",
    market: "cz",
    resetPassword: "/ucet/obnova-hesla",
    review: "/recenze/produkt/Token%2FExact%2BCase",
  },
  {
    deactivation: "/fiok/fiok-torlese",
    market: "hu",
    resetPassword: "/fiok/jelszo-visszaallitas",
    review: "/velemenyek/termek/Token%2FExact%2BCase",
  },
  {
    deactivation: "/cont/dezactivare-cont",
    market: "ro",
    resetPassword: "/cont/resetare-parola",
    review: "/recenzii/produs/Token%2FExact%2BCase",
  },
] as const

describe("public flow routes", () => {
  it.each(
    MARKET_ROUTES
  )("builds exact $market localized account and review paths", ({
    deactivation,
    market,
    resetPassword,
    review,
  }) => {
    expect(
      buildPublicFlowPath({ kind: "account", section: "resetPassword" }, market)
    ).toBe(resetPassword)
    expect(
      buildPublicFlowPath({ kind: "account", section: "deactivation" }, market)
    ).toBe(deactivation)
    expect(
      buildPublicFlowPath({ kind: "review", token: "Token/Exact+Case" }, market)
    ).toBe(review)
  })

  it("builds against only the canonical origin", () => {
    expect(
      buildPublicFlowUrl(
        { kind: "account", section: "resetPassword" },
        "sk",
        "https://herbatica.sk/ignored/path"
      ).toString()
    ).toBe("https://herbatica.sk/ucet/obnova-hesla")
  })

  it.each([
    "SK",
    "de",
    "",
    null,
    undefined,
  ])("fails closed for unknown market %s", (market) => {
    expect(parsePublicFlowMarket(market)).toBeUndefined()
  })

  it("rejects unsafe canonical origins", () => {
    expect(() =>
      buildPublicFlowUrl(
        { kind: "account", section: "resetPassword" },
        "sk",
        "javascript:alert(1)"
      )
    ).toThrow("Canonical origin must use HTTP or HTTPS without credentials")
  })
})
