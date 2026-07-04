import {
  createSmartSuggestEffectClient,
  type SmartSuggestEffectClient,
  type SmartSuggestFetch,
  type SmartSuggestRequestOptions,
} from "@techsio/smart-suggest-client";
import { SmartSuggestValidationErrorBodySchema } from "@techsio/smart-suggest-client/api";
import type {
  AddressParts,
  SmartSuggestAcceptEvent,
  SmartSuggestCountryCode,
  SmartSuggestRequest,
  SmartSuggestSuggestion,
} from "@techsio/smart-suggest-core";
import {
  DEFAULT_PHONE_VALIDATION_MODE,
  getPhoneInputHints,
  PHONE_VALIDATION_MODES,
  type PhoneValidationMode,
  type PhoneValidationRequest,
  validatePhoneNumberLite,
} from "@techsio/smart-suggest-validation/phone-lite";
import { Option, Schema } from "effect";
import { squash } from "effect/Cause";
import { type Effect, runCallback } from "effect/Effect";
import { isFailure } from "effect/Exit";

export type SmartSuggestVanillaFetch = SmartSuggestFetch;

type TextControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type SmartSuggestVanillaField = TextControl | null | string | undefined;
export type SmartSuggestVanillaSupportedCountries =
  | readonly SmartSuggestCountryCode[]
  | string
  | undefined;

export type SmartSuggestVanillaValidationResult = {
  displayValue?: string;
  errors?: readonly {
    code: string;
    field?: string;
    message: string;
  }[];
  isValid: boolean | "unknown";
};

export type SmartSuggestVanillaPhoneValidationMode = PhoneValidationMode;

export type SmartSuggestVanillaPhoneValidationRequest = PhoneValidationRequest;

export type SmartSuggestVanillaPhoneValidatorModule = {
  validatePhoneNumber: (
    request: SmartSuggestVanillaPhoneValidationRequest,
  ) => SmartSuggestVanillaValidationResult;
};

export type SmartSuggestVanillaPhoneValidatorLoader =
  () => Promise<SmartSuggestVanillaPhoneValidatorModule>;

export type SmartSuggestVanillaAddressSelection = {
  requestId: string;
  suggestion: SmartSuggestSuggestion;
};

export type SmartSuggestVanillaSuggestState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      countryCode?: SmartSuggestCountryCode;
      countryCodes: readonly SmartSuggestCountryCode[];
      reason: "country-scope";
      status: "blocked";
    }
  | { error: unknown; status: "error" }
  | {
      requestId: string;
      status: "success";
      suggestions: readonly SmartSuggestSuggestion[];
    };

export type SmartSuggestVanillaConfig = {
  addressLine?: SmartSuggestVanillaField;
  apiBaseUrl?: string;
  city?: SmartSuggestVanillaField;
  country?: SmartSuggestVanillaField;
  countryCode?: SmartSuggestCountryCode;
  countryCodes?: SmartSuggestVanillaSupportedCountries;
  debounceMs?: number;
  fetch?: SmartSuggestVanillaFetch;
  language?: string;
  limit?: number;
  minQueryLength?: number;
  onError?: (error: unknown) => void;
  onSuggestStateChange?: (state: SmartSuggestVanillaSuggestState) => void;
  onSuggestionSelect?: (selection: SmartSuggestVanillaAddressSelection) => void;
  optionClassName?: string;
  phone?: SmartSuggestVanillaField;
  phoneValidationMode?: SmartSuggestVanillaPhoneValidationMode;
  phoneValidatorLoader?: SmartSuggestVanillaPhoneValidatorLoader;
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
  phoneValidationModes: typeof PHONE_VALIDATION_MODES;
};

export type SmartSuggestVanillaWindow = Window & {
  TechsioSmartSuggest?: SmartSuggestVanillaGlobal;
};

const defaultFetch: SmartSuggestVanillaFetch = (input, init) => fetch(input, init);
const DEFAULT_SUGGEST_LIMIT = 20;

export const SMART_SUGGEST_PHONE_VALIDATION_MODES = PHONE_VALIDATION_MODES;

const runVanillaEffectAsPromise = <TResponse>(
  effect: Effect<TResponse, Error>,
): Promise<TResponse> =>
  new Promise<TResponse>((resolve, reject) => {
    runCallback(effect, {
      onExit: (result) => {
        if (isFailure(result)) {
          reject(squash(result.cause));
          return;
        }

        resolve(result.value);
      },
    });
  });

const detachVanillaEffect = (
  effect: Effect<unknown, Error>,
  onError?: (error: unknown) => void,
) => {
  runCallback(effect, {
    onExit: (result) => {
      if (isFailure(result)) {
        reportError(onError, squash(result.cause));
      }
    },
  });
};

