import { describe, expect, it } from "vitest"
import { resolvePagesDocumentHtmlLang } from "./document-language"

describe("resolvePagesDocumentHtmlLang", () => {
  it.each([
    ["sk", "sk-SK"],
    ["cz", "cs-CZ"],
    ["hu", "hu-HU"],
    ["ro", "ro-RO"],
  ] as const)("maps the trusted %s market to %s", (market, expected) => {
    expect(resolvePagesDocumentHtmlLang(market)).toBe(expected)
  })

  it.each([
    undefined,
    "",
    "en",
    ["ro"],
  ] as const)("falls back to the valid default language for an invalid header %#", (header) => {
    expect(resolvePagesDocumentHtmlLang(header)).toBe("sk-SK")
  })
})
