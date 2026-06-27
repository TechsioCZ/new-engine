import { createElement, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockSmartSuggestClient } from "@techsio/smart-suggest-react";

const comboboxProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@techsio/ui-kit/molecules/combobox", () => ({
  Combobox: (props: Record<string, unknown>) => {
    comboboxProps.push(props);
    return null;
  },
}));

import { AddressSuggestField, defaultRenderAddressSuggestion } from "../src/address-suggest-field";
import { PhoneValidationField } from "../src/phone-validation-field";
import { PostalValidationField } from "../src/postal-validation-field";

describe("smart suggest UI wrappers", () => {
  beforeEach(() => {
    comboboxProps.length = 0;
  });

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
        }),
      ),
    ).toBe(true);
  });

  it("keeps address combobox remote wiring fixed while allowing localized messages", () => {
    const props = {
      allowCustomValue: false,
      client: createMockSmartSuggestClient(),
      closeOnSelect: false,
      filterMode: "local",
      noResultsMessage: "Žiadna zhoda",
      suggestUnavailableMessage: "Návrhy adries nie sú dostupné",
    } as unknown as Parameters<typeof AddressSuggestField>[0];

    renderToStaticMarkup(createElement(AddressSuggestField, props));

    expect(comboboxProps.at(-1)).toMatchObject({
      allowCustomValue: true,
      closeOnSelect: true,
      filterMode: "remote",
      noResultsMessage: "Žiadna zhoda",
    });
  });

  it("exposes React components", () => {
    expect(AddressSuggestField).toBeTypeOf("function");
    expect(PhoneValidationField).toBeTypeOf("function");
    expect(PostalValidationField).toBeTypeOf("function");
    expect(isValidElement(createElement(AddressSuggestField, {}))).toBe(true);
    expect(
      isValidElement(
        createElement(PhoneValidationField, {
          defaultCountry: "CZ",
          label: "Phone",
        }),
      ),
    ).toBe(true);
    expect(
      isValidElement(
        createElement(PostalValidationField, {
          countryCode: "CZ",
          id: "postal-code",
          label: "Postal code",
        }),
      ),
    ).toBe(true);
  });
});
