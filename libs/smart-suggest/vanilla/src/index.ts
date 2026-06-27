import type {
  AddressParts,
  SmartSuggestAcceptEvent,
  SmartSuggestCountryCode,
  SmartSuggestRequest,
  SmartSuggestResponse,
  SmartSuggestSuggestion,
} from "@techsio/smart-suggest-core";

export type SmartSuggestVanillaFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type TextControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type SmartSuggestVanillaField = TextControl | null | string | undefined;

export type SmartSuggestVanillaValidationResult = {
  displayValue?: string;
  errors?: readonly {
    code: string;
    field?: string;
    message: string;
  }[];
  isValid: boolean | "unknown";
};

export type SmartSuggestVanillaAddressSelection = {
  requestId: string;
  suggestion: SmartSuggestSuggestion;
};

export type SmartSuggestVanillaConfig = {
  addressLine?: SmartSuggestVanillaField;
  apiBaseUrl?: string;
  city?: SmartSuggestVanillaField;
  country?: SmartSuggestVanillaField;
  countryCode?: SmartSuggestCountryCode;
  debounceMs?: number;
  fetch?: SmartSuggestVanillaFetch;
  language?: string;
  limit?: number;
  minQueryLength?: number;
  onError?: (error: unknown) => void;
  onSuggestionSelect?: (selection: SmartSuggestVanillaAddressSelection) => void;
  optionClassName?: string;
  phone?: SmartSuggestVanillaField;
  postalCode?: SmartSuggestVanillaField;
  root?: Document | Element | string;
  timeoutMs?: number;
};

export type SmartSuggestVanillaInstance = {
  destroy: () => void;
  suggest: (query?: string) => Promise<void>;
  validatePhone: () => Promise<void>;
  validatePostal: () => Promise<void>;
};

export type SmartSuggestVanillaGlobal = {
  attach: (config: SmartSuggestVanillaConfig) => SmartSuggestVanillaInstance;
};

export type SmartSuggestVanillaWindow = Window & {
  TechsioSmartSuggest?: SmartSuggestVanillaGlobal;
};

const defaultFetch: SmartSuggestVanillaFetch = (input, init) => fetch(input, init);

const normalizeBaseUrl = (apiBaseUrl: string | undefined) => {
  const baseUrl = apiBaseUrl ?? "/api";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const addOptionalParam = (
  params: URLSearchParams,
  name: string,
  value: number | string | undefined,
) => {
  if (value !== undefined && String(value).trim() !== "") {
    params.set(name, String(value));
  }
};

const isTextControl = (element: Element | null): element is TextControl =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement;

const resolveRoot = (root: SmartSuggestVanillaConfig["root"]) => {
  if (typeof root === "string") {
    return document.querySelector(root) ?? document;
  }

  return root ?? document;
};

const resolveField = (root: Document | Element, field: SmartSuggestVanillaField) => {
  if (typeof field === "string") {
    const element = root.querySelector(field);
    return isTextControl(element) ? element : undefined;
  }

  return field ?? undefined;
};

const setControlValue = (control: TextControl | undefined, value?: string) => {
  if (control === undefined || value === undefined || control.value === value) {
    return;
  }

  control.value = value;
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
};

const getControlValue = (control: TextControl | undefined) => control?.value.trim() ?? "";

const toCountryCode = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase();
  return normalized === "" || normalized === undefined
    ? undefined
    : (normalized as SmartSuggestCountryCode);
};

const buildAddressLine = (
  suggestion: SmartSuggestSuggestion,
  address: AddressParts | undefined,
) => {
  if (address?.line1 !== undefined && address.line1.trim() !== "") {
    return address.line1;
  }

  const houseNumber = [address?.houseNumber, address?.orientationNumber]
    .filter((value) => value !== undefined && value.trim() !== "")
    .join("/");
  const streetLine = [address?.street, houseNumber]
    .filter((value) => value !== undefined && value.trim() !== "")
    .join(" ");

  return streetLine === "" ? suggestion.displayLabel : streetLine;
};

