import { describe, expect, it } from "vitest"
import { buildPath } from "./public-url"
import type { Market } from "./types"

const SETTINGS_ROUTES = [
  ["sk", "/ucet/nastavenia"],
  ["cz", "/ucet/nastaveni"],
  ["hu", "/fiok/beallitasok"],
  ["ro", "/cont/setari"],
] as const satisfies readonly (readonly [Market, string])[]

describe("saved-address account settings routes", () => {
  it.each(
    SETTINGS_ROUTES
  )("keeps address management on the approved %s settings route", (market, expectedPath) => {
    expect(buildPath({ kind: "account", section: "settings" }, market)).toBe(
      expectedPath
    )
  })
})
