import { describe, expect, it } from "vitest"
import { buildProductAbsoluteUrl, buildProductPath } from "./product-path"

describe("product URL builder", () => {
  it.each([
    [
      "sk",
      "/produkty/bylinny-caj",
      "https://herbatica.sk/produkty/bylinny-caj",
    ],
    [
      "cz",
      "/produkty/bylinny-caj",
      "https://herbatica.cz/produkty/bylinny-caj",
    ],
    [
      "hu",
      "/termekek/bylinny-caj",
      "https://herbatica.hu/termekek/bylinny-caj",
    ],
    ["ro", "/produse/bylinny-caj", "https://herbatica.ro/produse/bylinny-caj"],
  ] as const)("binds the %s market to its exact path and canonical origin", (market, expectedPath, expectedUrl) => {
    expect(buildProductPath(market, "bylinny-caj")).toBe(expectedPath)
    expect(buildProductAbsoluteUrl(market, "bylinny-caj")).toBe(expectedUrl)
  })

  it("appends an already-normalized raw query without changing case", () => {
    expect(
      buildProductAbsoluteUrl("sk", "bylinny-caj", {
        variant: "SKU-AbC-01",
        utm_source: "test",
      })
    ).toBe(
      "https://herbatica.sk/produkty/bylinny-caj?variant=SKU-AbC-01&utm_source=test"
    )
  })
})
