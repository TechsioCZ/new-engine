import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  attachSmartSuggest,
  installSmartSuggestGlobal,
  type SmartSuggestVanillaFetch,
  type SmartSuggestVanillaPhoneValidatorLoader,
  type SmartSuggestVanillaWindow,
} from "../src/vanilla";

const TOP_LEVEL_VALIDATION_IMPORT_PATTERN = new RegExp(
  "@techsio/smart-suggest-" + "validation[\"']",
  "u",
);
const LIBPHONENUMBER_IMPORT_PATTERN = new RegExp("libphone" + "number-js", "u");

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

const validPhoneResponse = (rawInput = "+420777123456") => ({
  callingCode: "420",
  detectedCountry: "CZ",
  displayValue: "+420 777 123 456",
  e164: "+420777123456",
  errors: [],
  isPossible: true,
  isValid: true,
  nationalNumber: "777123456",
  rawInput,
  type: "MOBILE",
});

const validPostalResponse = (rawInput = "12345") => ({
  countryCode: "CZ",
  displayValue: "123 45",
  errors: [],
  inputHints: { autoComplete: "postal-code", inputMode: "numeric" },
  isValid: true,
  normalizedValue: "12345",
  rawInput,
});

const readFetchJsonBody = async (
  fetchMock: {
    mock: {
      calls: Array<Parameters<SmartSuggestVanillaFetch>>;
    };
  },
  callIndex = 0,
) => {
  const body = fetchMock.mock.calls[callIndex]?.[1]?.body;
  const bodyText = await new Response(body ?? null).text();
  return JSON.parse(bodyText);
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
      const listOption = document.querySelector('[role="option"]');
      expect(listOption).toBeInstanceOf(HTMLElement);
      return listOption as HTMLElement;
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
    expect(
      new URL(
        String(fetchMock.mock.calls.find(([input]) => String(input).includes("/v1/suggest"))?.[0]),
        "https://shop.example",
      ).searchParams.get("limit"),
    ).toBe("20");
  });

  it("keeps controlled inputs editable before delegated framework handlers run", async () => {
    const form = document.createElement("form");
    document.body.append(form);

    const address = addInput("address");
    form.append(address);

    let controlledValue = "";
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      if (String(input).includes("/v1/suggest")) {
        return Promise.resolve(
          jsonResponse({
            cacheStatus: "miss",
            requestId: "request-controlled-input",
            suggestions: [],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ accepted: true }));
    });

    attachSmartSuggest({
      addressLine: address,
      debounceMs: 0,
      fetch: fetchMock,
      minQueryLength: 1,
      onSuggestStateChange: () => {
        address.value = controlledValue;
      },
    });

    form.addEventListener("input", (event) => {
      if (event.target !== address) {
        return;
      }

      controlledValue = address.value;
      address.value = controlledValue;
    });

    address.value = "J";
    address.dispatchEvent(new Event("input", { bubbles: true }));

    expect(address.value).toBe("J");

    await waitFor(() => {
      const suggestCall = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/v1/suggest"),
      );
      expect(suggestCall).toBeDefined();
      expect(new URL(String(suggestCall?.[0]), "https://shop.example").searchParams.get("q")).toBe(
        "J",
      );
    });
  });

  it("requests and applies field-specific city and postal suggestions without overwriting address line", async () => {
    const form = document.createElement("form");
    form.setAttribute("data-smart-suggest-countries", "CZ,SK");
    document.body.append(form);
    const address = addInput("address", "Javorová 1");
    const city = addInput("city");
    const postalCode = addInput("postal-code");
    const country = addInput("country", "CZ");
    form.append(address, city, postalCode, country);
    const suggestUrls: URL[] = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.includes("/v1/suggest")) {
        const suggestUrl = new URL(url, "https://shop.example");
        suggestUrls.push(suggestUrl);
        const kind = suggestUrl.searchParams.get("kind");

        return Promise.resolve(
          jsonResponse({
            cacheStatus: "miss",
            requestId: `request-${kind}`,
            suggestions:
              kind === "postal"
                ? [
                    {
                      address: { city: "Brno", countryCode: "CZ", postalCode: "602 00" },
                      confidence: 0.92,
                      displayLabel: "602 00 Brno",
                      id: "ruian-cz:postal:60200",
                      kind: "postal",
                      source: { id: "ruian-cz", kind: "owned-dataset", name: "RUIAN" },
                    },
                  ]
                : [
                    {
                      address: { city: "Brno", countryCode: "CZ" },
                      confidence: 0.94,
                      displayLabel: "Brno CZ",
                      id: "ruian-cz:city:brno",
                      kind: "place",
                      source: { id: "ruian-cz", kind: "owned-dataset", name: "RUIAN" },
                    },
                  ],
          }),
        );
      }

      return Promise.resolve(jsonResponse({ accepted: true }));
    });

    attachSmartSuggest({
      addressLine: address,
      city,
      country,
      debounceMs: 0,
      fetch: fetchMock,
      minQueryLength: 1,
      postalCode,
    });

    city.value = "B";
    city.dispatchEvent(new Event("input", { bubbles: true }));
    let option = await waitFor(() => {
      const listOption = document.querySelector('[role="option"]');
      expect(listOption).toBeInstanceOf(HTMLElement);
      return listOption as HTMLElement;
    });
    option.click();

    expect(address.value).toBe("Javorová 1");
    expect(city.value).toBe("Brno");
    expect(postalCode.value).toBe("");
    expect(country.value).toBe("CZ");

    postalCode.value = "602";
    postalCode.dispatchEvent(new Event("input", { bubbles: true }));
    option = await waitFor(() => {
      const listOption = document.querySelector('[role="option"]');
      expect(listOption).toBeInstanceOf(HTMLElement);
      return listOption as HTMLElement;
    });
    option.click();

    expect(address.value).toBe("Javorová 1");
    expect(city.value).toBe("Brno");
    expect(postalCode.value).toBe("602 00");
    expect(country.value).toBe("CZ");
    expect(suggestUrls.map((url) => url.searchParams.get("kind"))).toEqual(["place", "postal"]);
    expect(suggestUrls.map((url) => url.searchParams.get("countryCode"))).toEqual(["CZ", "CZ"]);
    expect(suggestUrls.map((url) => url.searchParams.get("countryCodes"))).toEqual([
      "CZ,SK",
      "CZ,SK",
    ]);
  });

  it("surfaces blocked field country scope without issuing a suggest request", async () => {
    const form = document.createElement("form");
    form.setAttribute("data-smart-suggest-countries", "CZ,SK");
    document.body.append(form);
    const address = addInput("address");
    const city = addInput("city");
    const country = addInput("country", "CZ");
    form.append(address, city, country);
    city.setAttribute("data-smart-suggest-countries", "SK");
    const onSuggestStateChange = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse({ cacheStatus: "miss", requestId: "unused", suggestions: [] })),
    );

    attachSmartSuggest({
      addressLine: address,
      city,
      country,
      debounceMs: 0,
      fetch: fetchMock,
      minQueryLength: 1,
      onSuggestStateChange,
    });

    city.value = "B";
    city.dispatchEvent(new Event("input", { bubbles: true }));

    await waitFor(() =>
      expect(onSuggestStateChange).toHaveBeenLastCalledWith({
        countryCode: "CZ",
        countryCodes: ["SK"],
        reason: "country-scope",
        status: "blocked",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not bind document fields when the configured root selector is missing", async () => {
    const address = addInput("address", "Praha");
    const phone = addInput("phone", "+420777123456");
    const postalCode = addInput("postal-code", "12345");
    addInput("country", "CZ");
    const onError = vi.fn();
    const onSuggestStateChange = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.includes("/v1/suggest")) {
        return Promise.resolve(
          jsonResponse({
            cacheStatus: "miss",
            requestId: "request-missing-root",
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
      }

      if (url.endsWith("/phone")) {
        return Promise.resolve(jsonResponse(validPhoneResponse()));
      }

      return Promise.resolve(jsonResponse(validPostalResponse()));
    });

    const instance = attachSmartSuggest({
      addressLine: "#address",
      country: "#country",
      debounceMs: 0,
      fetch: fetchMock,
      minQueryLength: 1,
      onError,
      onSuggestStateChange,
      phone: "#phone",
      postalCode: "#postal-code",
      root: "#missing-checkout-root",
    });

    expect(address.getAttribute("role")).toBeNull();
    expect(phone.getAttribute("type")).toBeNull();

    address.dispatchEvent(new Event("input", { bubbles: true }));
    phone.dispatchEvent(new FocusEvent("blur"));
    postalCode.dispatchEvent(new FocusEvent("blur"));
    await instance.suggest("Praha");
    await instance.validatePhone();
    await instance.validatePostal();
    await nextTick();
    instance.destroy();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(onSuggestStateChange).not.toHaveBeenCalled();
    expect(document.querySelector("[data-smart-suggest-list]")).toBeNull();
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

    expect(document.querySelector('[role="option"]')?.textContent).toBe("Brno, Czechia");

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

    expect(document.querySelector('[role="option"]')?.textContent).toBe("Brno, Czechia");
  });

  it("clears stale address suggestions before the next debounced lookup", async () => {
    const address = addInput("address");
    const selected = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
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
      ),
    );
    const instance = attachSmartSuggest({
      addressLine: address,
      debounceMs: 50,
      fetch: fetchMock,
      minQueryLength: 1,
      onSuggestionSelect: selected,
    });

    await instance.suggest("Praha");

    const option = document.querySelector('[role="option"]');
    expect(option?.textContent).toBe("Praha, Czechia");
    address.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );

    address.value = "Brno";
    address.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    address.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );

    expect(document.querySelector('[role="option"]')).toBeNull();
    expect(address.value).toBe("Brno");
    expect(selected).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    instance.destroy();
  });

  it("clears stale suggestions when the latest lookup fails", async () => {
    const address = addInput("address");
    const onError = vi.fn();
    let shouldFail = false;
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() => {
      if (shouldFail) {
        return Promise.reject(new Error("network offline"));
      }

      return Promise.resolve(
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-first",
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
    });
    const instance = attachSmartSuggest({
      addressLine: address,
      fetch: fetchMock,
      minQueryLength: 1,
      onError,
    });

    await instance.suggest("Praha");
    expect(document.querySelector('[role="option"]')?.textContent).toBe("Praha, Czechia");

    shouldFail = true;
    await instance.suggest("Brno");

    expect(document.querySelector('[role="option"]')).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("does not request address suggestions for whitespace-padded weak query signals", async () => {
    const address = addInput("address");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-weak",
          suggestions: [],
        }),
      ),
    );
    const instance = attachSmartSuggest({
      addressLine: address,
      fetch: fetchMock,
      minQueryLength: 3,
    });

    await instance.suggest("K L");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(address.getAttribute("aria-expanded")).toBe("false");
  });

  it("requests postal suggestions for postal-code-first searches", async () => {
    const address = addInput("address");
    const onSuggestStateChange = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-postal",
          suggestions: [],
        }),
      ),
    );
    const instance = attachSmartSuggest({
      addressLine: address,
      fetch: fetchMock,
      minQueryLength: 1,
      onSuggestStateChange,
    });

    await instance.suggest("101 00");

    const suggestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://shop.example");
    expect(suggestUrl.searchParams.get("kind")).toBe("postal");
    expect(onSuggestStateChange).toHaveBeenCalledWith({ status: "loading" });
    expect(onSuggestStateChange).toHaveBeenLastCalledWith({
      requestId: "request-postal",
      status: "success",
      suggestions: [],
    });
  });

  it("uses an anchored popover combobox and supports keyboard selection", async () => {
    const address = addInput("address");
    const city = addInput("city");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-keyboard",
          suggestions: [
            {
              address: {
                city: "Praha",
                countryCode: "CZ",
                houseNumber: "1312",
                orientationNumber: "1",
                postalCode: "101 00",
                street: "K louži",
              },
              confidence: 0.95,
              displayLabel: "K louži 1312/1, Vršovice, 10100 Praha 10",
              id: "k-louzi-1312-1",
              kind: "address",
              source: {
                id: "ruian-geocode",
                kind: "live-provider",
                name: "RÚIAN geocoder",
              },
            },
            {
              address: {
                city: "Praha",
                countryCode: "CZ",
                houseNumber: "1258",
                orientationNumber: "12",
                postalCode: "101 00",
                street: "K louži",
              },
              confidence: 0.95,
              displayLabel: "K louži 1258/12, Vršovice, 10100 Praha 10",
              id: "k-louzi-1258-12",
              kind: "address",
              source: {
                id: "ruian-geocode",
                kind: "live-provider",
                name: "RÚIAN geocoder",
              },
            },
          ],
        }),
      ),
    );
    const instance = attachSmartSuggest({
      addressLine: address,
      city,
      fetch: fetchMock,
      minQueryLength: 1,
    });

    await instance.suggest("K Louži");

    const list = document.querySelector("[data-smart-suggest-list]");
    expect(list).toBeInstanceOf(HTMLUListElement);
    expect(address.getAttribute("role")).toBe("combobox");
    expect(address.getAttribute("aria-autocomplete")).toBe("list");
    expect(address.getAttribute("aria-controls")).toBe((list as HTMLUListElement).id);
    expect(address.getAttribute("aria-expanded")).toBe("true");
    expect((list as HTMLUListElement).getAttribute("popover")).toBe("auto");
    expect((list as HTMLUListElement).hidden).toBe(false);

    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.map((option) => option.textContent)).toEqual([
      "K louži 1312/1, Vršovice, 10100 Praha 10",
      "K louži 1258/12, Vršovice, 10100 Praha 10",
    ]);

    address.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    expect(address.getAttribute("aria-activedescendant")).toBe(options[0]?.id);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    address.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowDown",
      }),
    );
    expect(address.getAttribute("aria-activedescendant")).toBe(options[1]?.id);
    expect(options[1]?.getAttribute("aria-selected")).toBe("true");

    address.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
      }),
    );

    expect(address.value).toBe("K louži 1258/12");
    expect(city.value).toBe("Praha");
    expect(address.getAttribute("aria-expanded")).toBe("false");
    expect((list as HTMLUListElement).hidden).toBe(true);

    instance.destroy();

    expect(document.querySelector("[data-smart-suggest-list]")).toBeNull();
    expect(address.getAttribute("role")).toBeNull();
    expect(address.getAttribute("aria-controls")).toBeNull();
  });

  it("normalizes phone and postal fields on blur without blocking the form", async () => {
    const phone = addInput("phone", "+420777123456");
    const postalCode = addInput("postal-code", "12345");
    const country = addInput("country", "CZ");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.endsWith("/phone")) {
        return Promise.resolve(jsonResponse(validPhoneResponse()));
      }

      return Promise.resolve(jsonResponse(validPostalResponse()));
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

  it("discards stale phone validation responses after rapid input change", async () => {
    const phone = addInput("phone", "+420777111111");
    const country = addInput("country", "CZ");
    const pendingPhoneResponses: Array<{
      init: RequestInit | undefined;
      resolve: (response: Response) => void;
    }> = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(
      (_input, init) =>
        new Promise<Response>((resolve) => {
          pendingPhoneResponses.push({ init, resolve });
        }),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
    });

    const firstValidation = instance.validatePhone();
    phone.value = "+420777222222";
    const secondValidation = instance.validatePhone();

    expect(pendingPhoneResponses).toHaveLength(2);
    expect(pendingPhoneResponses[0]?.init?.signal?.aborted).toBe(true);

    pendingPhoneResponses[1]?.resolve(
      jsonResponse({
        ...validPhoneResponse("+420777222222"),
        displayValue: "+420 777 222 222",
        e164: "+420777222222",
        nationalNumber: "777222222",
      }),
    );
    await secondValidation;

    expect(phone.value).toBe("+420 777 222 222");

    pendingPhoneResponses[0]?.resolve(
      jsonResponse({
        ...validPhoneResponse("+420777111111"),
        displayValue: "+420 777 111 111",
        e164: "+420777111111",
        nationalNumber: "777111111",
      }),
    );
    await firstValidation;

    expect(phone.value).toBe("+420 777 222 222");
  });

  it("discards stale postal validation responses after rapid input change", async () => {
    const postalCode = addInput("postal-code", "11111");
    const country = addInput("country", "CZ");
    const pendingPostalResponses: Array<{
      init: RequestInit | undefined;
      resolve: (response: Response) => void;
    }> = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(
      (_input, init) =>
        new Promise<Response>((resolve) => {
          pendingPostalResponses.push({ init, resolve });
        }),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      postalCode,
    });

    const firstValidation = instance.validatePostal();
    postalCode.value = "22222";
    const secondValidation = instance.validatePostal();

    expect(pendingPostalResponses).toHaveLength(2);
    expect(pendingPostalResponses[0]?.init?.signal?.aborted).toBe(true);

    pendingPostalResponses[1]?.resolve(
      jsonResponse({
        ...validPostalResponse("22222"),
        displayValue: "222 22",
        normalizedValue: "22222",
      }),
    );
    await secondValidation;

    expect(postalCode.value).toBe("222 22");

    pendingPostalResponses[0]?.resolve(
      jsonResponse({
        ...validPostalResponse("11111"),
        displayValue: "111 11",
        normalizedValue: "11111",
      }),
    );
    await firstValidation;

    expect(postalCode.value).toBe("222 22");
  });

  it("aborts in-flight validation on destroy without surfacing errors", async () => {
    const phone = addInput("phone", "+420777123456");
    const postalCode = addInput("postal-code", "12345");
    const country = addInput("country", "CZ");
    const onError = vi.fn();
    const pendingSignals: AbortSignal[] = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;

          if (signal !== undefined && signal !== null) {
            pendingSignals.push(signal);
            signal.addEventListener(
              "abort",
              () => reject(signal.reason),
              { once: true },
            );
          }
        }),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      onError,
      phone,
      postalCode,
    });

    const phoneValidation = instance.validatePhone();
    const postalValidation = instance.validatePostal();

    await waitFor(() => expect(pendingSignals).toHaveLength(2));
    instance.destroy();

    await expect(phoneValidation).resolves.toBeUndefined();
    await expect(postalValidation).resolves.toBeUndefined();
    expect(pendingSignals.every((signal) => signal.aborted)).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(phone.validationMessage).toBe("");
    expect(postalCode.validationMessage).toBe("");
  });

  it("applies invalid postal validation to the postal control", async () => {
    const postalCode = addInput("postal-code", "12a345");
    const country = addInput("country", "CZ");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          countryCode: "CZ",
          displayValue: "12A345",
          errors: [
            {
              code: "postal.invalid",
              field: "postalCode",
              message: "Enter a valid postal code for the selected country.",
            },
          ],
          inputHints: { autoComplete: "postal-code", inputMode: "numeric" },
          isValid: false,
          normalizedValue: "12A345",
          rawInput: "12a345",
        }),
      ),
    );

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      postalCode,
    });

    postalCode.dispatchEvent(new FocusEvent("blur"));

    await waitFor(() =>
      expect(postalCode.validationMessage).toBe(
        "Enter a valid postal code for the selected country.",
      ),
    );
    expect(postalCode.getAttribute("aria-invalid")).toBe("true");

    postalCode.value = "12345";
    postalCode.dispatchEvent(new Event("input", { bubbles: true }));

    expect(postalCode.validationMessage).toBe("");
    expect(postalCode.getAttribute("aria-invalid")).toBeNull();
  });

  it("applies rejected postal validation errors to the postal control", async () => {
    const postalCode = addInput("postal-code", "123-45");
    const country = addInput("country", "CZ");
    const onError = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse(
          {
            _tag: "SmartSuggestValidationError",
            errors: [
              {
                code: "validation-error",
                field: "postalCode",
                message: "Enter a valid postal code for the selected country.",
              },
            ],
            message: "Enter a valid postal code for the selected country.",
          },
          { status: 422, statusText: "Unprocessable Entity" },
        ),
      ),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      onError,
      postalCode,
    });

    await instance.validatePostal();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/validate/postal",
      expect.objectContaining({ method: "POST" }),
    );
    expect(postalCode.validationMessage).toBe(
      "Enter a valid postal code for the selected country.",
    );
    expect(postalCode.getAttribute("aria-invalid")).toBe("true");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 422 }));
  });

  it("waits for postal validation before resuming form submission", async () => {
    const form = document.createElement("form");
    const postalCode = document.createElement("input");
    const country = document.createElement("input");
    postalCode.value = "12345";
    country.value = "CZ";
    form.append(postalCode, country);
    document.body.append(form);

    const pendingPostalResponses: Array<{ resolve: (response: Response) => void }> = [];
    const submitSpy = vi.spyOn(form, "requestSubmit").mockImplementation(() => undefined);
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(
      () =>
        new Promise<Response>((resolve) => {
          pendingPostalResponses.push({ resolve });
        }),
    );

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      postalCode,
    });

    postalCode.dispatchEvent(new Event("input", { bubbles: true }));
    const submitEvent = new SubmitEvent("submit", { bubbles: true, cancelable: true });

    expect(form.dispatchEvent(submitEvent)).toBe(false);
    await waitFor(() => expect(pendingPostalResponses).toHaveLength(1));
    expect(submitSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/validate/postal",
      expect.objectContaining({ method: "POST" }),
    );
    await expect(readFetchJsonBody(fetchMock)).resolves.toEqual({
      countryCode: "CZ",
      rawInput: "12345",
    });

    pendingPostalResponses[0]?.resolve(jsonResponse(validPostalResponse()));

    await waitFor(() => expect(submitSpy).toHaveBeenCalledTimes(1));
    expect(postalCode.value).toBe("123 45");
    expect(postalCode.getAttribute("aria-invalid")).toBeNull();
  });

  it("keeps postal form submission blocked when validation returns invalid", async () => {
    const form = document.createElement("form");
    const postalCode = document.createElement("input");
    const country = document.createElement("input");
    postalCode.value = "12a345";
    country.value = "CZ";
    form.append(postalCode, country);
    document.body.append(form);

    const submitSpy = vi.spyOn(form, "requestSubmit").mockImplementation(() => undefined);
    const reportValiditySpy = vi.spyOn(postalCode, "reportValidity").mockImplementation(() => true);
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          countryCode: "CZ",
          displayValue: "12A345",
          errors: [
            {
              code: "postal.invalid",
              field: "postalCode",
              message: "Enter a valid postal code for the selected country.",
            },
          ],
          inputHints: { autoComplete: "postal-code", inputMode: "numeric" },
          isValid: false,
          normalizedValue: "12A345",
          rawInput: "12a345",
        }),
      ),
    );

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      postalCode,
    });

    const submitEvent = new SubmitEvent("submit", { bubbles: true, cancelable: true });

    expect(form.dispatchEvent(submitEvent)).toBe(false);
    await waitFor(() => expect(reportValiditySpy).toHaveBeenCalledTimes(1));

    expect(submitSpy).not.toHaveBeenCalled();
    expect(postalCode.validationMessage).toBe(
      "Enter a valid postal code for the selected country.",
    );
    expect(postalCode.getAttribute("aria-invalid")).toBe("true");
  });

  it("keeps phone validation server-only by default and applies native tel semantics", async () => {
    const phone = addInput("phone", "+420777123456");
    const country = addInput("country", "CZ");
    const phoneValidatorLoader = vi.fn<SmartSuggestVanillaPhoneValidatorLoader>(async () => ({
      validatePhoneNumber: vi.fn(),
    }));
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse(validPhoneResponse())),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
      phoneValidatorLoader,
    });

    await instance.validatePhone();

    expect(phoneValidatorLoader).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/validate/phone",
      expect.objectContaining({ method: "POST" }),
    );
    await expect(readFetchJsonBody(fetchMock)).resolves.toEqual({
      defaultCountry: "CZ",
      rawInput: "+420777123456",
    });
    expect(phone.value).toBe("+420 777 123 456");
    expect(phone.getAttribute("type")).toBe("tel");
    expect(phone.getAttribute("autocomplete")).toBe("tel");
    expect(phone.getAttribute("inputmode")).toBe("tel");
    expect(phone.getAttribute("aria-invalid")).toBeNull();

    instance.destroy();

    expect(phone.getAttribute("type")).toBeNull();
    expect(phone.getAttribute("autocomplete")).toBeNull();
    expect(phone.getAttribute("inputmode")).toBeNull();
  });

  it("blocks phone form submission when required server validation is inconclusive", async () => {
    const form = document.createElement("form");
    const phone = document.createElement("input");
    phone.value = "+420777123456";
    form.append(phone);
    document.body.append(form);
    const submitSpy = vi.spyOn(form, "requestSubmit").mockImplementation(() => undefined);
    const reportValiditySpy = vi.spyOn(phone, "reportValidity").mockImplementation(() => true);
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.reject(new Error("validation unavailable")),
    );

    attachSmartSuggest({
      fetch: fetchMock,
      phone,
    });

    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(reportValiditySpy).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
    expect(phone.validationMessage).toBe("Phone validation is unavailable. Try again.");
    expect(phone.getAttribute("aria-invalid")).toBe("true");
  });

  it("keeps strict phone validation behind the dynamic phone-strict subpath", () => {
    const source = readFileSync("src/vanilla.ts", "utf8");

    expect(source).toContain("@techsio/smart-suggest-validation/phone-lite");
    expect(source).toContain("@techsio/smart-suggest-validation/phone-strict");
    expect(source).not.toMatch(TOP_LEVEL_VALIDATION_IMPORT_PATTERN);
    expect(source).not.toMatch(LIBPHONENUMBER_IMPORT_PATTERN);
  });

  it("uses lite phone validation for obvious malformed input without posting", async () => {
    const phone = addInput("phone", "not a phone");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse({ isValid: true })),
    );
    const instance = attachSmartSuggest({
      fetch: fetchMock,
      phone,
    });

    await instance.validatePhone();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(phone.validationMessage).toBe(
      "Enter a phone number using digits and phone punctuation.",
    );
    expect(phone.getAttribute("aria-invalid")).toBe("true");
  });

  it("starts lazy strict phone validation loading on interaction and uses the frontend result", async () => {
    const phone = addInput("phone", "+420777123456");
    const country = addInput("country", "CZ");
    const validatePhoneNumber = vi.fn(() => ({
      displayValue: "+420 777 123 456",
      errors: [],
      isValid: true,
    }));
    const phoneValidatorLoader = vi.fn<SmartSuggestVanillaPhoneValidatorLoader>(async () => ({
      validatePhoneNumber,
    }));
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse({ isValid: true })),
    );
    const instance = attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
      phoneValidationMode: "frontend-lazy",
      phoneValidatorLoader,
    });

    expect(phoneValidatorLoader).not.toHaveBeenCalled();

    phone.dispatchEvent(new FocusEvent("focus"));

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);

    await instance.validatePhone();

    expect(validatePhoneNumber).toHaveBeenCalledWith({
      defaultCountry: "CZ",
      rawInput: "+420777123456",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(phone.value).toBe("+420 777 123 456");
  });

  it("falls back to server phone validation when lazy frontend loading fails", async () => {
    const phone = addInput("phone", "+420777123456");
    const phoneValidatorLoader = vi.fn<SmartSuggestVanillaPhoneValidatorLoader>(() =>
      Promise.reject(new Error("chunk failed")),
    );
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse(validPhoneResponse())),
    );
    const instance = attachSmartSuggest({
      fetch: fetchMock,
      phone,
      phoneValidationMode: "frontend-lazy",
      phoneValidatorLoader,
    });

    phone.dispatchEvent(new Event("input", { bubbles: true }));
    await instance.validatePhone();

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/validate/phone",
      expect.objectContaining({ method: "POST" }),
    );
    expect(phone.value).toBe("+420 777 123 456");
  });

  it("starts immediate strict phone validation loading during attach", async () => {
    const phone = addInput("phone", "+420777123456");
    const validatePhoneNumber = vi.fn(() => ({
      displayValue: "+420 777 123 456",
      errors: [],
      isValid: true,
    }));
    const phoneValidatorLoader = vi.fn<SmartSuggestVanillaPhoneValidatorLoader>(async () => ({
      validatePhoneNumber,
    }));
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse({ isValid: true })),
    );
    const instance = attachSmartSuggest({
      fetch: fetchMock,
      phone,
      phoneValidationMode: "frontend-immediate",
      phoneValidatorLoader,
    });

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);

    await instance.validatePhone();

    expect(validatePhoneNumber).toHaveBeenCalledWith({
      rawInput: "+420777123456",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears stale phone errors on input", async () => {
    const phone = addInput("phone", "not a phone");
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          displayValue: "not a phone",
          errors: [
            {
              code: "phone.not_a_number",
              field: "phone",
              message: "Enter a phone number.",
            },
          ],
          isValid: false,
        }),
      ),
    );
    const instance = attachSmartSuggest({
      fetch: fetchMock,
      phone,
    });

    await instance.validatePhone();

    expect(phone.validationMessage).toBe(
      "Enter a phone number using digits and phone punctuation.",
    );
    expect(phone.getAttribute("aria-invalid")).toBe("true");

    phone.value = "+420777123456";
    phone.dispatchEvent(new Event("input", { bubbles: true }));

    expect(phone.validationMessage).toBe("");
    expect(phone.getAttribute("aria-invalid")).toBeNull();
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

  it("does not apply stale phone validation after later edits cycle back to the same value", async () => {
    const phone = addInput("phone", "+420777123456");
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
      fetch: fetchMock,
      phone,
    });

    const phoneValidation = instance.validatePhone();
    phone.value = "+420111222333";
    phone.dispatchEvent(new Event("input", { bubbles: true }));
    phone.value = "+420777123456";
    phone.dispatchEvent(new Event("input", { bubbles: true }));

    expect(pendingValidationResponses.map((entry) => entry.url)).toEqual([
      "/api/v1/validate/phone",
    ]);
    pendingValidationResponses[0]?.resolve(
      jsonResponse({
        displayValue: "+420 777 123 456",
        errors: [],
        isValid: true,
      }),
    );
    await phoneValidation;

    expect(phone.value).toBe("+420777123456");
  });

  it("installs the legacy global browser API", () => {
    const api = installSmartSuggestGlobal(smartSuggestWindow());

    expect(smartSuggestWindow().TechsioSmartSuggest).toBe(api);
    expect(smartSuggestWindow().TechsioSmartSuggest?.attach).toBe(attachSmartSuggest);
  });

  it("keeps the SDK demo phone field on native telephone semantics", () => {
    const demoHtml = readFileSync(
      "../../../apps/smart-suggest/apps/shell-super-app/sdk/demo.html",
      "utf8",
    );
    const demoDocument = new DOMParser().parseFromString(demoHtml, "text/html");
    const phone = demoDocument.querySelector<HTMLInputElement>("#phone");

    expect(phone?.getAttribute("type")).toBe("tel");
    expect(phone?.getAttribute("autocomplete")).toBe("tel");
    expect(phone?.getAttribute("inputmode")).toBe("tel");
  });
});