const defaultPhoneValidatorLoader: SmartSuggestVanillaPhoneValidatorLoader = async () => {
  const validatorModule =
    (await import("@techsio/smart-suggest-validation/phone-strict")) as SmartSuggestVanillaPhoneValidatorModule;

  return validatorModule;
};

function missingPhoneValidator(): SmartSuggestVanillaPhoneValidatorModule | undefined {
  return;
}

const normalizeBaseUrl = (apiBaseUrl: string | undefined) => {
  const baseUrl = apiBaseUrl ?? "/api";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const isTextControl = (element: Element | null): element is TextControl =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement;

const resolveRoot = (root: SmartSuggestVanillaConfig["root"]) => {
  if (typeof root === "string") {
    return document.querySelector(root) ?? undefined;
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

const getControlForm = (control: TextControl | undefined) => control?.form ?? undefined;

const getSuggestQuerySignalLength = (value: string) => [...value.matchAll(/[\p{L}\p{N}]/gu)].length;

type SmartSuggestVanillaSuggestFieldKind = "address" | "place" | "postal";

const resolveSuggestKind = (
  query: string,
  fieldKind: SmartSuggestVanillaSuggestFieldKind,
): SmartSuggestRequest["kind"] => {
  if (fieldKind === "place") {
    return "place";
  }
  if (fieldKind === "postal") {
    return "postal";
  }

  const postalDigits = query.replaceAll(/\D/gu, "");
  const postalOnly = /^\s*\d[\d\s-]*\s*$/u.test(query);

  return postalOnly && postalDigits.length > 0 ? "postal" : "address";
};

const countryCodeListAttributeNames = [
  "data-smart-suggest-countries",
  "data-smart-suggest-country-codes",
  "data-supported-countries",
] as const;

const normalizeSupportedCountryCodes = (
  value: SmartSuggestVanillaSupportedCountries,
): readonly SmartSuggestCountryCode[] => {
  const rawValues =
    typeof value === "string" ? value.split(/[\s,;|]+/u) : Array.isArray(value) ? [...value] : [];

  return [
    ...new Set(
      rawValues
        .map((entry) => toCountryCode(String(entry)))
        .filter((entry): entry is SmartSuggestCountryCode => entry !== undefined),
    ),
  ];
};

const readSupportedCountryCodesAttribute = (element: Element | undefined) => {
  if (element === undefined) {
    return [];
  }

  for (const attributeName of countryCodeListAttributeNames) {
    const value = element.getAttribute(attributeName);

    if (value !== null) {
      return normalizeSupportedCountryCodes(value);
    }
  }

  return [];
};

const createPhoneValidationRequest = (
  rawInput: string,
  defaultCountry: SmartSuggestCountryCode | undefined,
) => {
  const request: SmartSuggestVanillaPhoneValidationRequest = { rawInput };

  if (defaultCountry !== undefined) {
    request.defaultCountry = defaultCountry;
  }

  return request;
};

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

type PopoverListElement = HTMLUListElement & {
  hidePopover?: () => void;
  showPopover?: () => void;
};

type ToggleStateEvent = Event & {
  newState?: "closed" | "open";
};

const restoreAttribute = (element: Element, name: string, value: string | null) => {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, value);
};

function noop() {
  return;
}

const noopAsync = async () => {
  return;
};

const createDisabledSmartSuggestInstance = (): SmartSuggestVanillaInstance => ({
  destroy: noop,
  suggest: noopAsync,
  validatePhone: noopAsync,
  validatePostal: noopAsync,
});

const configurePhoneInputSemantics = (control: TextControl | undefined) => {
  if (!(control instanceof HTMLInputElement)) {
    return noop;
  }
  const inputHints = getPhoneInputHints();

  const previousAttributes = new Map(
    ["autocomplete", "inputmode", "type"].map(
      (name) => [name, control.getAttribute(name)] as const,
    ),
  );

  control.setAttribute("type", inputHints.type);
  control.setAttribute("autocomplete", inputHints.autoComplete);
  control.setAttribute("inputmode", inputHints.inputMode);

  return () => {
    for (const [name, value] of previousAttributes) {
      restoreAttribute(control, name, value);
    }
  };
};

const clearControlValidation = (control: TextControl | undefined) => {
  control?.setCustomValidity("");
  control?.removeAttribute("aria-invalid");
};

const applyControlValidationResult = (
  control: TextControl | undefined,
  result: SmartSuggestVanillaValidationResult,
  fallbackMessage = "Enter a valid phone number.",
) => {
  if (control === undefined) {
    return;
  }

  if (result.isValid === false) {
    const message = result.errors?.[0]?.message ?? fallbackMessage;
    control.setCustomValidity(message);
    control.setAttribute("aria-invalid", "true");
    return;
  }

  clearControlValidation(control);
};

const reportBlockingValidationResult = (
  control: TextControl | undefined,
  result: SmartSuggestVanillaValidationResult | undefined,
  fallbackMessage: string,
) => {
  if (control === undefined) {
    return;
  }

  if (result === undefined) {
    control.setCustomValidity(fallbackMessage);
    control.setAttribute("aria-invalid", "true");
  } else if (result.isValid !== true) {
    const message = result.errors?.[0]?.message ?? fallbackMessage;
    control.setCustomValidity(message);
    control.setAttribute("aria-invalid", "true");
  }

  control.reportValidity();
};

const VanillaValidationErrorLikeSchema = Schema.Struct({
  _tag: Schema.optionalKey(Schema.String),
  message: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.Number),
});

const toPostalValidationResultFromError = (
  error: unknown,
  rawInput: string,
): SmartSuggestVanillaValidationResult | undefined => {
  const validationBody = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestValidationErrorBodySchema)(error),
  );

  if (validationBody !== undefined) {
    return {
      displayValue: rawInput,
      errors: validationBody.errors,
      isValid: false,
    };
  }

  const errorLike = Option.getOrUndefined(
    Schema.decodeUnknownOption(VanillaValidationErrorLikeSchema)(error),
  );
  if (errorLike === undefined) {
    return;
  }

  const isValidationError =
    errorLike.status === 422 ||
    errorLike._tag === "SmartSuggestValidationError" ||
    errorLike.name === "SmartSuggestValidationError";

  if (!isValidationError) {
    return;
  }

  const message = errorLike.message;

  if (message === undefined || message.trim().length === 0) {
    return;
  }

  return {
    displayValue: rawInput,
    errors: [
      {
        code: "validation-error",
        field: "postalCode",
        message,
      },
    ],
    isValid: false,
  };
};