const reportError = (onError: SmartSuggestVanillaConfig["onError"], error: unknown) => {
  onError?.(error);
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const createAbortReason = () =>
  new DOMException("Smart Suggest request was superseded.", "AbortError");

const requestJson = async <TResponse>(
  fetchImpl: SmartSuggestVanillaFetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Smart Suggest request timed out.", "TimeoutError"));
  }, timeoutMs);

  if (externalSignal?.aborted === true) {
    abortFromExternalSignal();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    });
  }

  try {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Smart Suggest request failed with ${response.status}.`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
};

const toSuggestUrl = (apiBaseUrl: string, request: SmartSuggestRequest) => {
  const params = new URLSearchParams();
  params.set("kind", request.kind);
  params.set("q", request.query);
  addOptionalParam(params, "countryCode", request.countryCode);
  addOptionalParam(params, "language", request.language);
  addOptionalParam(params, "limit", request.limit);
  return `${apiBaseUrl}/v1/suggest?${params.toString()}`;
};

type SmartSuggestJsonPostOptions = {
  apiBaseUrl: string;
  body: unknown;
  fetchImpl: SmartSuggestVanillaFetch;
  path: string;
  timeoutMs: number;
};

const postJson = <TResponse>(options: SmartSuggestJsonPostOptions) =>
  requestJson<TResponse>(
    options.fetchImpl,
    `${options.apiBaseUrl}${options.path}`,
    { body: JSON.stringify(options.body), method: "POST" },
    options.timeoutMs,
  );

const createSuggestionList = (input: TextControl, optionClassName: string | undefined) => {
  const list = document.createElement("ul");
  list.hidden = true;
  list.setAttribute("role", "listbox");
  list.setAttribute("data-smart-suggest-list", "");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.insertAdjacentElement("afterend", list);

  return {
    list,
    render: (
      suggestions: readonly SmartSuggestSuggestion[],
      onSelect: (suggestion: SmartSuggestSuggestion) => void,
    ) => {
      list.replaceChildren();
      list.hidden = suggestions.length === 0;
      input.setAttribute("aria-expanded", String(suggestions.length > 0));

      for (const suggestion of suggestions) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.className = optionClassName ?? "";
        button.textContent = suggestion.displayLabel;
        button.type = "button";
        button.addEventListener("click", () => onSelect(suggestion));
        item.append(button);
        list.append(item);
      }
    },
  };
};

export const attachSmartSuggest = (
  config: SmartSuggestVanillaConfig,
): SmartSuggestVanillaInstance => {
  const root = resolveRoot(config.root);
  const controls = {
    addressLine: resolveField(root, config.addressLine),
    city: resolveField(root, config.city),
    country: resolveField(root, config.country),
    phone: resolveField(root, config.phone),
    postalCode: resolveField(root, config.postalCode),
  };
  const apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
  const debounceMs = config.debounceMs ?? 180;
  const fetchImpl = config.fetch ?? defaultFetch;
  const limit = config.limit ?? 5;
  const minQueryLength = config.minQueryLength ?? 3;
  const timeoutMs = config.timeoutMs ?? 3000;
  const suggestionList =
    controls.addressLine === undefined
      ? undefined
      : createSuggestionList(controls.addressLine, config.optionClassName);

  let activeSuggestController: AbortController | undefined;
  let currentRequestId: string | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let isApplyingSuggestion = false;
  let phoneValidationSequence = 0;
  let postalValidationSequence = 0;
  let suggestSequence = 0;

  const readCountryCode = () =>
    toCountryCode(getControlValue(controls.country)) ?? config.countryCode;

  const clearDebounceTimer = () => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  };

  const acceptSuggestion = (suggestion: SmartSuggestSuggestion) => {
    if (currentRequestId === undefined) {
      return;
    }

    const event: SmartSuggestAcceptEvent = {
      acceptedAt: new Date().toISOString(),
      requestId: currentRequestId,
      source: suggestion.source,
      suggestionId: suggestion.id,
    };
    const accepted = postJson<{ accepted: true }>({
      apiBaseUrl,
      body: event,
      fetchImpl,
      path: "/v1/accept",
      timeoutMs,
    });
    accepted.catch((error: unknown) => reportError(config.onError, error));
  };

  const selectSuggestion = (suggestion: SmartSuggestSuggestion) => {
    const address = suggestion.address;
    clearDebounceTimer();
    activeSuggestController?.abort(createAbortReason());
    isApplyingSuggestion = true;
    try {
      setControlValue(controls.addressLine, buildAddressLine(suggestion, address));
    } finally {
      isApplyingSuggestion = false;
    }
    setControlValue(controls.city, address?.city);
    setControlValue(controls.postalCode, address?.postalCode);
    setControlValue(controls.country, address?.countryCode);
    acceptSuggestion(suggestion);

    if (currentRequestId !== undefined) {
      config.onSuggestionSelect?.({ requestId: currentRequestId, suggestion });
    }

    suggestionList?.render([], selectSuggestion);
  };

  const suggest = async (query = getControlValue(controls.addressLine)) => {
    const trimmedQuery = query.trim();
    const requestSequence = suggestSequence + 1;
    suggestSequence = requestSequence;

    if (activeSuggestController !== undefined) {
      activeSuggestController.abort(createAbortReason());
      activeSuggestController = undefined;
    }

    if (trimmedQuery.length < minQueryLength) {
      currentRequestId = undefined;
      suggestionList?.render([], selectSuggestion);
      return;
    }

    const requestController = new AbortController();
    activeSuggestController = requestController;

    try {
      const request: SmartSuggestRequest = {
        kind: "address",
        limit,
        query: trimmedQuery,
      };
      const countryCode = readCountryCode();

      if (config.language !== undefined) {
        request.language = config.language;
      }

      if (countryCode !== undefined) {
        request.countryCode = countryCode;
      }

      const response = await requestJson<SmartSuggestResponse>(
        fetchImpl,
        toSuggestUrl(apiBaseUrl, request),
        {
          headers: { accept: "application/json" },
          method: "GET",
          signal: requestController.signal,
        },
        timeoutMs,
      );

      if (requestController.signal.aborted || requestSequence !== suggestSequence) {
        return;
      }

      currentRequestId = response.requestId;
      suggestionList?.render(response.suggestions, selectSuggestion);
    } catch (error) {
      if (!isAbortError(error) && requestSequence === suggestSequence) {
        reportError(config.onError, error);
      }
    } finally {
      if (activeSuggestController === requestController) {
        activeSuggestController = undefined;
      }
    }
  };

  const validatePhone = async () => {
    const rawInput = getControlValue(controls.phone);
    const defaultCountry = readCountryCode();
    const validationSequence = phoneValidationSequence + 1;
    phoneValidationSequence = validationSequence;

    if (rawInput === "") {
      return;
    }

    try {
      const result = await postJson<SmartSuggestVanillaValidationResult>({
        apiBaseUrl,
        body: { defaultCountry, rawInput },
        fetchImpl,
        path: "/v1/validate/phone",
        timeoutMs,
      });

      if (
        validationSequence !== phoneValidationSequence ||
        rawInput !== getControlValue(controls.phone) ||
        defaultCountry !== readCountryCode()
      ) {
        return;
      }

      setControlValue(controls.phone, result.displayValue);
    } catch (error) {
      reportError(config.onError, error);
    }
  };

  const validatePostal = async () => {
    const rawInput = getControlValue(controls.postalCode);
    const countryCode = readCountryCode();
    const validationSequence = postalValidationSequence + 1;
    postalValidationSequence = validationSequence;

    if (rawInput === "" || countryCode === undefined) {
      return;
    }

    try {
      const result = await postJson<SmartSuggestVanillaValidationResult>({
        apiBaseUrl,
        body: { countryCode, rawInput },
        fetchImpl,
        path: "/v1/validate/postal",
        timeoutMs,
      });

      if (
        validationSequence !== postalValidationSequence ||
        rawInput !== getControlValue(controls.postalCode) ||
        countryCode !== readCountryCode()
      ) {
        return;
      }

      setControlValue(controls.postalCode, result.displayValue);
    } catch (error) {
      reportError(config.onError, error);
    }
  };

  const onAddressInput = () => {
    clearDebounceTimer();

    if (isApplyingSuggestion) {
      return;
    }

    debounceTimer = setTimeout(() => {
      const pending = suggest();
      pending.catch((error: unknown) => reportError(config.onError, error));
    }, debounceMs);
  };
  const onPhoneBlur = () => {
    const pending = validatePhone();
    pending.catch((error: unknown) => reportError(config.onError, error));
  };
  const onPostalBlur = () => {
    const pending = validatePostal();
    pending.catch((error: unknown) => reportError(config.onError, error));
  };

  controls.addressLine?.addEventListener("input", onAddressInput);
  controls.phone?.addEventListener("blur", onPhoneBlur);
  controls.postalCode?.addEventListener("blur", onPostalBlur);

  return {
    destroy: () => {
      clearDebounceTimer();
      phoneValidationSequence += 1;
      postalValidationSequence += 1;
      suggestSequence += 1;
      activeSuggestController?.abort(createAbortReason());
      controls.addressLine?.removeEventListener("input", onAddressInput);
      controls.phone?.removeEventListener("blur", onPhoneBlur);
      controls.postalCode?.removeEventListener("blur", onPostalBlur);
      suggestionList?.list.remove();
      controls.addressLine?.removeAttribute("aria-autocomplete");
      controls.addressLine?.removeAttribute("aria-expanded");
    },
    suggest,
    validatePhone,
    validatePostal,
  };
};

export const installSmartSuggestGlobal = (
  target: SmartSuggestVanillaWindow = window as SmartSuggestVanillaWindow,
): SmartSuggestVanillaGlobal => {
  const globalApi: SmartSuggestVanillaGlobal = {
    attach: attachSmartSuggest,
  };
  target.TechsioSmartSuggest = globalApi;
  return globalApi;
};
