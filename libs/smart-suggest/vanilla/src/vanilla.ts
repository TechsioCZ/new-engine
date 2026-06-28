import {
  createSmartSuggestEffectClient,
  type SmartSuggestEffectClient,
  type SmartSuggestFetch,
} from '@techsio/smart-suggest-client';
import type {
  AddressParts,
  SmartSuggestAcceptEvent,
  SmartSuggestCountryCode,
  SmartSuggestRequest,
  SmartSuggestSuggestion,
} from '@techsio/smart-suggest-core';
import {
  DEFAULT_PHONE_VALIDATION_MODE,
  getPhoneInputHints,
  PHONE_VALIDATION_MODES,
  type PhoneValidationMode,
  type PhoneValidationRequest,
  validatePhoneNumberLite,
} from '@techsio/smart-suggest-validation/phone-lite';
import { squash } from 'effect/Cause';
import { type Effect, runCallback } from 'effect/Effect';
import { isFailure } from 'effect/Exit';

export type SmartSuggestVanillaFetch = SmartSuggestFetch;

type TextControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type SmartSuggestVanillaField = TextControl | null | string | undefined;

export type SmartSuggestVanillaValidationResult = {
  displayValue?: string;
  errors?: readonly {
    code: string;
    field?: string;
    message: string;
  }[];
  isValid: boolean | 'unknown';
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

const detachVanillaEffect = (effect: Effect<unknown, Error>, onError?: (error: unknown) => void) => {
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
    (await import('@techsio/smart-suggest-validation/phone-strict')) as SmartSuggestVanillaPhoneValidatorModule;

  return validatorModule;
};

function missingPhoneValidator(): SmartSuggestVanillaPhoneValidatorModule | undefined {
  return;
}

const normalizeBaseUrl = (apiBaseUrl: string | undefined) => {
  const baseUrl = apiBaseUrl ?? '/api';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const isTextControl = (element: Element | null): element is TextControl =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement;

const resolveRoot = (root: SmartSuggestVanillaConfig['root']) => {
  if (typeof root === 'string') {
    return document.querySelector(root) ?? document;
  }

  return root ?? document;
};

const resolveField = (root: Document | Element, field: SmartSuggestVanillaField) => {
  if (typeof field === 'string') {
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
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
};

const getControlValue = (control: TextControl | undefined) => control?.value.trim() ?? '';

const getSuggestQuerySignalLength = (value: string) => [...value.matchAll(/[\p{L}\p{N}]/gu)].length;

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
  return normalized === '' || normalized === undefined
    ? undefined
    : (normalized as SmartSuggestCountryCode);
};

const buildAddressLine = (
  suggestion: SmartSuggestSuggestion,
  address: AddressParts | undefined,
) => {
  if (address?.line1 !== undefined && address.line1.trim() !== '') {
    return address.line1;
  }

  const houseNumber = [address?.houseNumber, address?.orientationNumber]
    .filter((value) => value !== undefined && value.trim() !== '')
    .join('/');
  const streetLine = [address?.street, houseNumber]
    .filter((value) => value !== undefined && value.trim() !== '')
    .join(' ');

  return streetLine === '' ? suggestion.displayLabel : streetLine;
};

const reportError = (onError: SmartSuggestVanillaConfig['onError'], error: unknown) => {
  onError?.(error);
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const createAbortReason = () =>
  new DOMException('Smart Suggest request was superseded.', 'AbortError');

type PopoverListElement = HTMLUListElement & {
  hidePopover?: () => void;
  showPopover?: () => void;
};

type ToggleStateEvent = Event & {
  newState?: 'closed' | 'open';
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

const configurePhoneInputSemantics = (control: TextControl | undefined) => {
  if (!(control instanceof HTMLInputElement)) {
    return noop;
  }
  const inputHints = getPhoneInputHints();

  const previousAttributes = new Map(
    ['autocomplete', 'inputmode', 'type'].map(
      (name) => [name, control.getAttribute(name)] as const,
    ),
  );

  control.setAttribute('type', inputHints.type);
  control.setAttribute('autocomplete', inputHints.autoComplete);
  control.setAttribute('inputmode', inputHints.inputMode);

  return () => {
    for (const [name, value] of previousAttributes) {
      restoreAttribute(control, name, value);
    }
  };
};

const clearControlValidation = (control: TextControl | undefined) => {
  control?.setCustomValidity('');
  control?.removeAttribute('aria-invalid');
};

const applyControlValidationResult = (
  control: TextControl | undefined,
  result: SmartSuggestVanillaValidationResult,
) => {
  if (control === undefined) {
    return;
  }

  if (result.isValid === false) {
    const message = result.errors?.[0]?.message ?? 'Enter a valid phone number.';
    control.setCustomValidity(message);
    control.setAttribute('aria-invalid', 'true');
    return;
  }

  clearControlValidation(control);
};

const restoreStyleProperty = (
  element: HTMLElement,
  name: string,
  value: string,
  priority: string,
) => {
  if (value === '') {
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
  const list = document.createElement('ul') as PopoverListElement;
  const listId =
    input.id.trim() === ''
      ? `smart-suggest-address-list-${getNextSuggestionListSequence()}`
      : `${input.id}-smart-suggest-list`;
  const anchorName = `--smart-suggest-address-${getNextSuggestionListSequence()}`;
  const previousAnchorName = input.style.getPropertyValue('anchor-name');
  const previousAnchorNamePriority = input.style.getPropertyPriority('anchor-name');
  const previousInputAttributes = new Map(
    ['aria-activedescendant', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'role'].map(
      (name) => [name, input.getAttribute(name)] as const,
    ),
  );

  let activeIndex = -1;
  let currentSuggestions: readonly SmartSuggestSuggestion[] = [];
  let currentSelect: ((suggestion: SmartSuggestSuggestion) => void) | undefined;
  let open = false;

  list.id = listId;
  list.hidden = true;
  list.setAttribute('role', 'listbox');
  list.setAttribute('popover', 'auto');
  list.setAttribute('data-smart-suggest-list', '');
  list.style.setProperty('position-anchor', anchorName);

  input.style.setProperty('anchor-name', anchorName);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('aria-expanded', 'false');
  input.insertAdjacentElement('afterend', list);

  const readOptions = () =>
    Array.from(list.querySelectorAll<HTMLElement>('[data-smart-suggest-option]'));

  const setOpenState = (nextOpen: boolean) => {
    open = nextOpen;
    input.setAttribute('aria-expanded', String(nextOpen));

    if (!nextOpen) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
    }
  };

  const close = () => {
    if (open && typeof list.hidePopover === 'function') {
      list.hidePopover();
    }

    list.hidden = true;
    setOpenState(false);
  };

  const openList = () => {
    list.hidden = false;

    if (!open && typeof list.showPopover === 'function') {
      list.showPopover();
    }

    setOpenState(true);
  };

  const setActiveIndex = (nextIndex: number) => {
    const options = readOptions();

    if (options.length === 0) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = (nextIndex + options.length) % options.length;

    for (const [index, option] of options.entries()) {
      const selected = index === activeIndex;
      option.setAttribute('aria-selected', String(selected));

      if (selected) {
        input.setAttribute('aria-activedescendant', option.id);

        if (typeof option.scrollIntoView === 'function') {
          option.scrollIntoView({ block: 'nearest' });
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

  list.addEventListener('toggle', (event: Event) => {
    const { newState } = event as ToggleStateEvent;

    if (newState !== undefined) {
      setOpenState(newState === 'open');
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
      case 'ArrowDown':
        return moveActiveOption(event, activeIndex < 0 ? 0 : activeIndex + 1);
      case 'ArrowUp':
        return moveActiveOption(
          event,
          activeIndex < 0 ? currentSuggestions.length - 1 : activeIndex - 1,
        );
      case 'Enter':
        return selectActiveFromKeyboard(event);
      case 'Escape':
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
      restoreStyleProperty(input, 'anchor-name', previousAnchorName, previousAnchorNamePriority);

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
      input.removeAttribute('aria-activedescendant');

      if (suggestions.length === 0) {
        close();
        return;
      }

      for (const [index, suggestion] of suggestions.entries()) {
        const item = document.createElement('li');
        item.id = `${list.id}-option-${index}`;
        item.className = optionClassName ?? '';
        item.textContent = suggestion.displayLabel;
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('data-smart-suggest-option', '');
        item.setAttribute('role', 'option');
        item.addEventListener('pointerdown', (event) => {
          event.preventDefault();
        });
        item.addEventListener('click', () => onSelect(suggestion));
        list.append(item);
      }

      openList();
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
  const limit = config.limit ?? DEFAULT_SUGGEST_LIMIT;
  const minQueryLength = config.minQueryLength ?? 3;
  const timeoutMs = config.timeoutMs ?? 3000;
  const smartSuggestClient: SmartSuggestEffectClient = createSmartSuggestEffectClient({
    apiBaseUrl,
    fetch: fetchImpl,
    timeoutMs,
  });
  const phoneValidationMode = config.phoneValidationMode ?? DEFAULT_PHONE_VALIDATION_MODE;
  const phoneValidatorLoader = config.phoneValidatorLoader ?? defaultPhoneValidatorLoader;
  const suggestionList =
    controls.addressLine === undefined
      ? undefined
      : createSuggestionList(controls.addressLine, config.optionClassName);
  const restorePhoneInputSemantics = configurePhoneInputSemantics(controls.phone);
  const phoneForm = controls.phone instanceof HTMLInputElement ? controls.phone.form : undefined;

  let activeSuggestController: AbortController | undefined;
  let currentRequestId: string | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let didPhoneValidatorLoadFail = false;
  let isApplyingSuggestion = false;
  let isSubmittingAfterPhoneValidation = false;
  let phoneValidatorPromise:
    | Promise<SmartSuggestVanillaPhoneValidatorModule | undefined>
    | undefined;
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
    detachVanillaEffect(smartSuggestClient.accept(event), config.onError);
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

  const abortActiveSuggestRequest = () => {
    if (activeSuggestController === undefined) {
      return;
    }

    activeSuggestController.abort(createAbortReason());
    activeSuggestController = undefined;
  };

  const clearSuggestResults = () => {
    currentRequestId = undefined;
    suggestionList?.render([], selectSuggestion);
  };

  const createSuggestRequest = (query: string) => {
    const request: SmartSuggestRequest = {
      kind: 'address',
      limit,
      query,
    };
    const countryCode = readCountryCode();

    if (config.language !== undefined) {
      request.language = config.language;
    }

    if (countryCode !== undefined) {
      request.countryCode = countryCode;
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
    reportError(config.onError, error);
  };

  const suggest = async (query = getControlValue(controls.addressLine)) => {
    const trimmedQuery = query.trim();
    const requestSequence = suggestSequence + 1;
    suggestSequence = requestSequence;

    abortActiveSuggestRequest();

    if (getSuggestQuerySignalLength(trimmedQuery) < minQueryLength) {
      clearSuggestResults();
      return;
    }

    const requestController = new AbortController();
    activeSuggestController = requestController;

    try {
      const response = await runVanillaEffectAsPromise(
        smartSuggestClient.suggest(createSuggestRequest(trimmedQuery), {
          signal: requestController.signal,
        }),
      );

      if (shouldIgnoreSuggestResponse(requestController, requestSequence)) {
        return;
      }

      currentRequestId = response.requestId;
      suggestionList?.render(response.suggestions, selectSuggestion);
    } catch (error) {
      handleSuggestError(error, requestSequence);
    } finally {
      if (activeSuggestController === requestController) {
        activeSuggestController = undefined;
      }
    }
  };

  const beginPhoneValidatorLoad = () => {
    if (phoneValidationMode === 'server-only' || didPhoneValidatorLoadFail) {
      return;
    }

    phoneValidatorPromise ??= phoneValidatorLoader().catch(() => {
      didPhoneValidatorLoadFail = true;
      phoneValidatorPromise = undefined;
      return missingPhoneValidator();
    });

    return phoneValidatorPromise;
  };

  if (phoneValidationMode === 'frontend-immediate') {
    beginPhoneValidatorLoad();
  }

  const validatePhoneWithFrontend = async (request: SmartSuggestVanillaPhoneValidationRequest) => {
    if (phoneValidationMode === 'server-only') {
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

    if (rawInput === '') {
      clearControlValidation(controls.phone);
      return;
    }

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

      const result =
        (phoneValidationMode === 'server-only'
          ? undefined
          : await validatePhoneWithFrontend(request)) ??
        (await runVanillaEffectAsPromise(smartSuggestClient.validatePhone(request)));

      if (
        validationSequence !== phoneValidationSequence ||
        rawInput !== getControlValue(controls.phone) ||
        defaultCountry !== readCountryCode()
      ) {
        return;
      }

      setControlValue(controls.phone, result.displayValue);
      applyControlValidationResult(controls.phone, result);
      return result;
    } catch (error) {
      reportError(config.onError, error);
      return;
    }
  };

  const validatePhone = async () => {
    await validatePhoneInternal();
  };

  const validatePostal = async () => {
    const rawInput = getControlValue(controls.postalCode);
    const countryCode = readCountryCode();
    const validationSequence = postalValidationSequence + 1;
    postalValidationSequence = validationSequence;

    if (rawInput === '' || countryCode === undefined) {
      return;
    }

    try {
      const result = await runVanillaEffectAsPromise(
        smartSuggestClient.validatePostal({ countryCode, rawInput }),
      );

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
  const onAddressKeyDown = (event: Event) => {
    if (event instanceof KeyboardEvent) {
      suggestionList?.handleKeyDown(event);
    }
  };
  const onAddressBlur = () => {
    setTimeout(() => {
      suggestionList?.close();
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
  const onPhoneFormSubmit = (event: Event) => {
    if (isSubmittingAfterPhoneValidation) {
      isSubmittingAfterPhoneValidation = false;
      return;
    }

    if (controls.phone === undefined || getControlValue(controls.phone) === '') {
      return;
    }

    event.preventDefault();

    const submitter = 'submitter' in event ? event.submitter : undefined;
    const pending = validatePhoneInternal();

    pending
      .then((result) => {
        if (result?.isValid === false) {
          controls.phone?.reportValidity();
          return;
        }

        isSubmittingAfterPhoneValidation = true;

        if (typeof phoneForm?.requestSubmit === 'function') {
          if (
            submitter instanceof HTMLElement &&
            (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)
          ) {
            phoneForm.requestSubmit(submitter);
            return;
          }

          phoneForm.requestSubmit();
          return;
        }

        phoneForm?.submit();
      })
      .catch((error: unknown) => reportError(config.onError, error));
  };
  const onPostalBlur = () => {
    const pending = validatePostal();
    pending.catch((error: unknown) => reportError(config.onError, error));
  };

  controls.addressLine?.addEventListener('input', onAddressInput);
  controls.addressLine?.addEventListener('keydown', onAddressKeyDown);
  controls.addressLine?.addEventListener('blur', onAddressBlur);
  controls.phone?.addEventListener('blur', onPhoneBlur);
  controls.phone?.addEventListener('focus', onPhoneFocus);
  controls.phone?.addEventListener('input', onPhoneInput);
  phoneForm?.addEventListener('submit', onPhoneFormSubmit);
  controls.postalCode?.addEventListener('blur', onPostalBlur);

  return {
    destroy: () => {
      clearDebounceTimer();
      phoneValidationSequence += 1;
      postalValidationSequence += 1;
      suggestSequence += 1;
      activeSuggestController?.abort(createAbortReason());
      controls.addressLine?.removeEventListener('input', onAddressInput);
      controls.addressLine?.removeEventListener('keydown', onAddressKeyDown);
      controls.addressLine?.removeEventListener('blur', onAddressBlur);
      controls.phone?.removeEventListener('blur', onPhoneBlur);
      controls.phone?.removeEventListener('focus', onPhoneFocus);
      controls.phone?.removeEventListener('input', onPhoneInput);
      phoneForm?.removeEventListener('submit', onPhoneFormSubmit);
      controls.postalCode?.removeEventListener('blur', onPostalBlur);
      restorePhoneInputSemantics();
      suggestionList?.destroy();
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