const restoreStyleProperty = (
  element: HTMLElement,
  name: string,
  value: string,
  priority: string,
) => {
  if (value === "") {
    element.style.removeProperty(name);
    return;
  }

  element.style.setProperty(name, value, priority);
};

let suggestionListSequence = 0;

const getNextSuggestionListSequence = () => {
  suggestionListSequence += 1;
  return suggestionListSequence;
};

const createSuggestionList = (input: TextControl, optionClassName: string | undefined) => {
  const list = document.createElement("ul") as PopoverListElement;
  const listId =
    input.id.trim() === ""
      ? `smart-suggest-address-list-${getNextSuggestionListSequence()}`
      : `${input.id}-smart-suggest-list`;
  const anchorName = `--smart-suggest-address-${getNextSuggestionListSequence()}`;
  const previousAnchorName = input.style.getPropertyValue("anchor-name");
  const previousAnchorNamePriority = input.style.getPropertyPriority("anchor-name");
  const previousInputAttributes = new Map(
    ["aria-activedescendant", "aria-autocomplete", "aria-controls", "aria-expanded", "role"].map(
      (name) => [name, input.getAttribute(name)] as const,
    ),
  );

  let activeIndex = -1;
  let currentSuggestions: readonly SmartSuggestSuggestion[] = [];
  let currentSelect: ((suggestion: SmartSuggestSuggestion) => void) | undefined;
  let open = false;

  list.id = listId;
  list.hidden = true;
  list.setAttribute("role", "listbox");
  list.setAttribute("popover", "auto");
  list.setAttribute("data-smart-suggest-list", "");
  list.style.setProperty("position-anchor", anchorName);

  input.style.setProperty("anchor-name", anchorName);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");
  input.insertAdjacentElement("afterend", list);

  const readOptions = () =>
    Array.from(list.querySelectorAll<HTMLElement>("[data-smart-suggest-option]"));

  const setOpenState = (nextOpen: boolean) => {
    open = nextOpen;
    input.setAttribute("aria-expanded", String(nextOpen));

    if (!nextOpen) {
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
    }
  };

  const close = () => {
    if (open && typeof list.hidePopover === "function") {
      list.hidePopover();
    }

    list.hidden = true;
    setOpenState(false);
  };

  const openList = () => {
    list.hidden = false;

    if (!open && typeof list.showPopover === "function") {
      list.showPopover();
    }

    setOpenState(true);
  };

  const setActiveIndex = (nextIndex: number) => {
    const options = readOptions();

    if (options.length === 0) {
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }

    activeIndex = (nextIndex + options.length) % options.length;

    for (const [index, option] of options.entries()) {
      const selected = index === activeIndex;
      option.setAttribute("aria-selected", String(selected));

      if (selected) {
        input.setAttribute("aria-activedescendant", option.id);

        if (typeof option.scrollIntoView === "function") {
          option.scrollIntoView({ block: "nearest" });
        }
      }
    }
  };

  const selectActive = () => {
    const suggestion = currentSuggestions[activeIndex];

    if (suggestion === undefined || currentSelect === undefined) {
      return false;
    }

    currentSelect(suggestion);
    return true;
  };

  list.addEventListener("toggle", (event: Event) => {
    const { newState } = event as ToggleStateEvent;

    if (newState !== undefined) {
      setOpenState(newState === "open");
    }
  });

  const moveActiveOption = (event: KeyboardEvent, nextIndex: number) => {
    event.preventDefault();
    openList();
    setActiveIndex(nextIndex);
    return true;
  };

  const selectActiveFromKeyboard = (event: KeyboardEvent) => {
    if (!open) {
      return false;
    }

    const selected = selectActive();

    if (selected) {
      event.preventDefault();
    }

    return selected;
  };

  const closeFromKeyboard = (event: KeyboardEvent) => {
    if (!open) {
      return false;
    }

    event.preventDefault();
    close();
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (currentSuggestions.length === 0) {
      return false;
    }

    switch (event.key) {
      case "ArrowDown":
        return moveActiveOption(event, activeIndex < 0 ? 0 : activeIndex + 1);
      case "ArrowUp":
        return moveActiveOption(
          event,
          activeIndex < 0 ? currentSuggestions.length - 1 : activeIndex - 1,
        );
      case "Enter":
        return selectActiveFromKeyboard(event);
      case "Escape":
        return closeFromKeyboard(event);
      default:
        return false;
    }
  };

  return {
    close,
    destroy: () => {
      close();
      list.remove();
      restoreStyleProperty(input, "anchor-name", previousAnchorName, previousAnchorNamePriority);

      for (const [name, value] of previousInputAttributes) {
        restoreAttribute(input, name, value);
      }
    },
    handleKeyDown,
    list,
    render: (
      suggestions: readonly SmartSuggestSuggestion[],
      onSelect: (suggestion: SmartSuggestSuggestion) => void,
    ) => {
      currentSuggestions = suggestions;
      currentSelect = onSelect;
      activeIndex = -1;
      list.replaceChildren();
      input.removeAttribute("aria-activedescendant");

      if (suggestions.length === 0) {
        close();
        return;
      }

      for (const [index, suggestion] of suggestions.entries()) {
        const item = document.createElement("li");
        item.id = `${list.id}-option-${index}`;
        item.className = optionClassName ?? "";
        item.textContent = suggestion.displayLabel;
        item.setAttribute("aria-selected", "false");
        item.setAttribute("data-smart-suggest-option", "");
        item.setAttribute("role", "option");
        item.addEventListener("pointerdown", (event) => {
          event.preventDefault();
        });
        item.addEventListener("click", () => onSelect(suggestion));
        list.append(item);
      }

      openList();
    },
  };
};

