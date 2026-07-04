import { act, createElement, isValidElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fail } from "effect/Effect";

import type { SmartSuggestRequest, SmartSuggestSuggestion } from "@techsio/smart-suggest-core";
import {
  createMockSmartSuggestClient,
  type PostalValidationRequest,
  type PostalValidationResult,
} from "@techsio/smart-suggest-react";

const comboboxProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const formInputProps = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const addressSuggestOptions = vi.hoisted(
  () =>
    [] as Array<{
      request?: SmartSuggestRequest;
      [key: string]: unknown;
    }>,
);
const addressSuggestState = vi.hoisted(
  () =>
    ({
      current: { status: "idle" },
    }) as {
      current:
        | { status: "idle" }
        | { data?: { requestId: string; suggestions: SmartSuggestSuggestion[] }; status: "loading" }
        | { data: { requestId: string; suggestions: SmartSuggestSuggestion[] }; status: "success" }
        | {
            data?: { requestId: string; suggestions: SmartSuggestSuggestion[] };
            error: unknown;
            status: "error";
          };
    },
);

vi.mock("@techsio/ui-kit/molecules/combobox", () => ({
  Combobox: (props: Record<string, unknown>) => {
    comboboxProps.push(props);
    return null;
  },
}));

vi.mock("@techsio/ui-kit/molecules/form-input", () => ({
  FormInput: (props: Record<string, unknown>) => {
    formInputProps.push(props);
    return null;
  },
}));

vi.mock("@techsio/smart-suggest-react", async () => {
  const actual = await vi.importActual<typeof import("@techsio/smart-suggest-react")>(
    "@techsio/smart-suggest-react",
  );

  return {
    ...actual,
    useAddressSuggest: (options: { request?: SmartSuggestRequest; [key: string]: unknown }) => {
      addressSuggestOptions.push(options);

      return addressSuggestState.current;
    },
    useSmartSuggestClient: (client?: unknown) => client ?? actual.createMockSmartSuggestClient(),
  };
});

import { AddressSuggestField, defaultRenderAddressSuggestion } from "../src/address-suggest-field";
import { PhoneValidationField } from "../src/phone-validation-field";
import { PostalValidationField } from "../src/postal-validation-field";

const roots: Root[] = [];

const createServerPostalValidationResult = (
  request: PostalValidationRequest,
): PostalValidationResult => {
  const displayValue = request.rawInput.trim();

  return {
    rawInput: request.rawInput,
    countryCode: request.countryCode,
    normalizedValue: displayValue.toUpperCase(),
    displayValue,
    isValid: true,
    inputHints: {
      autoComplete: "postal-code",
      inputMode: "numeric",
    },
    errors: [],
  };
};

