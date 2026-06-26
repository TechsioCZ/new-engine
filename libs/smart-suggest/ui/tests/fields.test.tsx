import { createElement, isValidElement } from "react"
import { describe, expect, it } from "vitest"

import {
  AddressSuggestField,
  defaultRenderAddressSuggestion,
} from "../src/address-suggest-field"

describe("smart suggest UI wrappers", () => {
  it("renders address suggestion item content from core suggestion contracts", () => {
    expect(
      isValidElement(
        defaultRenderAddressSuggestion({
          confidence: 0.9,
          displayLabel: "Václavské náměstí 832/19, Praha",
          id: "address-1",
          kind: "address",
          source: {
            id: "ruian",
            kind: "owned-dataset",
            name: "RUIAN",
          },
        })
      )
    ).toBe(true)
  })

  it("exposes React components", () => {
    expect(AddressSuggestField).toBeTypeOf("function")
    expect(isValidElement(createElement(AddressSuggestField, {}))).toBe(true)
  })
})