type SmartSuggestVanillaSuggestTarget = {
  control: TextControl;
  countryCodes: readonly SmartSuggestCountryCode[];
  kind: SmartSuggestVanillaSuggestFieldKind;
  list: ReturnType<typeof createSuggestionList>;
};

export const attachSmartSuggest = (
  config: SmartSuggestVanillaConfig,
): SmartSuggestVanillaInstance => {
  const root = resolveRoot(config.root);

  if (root === undefined) {
    return createDisabledSmartSuggestInstance();
  }

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
  const limit = config.limit ?? DEFAULT_SUGGEST_LIMIT;
  const minQueryLength = config.minQueryLength ?? 1;
  const timeoutMs = config.timeoutMs ?? 3000;
  const smartSuggestClient: SmartSuggestEffectClient = createSmartSuggestEffectClient({
    apiBaseUrl,
    fetch: fetchImpl,
    timeoutMs,
  });
  const phoneValidationMode = config.phoneValidationMode ?? DEFAULT_PHONE_VALIDATION_MODE;
  const phoneValidatorLoader = config.phoneValidatorLoader ?? defaultPhoneValidatorLoader;
  const configuredCountryCodes = normalizeSupportedCountryCodes(config.countryCodes);
  const countryCodesForControl = (control: TextControl | undefined) => {
    const controlCountryCodes = readSupportedCountryCodesAttribute(control);

    if (controlCountryCodes.length > 0) {
      return controlCountryCodes;
    }

    const formCountryCodes = readSupportedCountryCodesAttribute(getControlForm(control));

    return formCountryCodes.length > 0 ? formCountryCodes : configuredCountryCodes;
  };
  const suggestTargets: SmartSuggestVanillaSuggestTarget[] = [
    controls.addressLine === undefined
      ? undefined
      : {
          control: controls.addressLine,
          countryCodes: countryCodesForControl(controls.addressLine),
          kind: "address" as const,
          list: createSuggestionList(controls.addressLine, config.optionClassName),
        },
    controls.city === undefined
      ? undefined
      : {
          control: controls.city,
          countryCodes: countryCodesForControl(controls.city),
          kind: "place" as const,
          list: createSuggestionList(controls.city, config.optionClassName),
        },
    controls.postalCode === undefined
      ? undefined
      : {
          control: controls.postalCode,
          countryCodes: countryCodesForControl(controls.postalCode),
          kind: "postal" as const,
          list: createSuggestionList(controls.postalCode, config.optionClassName),
        },
  ].filter((target): target is SmartSuggestVanillaSuggestTarget => target !== undefined);
  const addressSuggestTarget = suggestTargets.find((target) => target.kind === "address");
  const restorePhoneInputSemantics = configurePhoneInputSemantics(controls.phone);
  const phoneForm =
    controls.phone instanceof HTMLInputElement ? getControlForm(controls.phone) : undefined;
  const postalForm = getControlForm(controls.postalCode);
  const validationForms = [
    ...new Set([phoneForm, postalForm].filter((form) => form !== undefined)),
  ];

  let activePhoneValidationController: AbortController | undefined;
  let activePostalValidationController: AbortController | undefined;
  let activeSuggestController: AbortController | undefined;
  let currentRequestId: string | undefined;
  let currentSuggestTarget = addressSuggestTarget;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let didPhoneValidatorLoadFail = false;
  let isApplyingSuggestion = false;
  let submittingAfterValidationForm: HTMLFormElement | undefined;
  let phoneValidatorPromise:
    | Promise<SmartSuggestVanillaPhoneValidatorModule | undefined>
    | undefined;
  let phoneValidationSequence = 0;
  let postalValidationSequence = 0;
  let suggestInputSequence = 0;
  let suggestSequence = 0;

  const readCountryCode = () =>
    toCountryCode(getControlValue(controls.country)) ?? config.countryCode;
  const countryCodesForTarget = (target = currentSuggestTarget) =>
    target?.countryCodes.length === 0 ? configuredCountryCodes : (target?.countryCodes ?? []);
  const readRequestCountryScope = (target = currentSuggestTarget) => {
    const selectedCountryCode = readCountryCode();
    const countryCodes = countryCodesForTarget(target);

    if (selectedCountryCode !== undefined) {
      return countryCodes.length === 0 || countryCodes.includes(selectedCountryCode)
        ? { blocked: false, countryCode: selectedCountryCode, countryCodes }
        : { blocked: true, countryCode: selectedCountryCode, countryCodes };
    }

    if (countryCodes.length === 1) {
      return { blocked: false, countryCode: countryCodes[0], countryCodes };
    }

    return { blocked: false, countryCodes };
  };

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
    detachVanillaEffect(smartSuggestClient.accept(event), config.onError);
  };

  const selectSuggestion = (suggestion: SmartSuggestSuggestion, target = currentSuggestTarget) => {
    const address = suggestion.address;
    clearDebounceTimer();
    activeSuggestController?.abort(createAbortReason());
    isApplyingSuggestion = true;
    try {
      if (target?.kind === "address" && suggestion.kind === "address") {
        setControlValue(controls.addressLine, buildAddressLine(suggestion, address));
      }
      setControlValue(controls.city, address?.city);
      setControlValue(controls.postalCode, address?.postalCode);
      setControlValue(controls.country, address?.countryCode);
    } finally {
      isApplyingSuggestion = false;
    }
    acceptSuggestion(suggestion);

    if (currentRequestId !== undefined) {
      config.onSuggestionSelect?.({ requestId: currentRequestId, suggestion });
    }

    renderEmptySuggestionLists();
  };

  const renderEmptySuggestionLists = () => {
    for (const target of suggestTargets) {
      target.list.render([], (suggestion) => selectSuggestion(suggestion, target));
    }
  };

  const abortActiveSuggestRequest = () => {
    if (activeSuggestController === undefined) {
      return;
    }

    activeSuggestController.abort(createAbortReason());
    activeSuggestController = undefined;
  };

  const abortActivePhoneValidationRequest = () => {
    if (activePhoneValidationController === undefined) {
      return;
    }

    activePhoneValidationController.abort(createAbortReason());
    activePhoneValidationController = undefined;
  };

  const abortActivePostalValidationRequest = () => {
    if (activePostalValidationController === undefined) {
      return;
    }

    activePostalValidationController.abort(createAbortReason());
    activePostalValidationController = undefined;
  };

  const clearSuggestResults = () => {
    currentRequestId = undefined;
    renderEmptySuggestionLists();
    config.onSuggestStateChange?.({ status: "idle" });
  };

  const createSuggestRequest = (query: string, target = currentSuggestTarget) => {
    const { countryCode, countryCodes } = readRequestCountryScope(target);
    const request: SmartSuggestRequest = {
      kind: resolveSuggestKind(query, target?.kind ?? "address"),
      limit,
      query,
    };

    if (config.language !== undefined) {
      request.language = config.language;
    }

    if (countryCode !== undefined) {
      request.countryCode = countryCode;
    }
    if (countryCodes.length > 0) {
      request.countryCodes = countryCodes;
    }

    return request;
  };

  const shouldIgnoreSuggestResponse = (
    requestController: AbortController,
    requestSequence: number,
  ) => requestController.signal.aborted || requestSequence !== suggestSequence;

  const handleSuggestError = (error: unknown, requestSequence: number) => {
    if (isAbortError(error) || requestSequence !== suggestSequence) {
      return;
    }

    clearSuggestResults();
    config.onSuggestStateChange?.({ error, status: "error" });
    reportError(config.onError, error);
  };

  const suggest = async (
    query = getControlValue(addressSuggestTarget?.control),
    target = addressSuggestTarget,
  ) => {
    const trimmedQuery = query.trim();
    const requestSequence = suggestSequence + 1;
    suggestSequence = requestSequence;
    currentSuggestTarget = target;

    abortActiveSuggestRequest();

    const countryScope = readRequestCountryScope(target);

    if (countryScope.blocked) {
      currentRequestId = undefined;
      renderEmptySuggestionLists();
      const blockedState: SmartSuggestVanillaSuggestState = {
        countryCodes: countryScope.countryCodes,
        reason: "country-scope",
        status: "blocked",
      };

      if (countryScope.countryCode !== undefined) {
        blockedState.countryCode = countryScope.countryCode;
      }

      config.onSuggestStateChange?.(blockedState);
      return;
    }

    if (target === undefined || getSuggestQuerySignalLength(trimmedQuery) < minQueryLength) {
      clearSuggestResults();
      return;
    }

    const requestController = new AbortController();
    activeSuggestController = requestController;
    config.onSuggestStateChange?.({ status: "loading" });

    try {
      const response = await runVanillaEffectAsPromise(
        smartSuggestClient.suggest(createSuggestRequest(trimmedQuery, target), {
          signal: requestController.signal,
        }),
      );

      if (shouldIgnoreSuggestResponse(requestController, requestSequence)) {
        return;
      }

      currentRequestId = response.requestId;
      target.list.render(response.suggestions, (suggestion) =>
        selectSuggestion(suggestion, target),
      );
      config.onSuggestStateChange?.({
        requestId: response.requestId,
        status: "success",
        suggestions: response.suggestions,
      });
    } catch (error) {
      handleSuggestError(error, requestSequence);
    } finally {
      if (activeSuggestController === requestController) {
        activeSuggestController = undefined;
      }
    }
  };

  const beginPhoneValidatorLoad = () => {
    if (phoneValidationMode === "server-only" || didPhoneValidatorLoadFail) {
      return;
    }

    phoneValidatorPromise ??= phoneValidatorLoader().catch(() => {
      didPhoneValidatorLoadFail = true;
      phoneValidatorPromise = undefined;
      return missingPhoneValidator();
    });

    return phoneValidatorPromise;
  };

  if (phoneValidationMode === "frontend-immediate") {
    beginPhoneValidatorLoad();
  }

  const validatePhoneWithFrontend = async (request: SmartSuggestVanillaPhoneValidationRequest) => {
    if (phoneValidationMode === "server-only") {
      return;
    }

    const validatorModule = await beginPhoneValidatorLoad();

    return validatorModule?.validatePhoneNumber(request);
  };

  const validatePhoneInternal = async () => {
    const rawInput = getControlValue(controls.phone);
    const defaultCountry = readCountryCode();
    const validationSequence = phoneValidationSequence + 1;
    phoneValidationSequence = validationSequence;
    abortActivePhoneValidationRequest();

    if (rawInput === "") {
      clearControlValidation(controls.phone);
      return;
    }

    let requestController: AbortController | undefined;
    const shouldIgnorePhoneValidationResult = () =>
      requestController?.signal.aborted === true ||
      validationSequence !== phoneValidationSequence ||
      rawInput !== getControlValue(controls.phone) ||
      defaultCountry !== readCountryCode();

    try {
      const request = createPhoneValidationRequest(rawInput, defaultCountry);
      const liteResult = validatePhoneNumberLite(request);

      if (!liteResult.canAttemptStrictValidation) {
        applyControlValidationResult(controls.phone, {
          displayValue: liteResult.displayValue,
          errors: liteResult.errors,
          isValid: false,
        });
        return {
          displayValue: liteResult.displayValue,
          errors: liteResult.errors,
          isValid: false,
        };
      }

      const frontendResult =
        phoneValidationMode === "server-only"
          ? undefined
          : await validatePhoneWithFrontend(request);

      if (frontendResult === undefined && shouldIgnorePhoneValidationResult()) {
        return;
      }

      const result = frontendResult ?? (await (async () => {
        requestController = new AbortController();
        activePhoneValidationController = requestController;
        const requestOptions: SmartSuggestRequestOptions = {
          signal: requestController.signal,
        };

        return runVanillaEffectAsPromise(
          smartSuggestClient.validatePhone(request, requestOptions),
        );
      })());

      if (shouldIgnorePhoneValidationResult()) {
        return;
      }

      setControlValue(controls.phone, result.displayValue);
      applyControlValidationResult(controls.phone, result);
      return result;
    } catch (error) {
      if (isAbortError(error) || shouldIgnorePhoneValidationResult()) {
        return;
      }

      reportError(config.onError, error);
      return;
    } finally {
      if (
        requestController !== undefined &&
        activePhoneValidationController === requestController
      ) {
        activePhoneValidationController = undefined;
      }
    }
  };

  const validatePhone = async () => {
    await validatePhoneInternal();
  };

  const validatePostalInternal = async () => {
    const rawInput = getControlValue(controls.postalCode);
    const countryCode = readCountryCode();
    const validationSequence = postalValidationSequence + 1;
    postalValidationSequence = validationSequence;
    abortActivePostalValidationRequest();

    if (rawInput === "" || countryCode === undefined) {
      return;
    }

    const requestController = new AbortController();
    activePostalValidationController = requestController;
    const requestOptions: SmartSuggestRequestOptions = {
      signal: requestController.signal,
    };
    const shouldIgnorePostalValidationResult = () =>
      requestController.signal.aborted ||
      validationSequence !== postalValidationSequence ||
      rawInput !== getControlValue(controls.postalCode) ||
      countryCode !== readCountryCode();

    try {
      const result = await runVanillaEffectAsPromise(
        smartSuggestClient.validatePostal({ countryCode, rawInput }, requestOptions),
      );

      if (shouldIgnorePostalValidationResult()) {
        return;
      }

      setControlValue(controls.postalCode, result.displayValue);
      applyControlValidationResult(controls.postalCode, result, "Enter a valid postal code.");
      return result;
    } catch (error) {
      if (isAbortError(error) || shouldIgnorePostalValidationResult()) {
        return;
      }

      const result = toPostalValidationResultFromError(error, rawInput);

      if (result !== undefined) {
        applyControlValidationResult(controls.postalCode, result, "Enter a valid postal code.");
        reportError(config.onError, error);
        return result;
      }

      reportError(config.onError, error);
      return;
    } finally {
      if (activePostalValidationController === requestController) {
        activePostalValidationController = undefined;
      }
    }
  };

  const validatePostal = async () => {
    await validatePostalInternal();
  };

  const onSuggestTargetInput = (target: NonNullable<(typeof suggestTargets)[number]>) => {
    clearDebounceTimer();

    if (isApplyingSuggestion) {
      return;
    }

    const inputSequence = suggestInputSequence + 1;
    suggestInputSequence = inputSequence;

    debounceTimer = setTimeout(() => {
      if (inputSequence !== suggestInputSequence || isApplyingSuggestion) {
        return;
      }

      abortActiveSuggestRequest();
      clearSuggestResults();
      currentSuggestTarget = target;

      debounceTimer = setTimeout(() => {
        const pending = suggest(getControlValue(target.control), target);
        pending.catch((error: unknown) => reportError(config.onError, error));
      }, debounceMs);
    }, 0);
  };
  const onSuggestTargetKeyDown = (
    target: NonNullable<(typeof suggestTargets)[number]>,
    event: Event,
  ) => {
    if (event instanceof KeyboardEvent) {
      target.list.handleKeyDown(event);
    }
  };
  const onSuggestTargetBlur = (target: NonNullable<(typeof suggestTargets)[number]>) => {
    setTimeout(() => {
      target.list.close();
    }, 0);
  };
  const onPhoneBlur = () => {
    const pending = validatePhoneInternal();
    pending.catch((error: unknown) => reportError(config.onError, error));
  };
  const onPhoneFocus = () => {
    beginPhoneValidatorLoad();
  };
  const onPhoneInput = () => {
    phoneValidationSequence += 1;
    clearControlValidation(controls.phone);
    beginPhoneValidatorLoad();
  };
  const submitFormAfterValidation = (
    form: HTMLFormElement,
    submitter: SubmitEvent["submitter"] | undefined,
  ) => {
    submittingAfterValidationForm = form;

    if (typeof form.requestSubmit === "function") {
      if (
        submitter instanceof HTMLElement &&
        (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)
      ) {
        form.requestSubmit(submitter);
        return;
      }

      form.requestSubmit();
      return;
    }

    form.submit();
  };

  const onValidationFormSubmit = (event: Event) => {
    const form = event.currentTarget;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (submittingAfterValidationForm === form) {
      submittingAfterValidationForm = undefined;
      return;
    }

    const shouldValidatePhone =
      phoneForm === form && controls.phone !== undefined && getControlValue(controls.phone) !== "";
    const shouldValidatePostal =
      postalForm === form &&
      controls.postalCode !== undefined &&
      getControlValue(controls.postalCode) !== "" &&
      readCountryCode() !== undefined;

    if (!shouldValidatePhone && !shouldValidatePostal) {
      return;
    }

    event.preventDefault();

    const submitter = event instanceof SubmitEvent ? event.submitter : undefined;
    const pending = Promise.all([
      shouldValidatePhone ? validatePhoneInternal() : Promise.resolve(undefined),
      shouldValidatePostal ? validatePostalInternal() : Promise.resolve(undefined),
    ]);

    pending
      .then(([phoneResult, postalResult]) => {
        if (shouldValidatePhone && phoneResult?.isValid !== true) {
          reportBlockingValidationResult(
            controls.phone,
            phoneResult,
            "Phone validation is unavailable. Try again.",
          );
          return;
        }

        if (shouldValidatePostal && postalResult?.isValid !== true) {
          reportBlockingValidationResult(
            controls.postalCode,
            postalResult,
            "Postal validation is unavailable. Try again.",
          );
          return;
        }

        submitFormAfterValidation(form, submitter);
      })
      .catch((error: unknown) => reportError(config.onError, error));
  };
  const onPostalBlur = () => {
    const pending = validatePostal();
    pending.catch((error: unknown) => reportError(config.onError, error));
  };
  const onPostalInput = () => {
    postalValidationSequence += 1;
    clearControlValidation(controls.postalCode);
  };

  const suggestTargetListeners = suggestTargets.map((target) => ({
    target,
    onBlur: () => onSuggestTargetBlur(target),
    onInput: () => onSuggestTargetInput(target),
    onKeyDown: (event: Event) => onSuggestTargetKeyDown(target, event),
  }));

  for (const listener of suggestTargetListeners) {
    listener.target.control.addEventListener("input", listener.onInput);
    listener.target.control.addEventListener("keydown", listener.onKeyDown);
    listener.target.control.addEventListener("blur", listener.onBlur);
  }
  controls.phone?.addEventListener("blur", onPhoneBlur);
  controls.phone?.addEventListener("focus", onPhoneFocus);
  controls.phone?.addEventListener("input", onPhoneInput);
  for (const form of validationForms) {
    form.addEventListener("submit", onValidationFormSubmit);
  }
  controls.postalCode?.addEventListener("blur", onPostalBlur);
  controls.postalCode?.addEventListener("input", onPostalInput);

  return {
    destroy: () => {
      clearDebounceTimer();
      phoneValidationSequence += 1;
      postalValidationSequence += 1;
      suggestSequence += 1;
      abortActivePhoneValidationRequest();
      abortActivePostalValidationRequest();
      activeSuggestController?.abort(createAbortReason());
      for (const listener of suggestTargetListeners) {
        listener.target.control.removeEventListener("input", listener.onInput);
        listener.target.control.removeEventListener("keydown", listener.onKeyDown);
        listener.target.control.removeEventListener("blur", listener.onBlur);
      }
      controls.phone?.removeEventListener("blur", onPhoneBlur);
      controls.phone?.removeEventListener("focus", onPhoneFocus);
      controls.phone?.removeEventListener("input", onPhoneInput);
      for (const form of validationForms) {
        form.removeEventListener("submit", onValidationFormSubmit);
      }
      controls.postalCode?.removeEventListener("blur", onPostalBlur);
      controls.postalCode?.removeEventListener("input", onPostalInput);
      for (const target of suggestTargets) {
        target.list.destroy();
      }
      restorePhoneInputSemantics();
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
    phoneValidationModes: SMART_SUGGEST_PHONE_VALIDATION_MODES,
  };
  target.TechsioSmartSuggest = globalApi;
  return globalApi;
};
