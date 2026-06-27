import { afterEach, describe, expect, it, vi } from "vitest";

import {
  attachSmartSuggest,
  installSmartSuggestGlobal,
  type SmartSuggestVanillaFetch,
  type SmartSuggestVanillaWindow,
} from "../src/index";

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const responseInit: ResponseInit = {
    headers: { "content-type": "application/json" },
    status: init?.status ?? 200,
  };

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText;
  }

  return new Response(JSON.stringify(body), responseInit);
};

const waitFor = async <TResult>(read: () => TResult) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return read();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw lastError ?? new Error("Timed out waiting for assertion.");
};

const addInput = (id: string, value = "") => {
  const input = document.createElement("input");
  input.id = id;
  input.value = value;
  document.body.append(input);
  return input;
};

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

const smartSuggestWindow = () => window as SmartSuggestVanillaWindow;

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  Reflect.deleteProperty(smartSuggestWindow(), "TechsioSmartSuggest");
});

describe("attachSmartSuggest", () => {
  it("renders address suggestions, fills fields, and records accept telemetry", async () => {
    const address = addInput("address", "Vaclav");
    const city = addInput("city");
    const postalCode = addInput("postal-code");
    const country = addInput("country", "CZ");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.includes("/v1/suggest")) {
        return Promise.resolve(
          jsonResponse({
            cacheStatus: "miss",
            requestId: "request-1",
            suggestions: [
              {
                address: {
                  city: "Praha",
                  countryCode: "CZ",
                  houseNumber: "832",
                  orientationNumber: "19",
                  postalCode: "110 00",
                  street: "Václavské náměstí",
                },
                confidence: 0.95,
                displayLabel: "Václavské náměstí 832/19, 110 00 Praha",
                id: "cz-ruian-vaclavske",
                kind: "address",
                source: {
                  id: "ruian-cz",
                  kind: "owned-dataset",
                  name: "RUIAN",
                },
              },
            ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ accepted: true }));
    });
    const selected = vi.fn();

    attachSmartSuggest({
      addressLine: address,
      apiBaseUrl: "/smart-api",
      city,
      country,
      debounceMs: 0,
      fetch: fetchMock,
      onSuggestionSelect: selected,
      postalCode,
    });
    address.dispatchEvent(new Event("input", { bubbles: true }));

    const option = await waitFor(() => {
      const button = document.querySelector("button");
      expect(button).toBeInstanceOf(HTMLButtonElement);
      return button as HTMLButtonElement;
    });
    option.click();

    expect(address.value).toBe("Václavské náměstí 832/19");
    expect(city.value).toBe("Praha");
    expect(postalCode.value).toBe("110 00");
    expect(country.value).toBe("CZ");
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request-1" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/smart-api/v1/accept",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    await nextTick();
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input).includes("/v1/suggest")),
    ).toHaveLength(1);
  });

  it("ignores stale suggestion responses when fetch ignores abort signals", async () => {
    const address = addInput("address");
    const pendingSuggestResponses: Array<{
      input: RequestInfo | URL;
      resolve: (response: Response) => void;
    }> = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      if (String(input).includes("/v1/suggest")) {
        return new Promise<Response>((resolve) => {
          pendingSuggestResponses.push({ input, resolve });
        });
      }

      return Promise.resolve(jsonResponse({ accepted: true }));
    });
    const instance = attachSmartSuggest({
      addressLine: address,
      fetch: fetchMock,
      minQueryLength: 1,
    });

    const firstSuggest = instance.suggest("Praha");
    const secondSuggest = instance.suggest("Brno");

    expect(pendingSuggestResponses).toHaveLength(2);
    pendingSuggestResponses[1]?.resolve(
      jsonResponse({
        cacheStatus: "miss",
        requestId: "request-brno",
        suggestions: [
          {
            confidence: 0.9,
            displayLabel: "Brno, Czechia",
            id: "brno",
            kind: "address",
            source: { id: "ruian-cz", kind: "owned-dataset", name: "RUIAN" },
          },
        ],
      }),
    );
    await secondSuggest;

    expect(document.querySelector("button")?.textContent).toBe("Brno, Czechia");

    pendingSuggestResponses[0]?.resolve(
      jsonResponse({
        cacheStatus: "miss",
        requestId: "request-praha",
        suggestions: [
          {
            confidence: 0.9,
            displayLabel: "Praha, Czechia",
            id: "praha",
            kind: "address",
            source: { id: "ruian-cz", kind: "owned-dataset", name: "RUIAN" },
          },
        ],
      }),
    );
    await firstSuggest;

    expect(document.querySelector("button")?.textContent).toBe("Brno, Czechia");
  });

  it("normalizes phone and postal fields on blur without blocking the form", async () => {
    const phone = addInput("phone", "+420777123456");
    const postalCode = addInput("postal-code", "12345");
    const country = addInput("country", "CZ");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.endsWith("/phone")) {
        return Promise.resolve(
          jsonResponse({
            displayValue: "+420 777 123 456",
            errors: [],
            isValid: true,
          }),
        );
      }

      return Promise.resolve(
        jsonResponse({
          displayValue: "123 45",
          errors: [],
          isValid: true,
        }),
      );
    });

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
      postalCode,
    });
    phone.dispatchEvent(new FocusEvent("blur"));
    postalCode.dispatchEvent(new FocusEvent("blur"));

    await waitFor(() => expect(phone.value).toBe("+420 777 123 456"));
    await waitFor(() => expect(postalCode.value).toBe("123 45"));
  });

  it("does not overwrite edited validation fields with stale responses", async () => {
    const phone = addInput("phone", "+420777123456");
    const postalCode = addInput("postal-code", "12345");
    const country = addInput("country", "CZ");
    const pendingValidationResponses: Array<{
      resolve: (response: Response) => void;
      url: string;
    }> = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      return new Promise<Response>((resolve) => {
        pendingValidationResponses.push({ resolve, url });
      });
    });
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
      postalCode,
    });

    const phoneValidation = instance.validatePhone();
    const postalValidation = instance.validatePostal();
    phone.value = "+420111222333";
    postalCode.value = "99999";

    expect(pendingValidationResponses.map((entry) => entry.url)).toEqual([
      "/api/v1/validate/phone",
      "/api/v1/validate/postal",
    ]);
    pendingValidationResponses[0]?.resolve(
      jsonResponse({
        displayValue: "+420 777 123 456",
        errors: [],
        isValid: true,
      }),
    );
    pendingValidationResponses[1]?.resolve(
      jsonResponse({
        displayValue: "123 45",
        errors: [],
        isValid: true,
      }),
    );
    await Promise.all([phoneValidation, postalValidation]);

    expect(phone.value).toBe("+420111222333");
    expect(postalCode.value).toBe("99999");
  });

  it("installs the legacy global browser API", () => {
    const api = installSmartSuggestGlobal(smartSuggestWindow());

    expect(smartSuggestWindow().TechsioSmartSuggest).toBe(api);
    expect(smartSuggestWindow().TechsioSmartSuggest?.attach).toBe(attachSmartSuggest);
  });
});