describe("smart suggest UI wrappers", () => {
  beforeEach(() => {
    comboboxProps.length = 0;
    formInputProps.length = 0;
    addressSuggestOptions.length = 0;
    addressSuggestState.current = { status: "idle" };
  });

  afterEach(() => {
    for (const root of roots.splice(0)) {
      act(() => {
        root.unmount();
      });
    }

    document.body.replaceChildren();
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

  it("keeps manual address entry controlled by the caller", () => {
    const onInputValueChange = vi.fn();

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        inputValue: "Manual street",
        onInputValueChange,
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({
      allowCustomValue: true,
      inputValue: "Manual street",
    });
    const onInputValueChangeProp = comboboxProps.at(-1)?.["onInputValueChange"];

    expect(onInputValueChangeProp).toBeTypeOf("function");
    if (typeof onInputValueChangeProp === "function") {
      onInputValueChangeProp("Manual street 2");
    }
    expect(onInputValueChange).toHaveBeenCalledWith("Manual street 2");
  });

  it("passes the requested suggestion limit and reports API state to the caller", async () => {
    const onSuggestStateChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.append(container);
    roots.push(root);

    addressSuggestState.current = {
      data: {
        requestId: "request-1",
        suggestions: [],
      },
      status: "success",
    };

    await act(async () => {
      root.render(
        createElement(AddressSuggestField, {
          client: createMockSmartSuggestClient(),
          countryCode: "CZ",
          countryCodes: ["CZ", "SK"],
          inputValue: "Vinohradska",
          limit: 20,
          onSuggestStateChange,
        }),
      );
    });

    expect(addressSuggestOptions.at(-1)?.request).toMatchObject({
      countryCode: "CZ",
      countryCodes: ["CZ", "SK"],
      kind: "address",
      limit: 20,
      query: "Vinohradska",
    });
    expect(onSuggestStateChange).toHaveBeenCalledWith(addressSuggestState.current);
  });

  it("selects structured address suggestions and keeps accept telemetry non-blocking", () => {
    const suggestion: SmartSuggestSuggestion = {
      address: {
        city: "Praha",
        countryCode: "CZ",
        houseNumber: "832",
        orientationNumber: "19",
        postalCode: "110 00",
        street: "Václavské náměstí",
      },
      confidence: 0.98,
      displayLabel: "Václavské náměstí 832/19, 110 00 Praha",
      id: "suggestion-1",
      kind: "address",
      source: {
        id: "ruian-cz-sample",
        kind: "owned-dataset",
        name: "RUIAN CZ sample",
      },
    };
    const accept = vi.fn(() => fail(new Error("telemetry offline")));
    const onAddressSelect = vi.fn();
    const onSuggestionSelect = vi.fn();

    addressSuggestState.current = {
      data: {
        requestId: "request-1",
        suggestions: [suggestion],
      },
      status: "success",
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient({ accept }),
        onAddressSelect,
        onSuggestionSelect,
        tenant: { cartId: "cart-1", tenantId: "tenant-1" },
      }),
    );

    const onChange = comboboxProps.at(-1)?.["onChange"];

    expect(onChange).toBeTypeOf("function");
    if (typeof onChange === "function") {
      expect(() => onChange("suggestion-1")).not.toThrow();
    }
    expect(onSuggestionSelect).toHaveBeenCalledWith(suggestion);
    expect(onAddressSelect).toHaveBeenCalledWith(suggestion.address);
    expect(accept).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-1",
        source: suggestion.source,
        suggestionId: suggestion.id,
        tenant: { cartId: "cart-1", tenantId: "tenant-1" },
      }),
    );
  });

  it("shows the localized unavailable message when suggestions fail", () => {
    addressSuggestState.current = {
      error: new Error("network unavailable"),
      status: "error",
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        error: "Field error",
        suggestUnavailableMessage: "Návrhy adries nie sú dostupné",
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({
      error: "Návrhy adries nie sú dostupné",
    });
  });

  it("stays quiet by default: no loading copy, no empty-results copy, no unavailable CTA", () => {
    addressSuggestState.current = { status: "loading" };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        inputValue: "P",
      }),
    );

    expect(comboboxProps.at(-1)?.["loadingMessage"]).toBeUndefined();
    expect(comboboxProps.at(-1)?.["noResultsMessage"]).toBeUndefined();
    expect(comboboxProps.at(-1)?.["error"]).toBeUndefined();
    expect(comboboxProps.at(-1)).toMatchObject({ items: [], loading: true });
  });

  it("keeps previous suggestions visible while a new request is loading", () => {
    const suggestion: SmartSuggestSuggestion = {
      confidence: 0.9,
      displayLabel: "Praha",
      id: "address-1",
      kind: "address",
      source: { id: "ruian", kind: "owned-dataset", name: "RUIAN" },
    };

    addressSuggestState.current = {
      data: { requestId: "request-1", suggestions: [suggestion] },
      status: "loading",
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        inputValue: "Pra",
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({
      items: [suggestion],
      loading: true,
    });
    expect(comboboxProps.at(-1)?.["error"]).toBeUndefined();
  });

  it("does not surface unavailable UX on a transient error while previous suggestions exist", () => {
    const suggestion: SmartSuggestSuggestion = {
      confidence: 0.9,
      displayLabel: "Praha",
      id: "address-1",
      kind: "address",
      source: { id: "ruian", kind: "owned-dataset", name: "RUIAN" },
    };

    addressSuggestState.current = {
      data: { requestId: "request-1", suggestions: [suggestion] },
      error: new Error("transient"),
      status: "error",
    };

    renderToStaticMarkup(
      createElement(AddressSuggestField, {
        client: createMockSmartSuggestClient(),
        inputValue: "Pra",
        suggestUnavailableMessage: "Návrhy adries nie sú dostupné",
      }),
    );

    expect(comboboxProps.at(-1)).toMatchObject({ items: [suggestion] });
    expect(comboboxProps.at(-1)?.["error"]).toBeUndefined();
  });

  it("uses the shared postal fallback for local postal validation", async () => {
    const onValidationChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.append(container);
    roots.push(root);

    await act(async () => {
      root.render(
        createElement(PostalValidationField, {
          countryCode: "CZ",
          id: "postal-code",
          label: "Postal code",
          onValidationChange,
        }),
      );
    });

    const onChange = formInputProps.at(-1)?.["onChange"];

    expect(onChange).toBeTypeOf("function");
    await act(async () => {
      if (typeof onChange === "function") {
        onChange({ target: { value: "12a345" } });
      }
    });

    expect(onValidationChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        displayValue: "12A345",
        isValid: false,
        normalizedValue: "12A345",
        errors: [expect.objectContaining({ code: "postal.invalid" })],
      }),
    );
  });

  it("emits cleared postal validation for empty local input when empty validation is disabled", async () => {
    const onValidationChange = vi.fn();
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.append(container);
    roots.push(root);

    await act(async () => {
      root.render(
        createElement(PostalValidationField, {
          countryCode: "CZ",
          defaultValue: "12345",
          id: "postal-code",
          label: "Postal code",
          onValidationChange,
        }),
      );

      await Promise.resolve();
    });

    expect(onValidationChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isValid: true }),
    );

    onValidationChange.mockClear();

    const onChange = formInputProps.at(-1)?.["onChange"];

    expect(onChange).toBeTypeOf("function");
    await act(async () => {
      if (typeof onChange === "function") {
        onChange({ target: { value: "" } });
      }

      await Promise.resolve();
    });

    expect(onValidationChange).toHaveBeenLastCalledWith(undefined);
    expect(onValidationChange).not.toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [expect.objectContaining({ code: "postal.required" })],
      }),
    );
  });

  it("emits cleared postal validation for empty server input when empty validation is disabled", async () => {
    const onValidationChange = vi.fn();
    const validatePostalCode = vi.fn(createServerPostalValidationResult);
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.append(container);
    roots.push(root);

    await act(async () => {
      root.render(
        createElement(PostalValidationField, {
          countryCode: "CZ",
          defaultValue: "12345",
          id: "postal-code",
          label: "Postal code",
          onValidationChange,
          validatePostalCode,
        }),
      );
    });

    const onBlur = formInputProps.at(-1)?.["onBlur"];

    expect(onBlur).toBeTypeOf("function");
    await act(async () => {
      if (typeof onBlur === "function") {
        onBlur({});
      }

      await Promise.resolve();
    });

    expect(validatePostalCode).toHaveBeenCalledTimes(1);
    expect(onValidationChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ isValid: true }),
    );

    onValidationChange.mockClear();

    const onChange = formInputProps.at(-1)?.["onChange"];

    expect(onChange).toBeTypeOf("function");
    await act(async () => {
      if (typeof onChange === "function") {
        onChange({ target: { value: "" } });
      }

      await Promise.resolve();
    });

    expect(validatePostalCode).toHaveBeenCalledTimes(1);
    expect(onValidationChange).toHaveBeenLastCalledWith(undefined);
  });

  it("clears stale server postal validation when the country changes", async () => {
    const validatePostalCode = vi.fn(createServerPostalValidationResult);
    const container = document.createElement("div");
    const root = createRoot(container);

    document.body.append(container);
    roots.push(root);

    await act(async () => {
      root.render(
        createElement(PostalValidationField, {
          countryCode: "CZ",
          defaultValue: "12345",
          id: "postal-code",
          label: "Postal code",
          validateEmpty: true,
          validatePostalCode,
        }),
      );
    });

    const onBlur = formInputProps.at(-1)?.["onBlur"];

    expect(onBlur).toBeTypeOf("function");
    await act(async () => {
      if (typeof onBlur === "function") {
        onBlur({});
      }

      await Promise.resolve();
    });

    expect(formInputProps.at(-1)).toMatchObject({
      validateStatus: "success",
    });

    await act(async () => {
      root.render(
        createElement(PostalValidationField, {
          countryCode: "SK",
          defaultValue: "12345",
          id: "postal-code",
          label: "Postal code",
          validateEmpty: true,
          validatePostalCode,
        }),
      );

      await Promise.resolve();
    });

    expect(formInputProps.at(-1)).toMatchObject({
      validateStatus: "default",
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
