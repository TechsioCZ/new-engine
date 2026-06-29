import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  attachSmartSuggest,
  installSmartSuggestGlobal,
  type SmartSuggestVanillaFetch,
  type SmartSuggestVanillaPhoneValidatorLoader,
  type SmartSuggestVanillaWindow,
} from '../src/vanilla';

const SMART_SUGGEST_ADDRESS_ANCHOR_PATTERN = /^--smart-suggest-address-/u;
const TOP_LEVEL_VALIDATION_IMPORT_PATTERN = new RegExp(
  '@techsio/smart-suggest-' + 'validation["\']',
  'u',
);
const LIBPHONENUMBER_IMPORT_PATTERN = new RegExp('libphone' + 'number-js', 'u');

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const responseInit: ResponseInit = {
    headers: { 'content-type': 'application/json' },
    status: init?.status ?? 200,
  };

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText;
  }

  return new Response(JSON.stringify(body), responseInit);
};

const validPhoneResponse = (rawInput = '+420777123456') => ({
  callingCode: '420',
  detectedCountry: 'CZ',
  displayValue: '+420 777 123 456',
  e164: '+420777123456',
  errors: [],
  isPossible: true,
  isValid: true,
  nationalNumber: '777123456',
  rawInput,
  type: 'MOBILE',
});

const validPostalResponse = (rawInput = '12345') => ({
  countryCode: 'CZ',
  displayValue: '123 45',
  errors: [],
  inputHints: { autoComplete: 'postal-code', inputMode: 'numeric' },
  isValid: true,
  normalizedValue: '12345',
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

  throw lastError ?? new Error('Timed out waiting for assertion.');
};

const addInput = (id: string, value = '') => {
  const input = document.createElement('input');
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
  Reflect.deleteProperty(smartSuggestWindow(), 'TechsioSmartSuggest');
});

describe('attachSmartSuggest', () => {
  it('renders address suggestions, fills fields, and records accept telemetry', async () => {
    const address = addInput('address', 'Vaclav');
    const city = addInput('city');
    const postalCode = addInput('postal-code');
    const country = addInput('country', 'CZ');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.includes('/v1/suggest')) {
        return Promise.resolve(
          jsonResponse({
            cacheStatus: 'miss',
            requestId: 'request-1',
            suggestions: [
              {
                address: {
                  city: 'Praha',
                  countryCode: 'CZ',
                  houseNumber: '832',
                  orientationNumber: '19',
                  postalCode: '110 00',
                  street: 'Václavské náměstí',
                },
                confidence: 0.95,
                displayLabel: 'Václavské náměstí 832/19, 110 00 Praha',
                id: 'cz-ruian-vaclavske',
                kind: 'address',
                source: {
                  id: 'ruian-cz',
                  kind: 'owned-dataset',
                  name: 'RUIAN',
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
      apiBaseUrl: '/smart-api',
      city,
      country,
      debounceMs: 0,
      fetch: fetchMock,
      onSuggestionSelect: selected,
      postalCode,
    });
    address.dispatchEvent(new Event('input', { bubbles: true }));

    const option = await waitFor(() => {
      const listOption = document.querySelector('[role="option"]');
      expect(listOption).toBeInstanceOf(HTMLElement);
      return listOption as HTMLElement;
    });
    option.click();

    expect(address.value).toBe('Václavské náměstí 832/19');
    expect(city.value).toBe('Praha');
    expect(postalCode.value).toBe('110 00');
    expect(country.value).toBe('CZ');
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-1' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/smart-api/v1/accept',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await nextTick();
    expect(
      fetchMock.mock.calls.filter(([input]) => String(input).includes('/v1/suggest')),
    ).toHaveLength(1);
    expect(
      new URL(
        String(fetchMock.mock.calls.find(([input]) => String(input).includes('/v1/suggest'))?.[0]),
        'https://shop.example',
      ).searchParams.get('limit'),
    ).toBe('20');
  });

  it('ignores stale suggestion responses when fetch ignores abort signals', async () => {
    const address = addInput('address');
    const pendingSuggestResponses: Array<{
      input: RequestInfo | URL;
      resolve: (response: Response) => void;
    }> = [];
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      if (String(input).includes('/v1/suggest')) {
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

    const firstSuggest = instance.suggest('Praha');
    const secondSuggest = instance.suggest('Brno');

    expect(pendingSuggestResponses).toHaveLength(2);
    pendingSuggestResponses[1]?.resolve(
      jsonResponse({
        cacheStatus: 'miss',
        requestId: 'request-brno',
        suggestions: [
          {
            confidence: 0.9,
            displayLabel: 'Brno, Czechia',
            id: 'brno',
            kind: 'address',
            source: { id: 'ruian-cz', kind: 'owned-dataset', name: 'RUIAN' },
          },
        ],
      }),
    );
    await secondSuggest;

    expect(document.querySelector('[role="option"]')?.textContent).toBe('Brno, Czechia');

    pendingSuggestResponses[0]?.resolve(
      jsonResponse({
        cacheStatus: 'miss',
        requestId: 'request-praha',
        suggestions: [
          {
            confidence: 0.9,
            displayLabel: 'Praha, Czechia',
            id: 'praha',
            kind: 'address',
            source: { id: 'ruian-cz', kind: 'owned-dataset', name: 'RUIAN' },
          },
        ],
      }),
    );
    await firstSuggest;

    expect(document.querySelector('[role="option"]')?.textContent).toBe('Brno, Czechia');
  });

  it('clears stale suggestions when the latest lookup fails', async () => {
    const address = addInput('address');
    const onError = vi.fn();
    let shouldFail = false;
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() => {
      if (shouldFail) {
        return Promise.reject(new Error('network offline'));
      }

      return Promise.resolve(
        jsonResponse({
          cacheStatus: 'miss',
          requestId: 'request-first',
          suggestions: [
            {
              confidence: 0.9,
              displayLabel: 'Praha, Czechia',
              id: 'praha',
              kind: 'address',
              source: { id: 'ruian-cz', kind: 'owned-dataset', name: 'RUIAN' },
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

    await instance.suggest('Praha');
    expect(document.querySelector('[role="option"]')?.textContent).toBe('Praha, Czechia');

    shouldFail = true;
    await instance.suggest('Brno');

    expect(document.querySelector('[role="option"]')).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not request address suggestions for whitespace-padded weak query signals', async () => {
    const address = addInput('address');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          cacheStatus: 'miss',
          requestId: 'request-weak',
          suggestions: [],
        }),
      ),
    );
    const instance = attachSmartSuggest({
      addressLine: address,
      fetch: fetchMock,
      minQueryLength: 3,
    });

    await instance.suggest('K L');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(address.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses an anchored popover combobox and supports keyboard selection', async () => {
    const address = addInput('address');
    const city = addInput('city');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          cacheStatus: 'miss',
          requestId: 'request-keyboard',
          suggestions: [
            {
              address: {
                city: 'Praha',
                countryCode: 'CZ',
                houseNumber: '1312',
                orientationNumber: '1',
                postalCode: '101 00',
                street: 'K louži',
              },
              confidence: 0.95,
              displayLabel: 'K louži 1312/1, Vršovice, 10100 Praha 10',
              id: 'k-louzi-1312-1',
              kind: 'address',
              source: {
                id: 'ruian-geocode',
                kind: 'live-provider',
                name: 'RÚIAN geocoder',
              },
            },
            {
              address: {
                city: 'Praha',
                countryCode: 'CZ',
                houseNumber: '1258',
                orientationNumber: '12',
                postalCode: '101 00',
                street: 'K louži',
              },
              confidence: 0.95,
              displayLabel: 'K louži 1258/12, Vršovice, 10100 Praha 10',
              id: 'k-louzi-1258-12',
              kind: 'address',
              source: {
                id: 'ruian-geocode',
                kind: 'live-provider',
                name: 'RÚIAN geocoder',
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

    await instance.suggest('K Louži');

    const list = document.querySelector('[data-smart-suggest-list]');
    expect(list).toBeInstanceOf(HTMLUListElement);
    expect(address.getAttribute('role')).toBe('combobox');
    expect(address.getAttribute('aria-autocomplete')).toBe('list');
    expect(address.getAttribute('aria-controls')).toBe((list as HTMLUListElement).id);
    expect(address.getAttribute('aria-expanded')).toBe('true');
    expect(address.style.getPropertyValue('anchor-name')).toMatch(
      SMART_SUGGEST_ADDRESS_ANCHOR_PATTERN,
    );
    expect((list as HTMLUListElement).getAttribute('popover')).toBe('auto');
    expect((list as HTMLUListElement).hidden).toBe(false);
    expect((list as HTMLUListElement).style.getPropertyValue('position-anchor')).toBe(
      address.style.getPropertyValue('anchor-name'),
    );

    const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options.map((option) => option.textContent)).toEqual([
      'K louži 1312/1, Vršovice, 10100 Praha 10',
      'K louži 1258/12, Vršovice, 10100 Praha 10',
    ]);

    address.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowDown',
      }),
    );
    expect(address.getAttribute('aria-activedescendant')).toBe(options[0]?.id);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');

    address.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowDown',
      }),
    );
    expect(address.getAttribute('aria-activedescendant')).toBe(options[1]?.id);
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');

    address.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
      }),
    );

    expect(address.value).toBe('K louži 1258/12');
    expect(city.value).toBe('Praha');
    expect(address.getAttribute('aria-expanded')).toBe('false');
    expect((list as HTMLUListElement).hidden).toBe(true);

    instance.destroy();

    expect(document.querySelector('[data-smart-suggest-list]')).toBeNull();
    expect(address.getAttribute('role')).toBeNull();
    expect(address.getAttribute('aria-controls')).toBeNull();
    expect(address.style.getPropertyValue('anchor-name')).toBe('');
  });

  it('normalizes phone and postal fields on blur without blocking the form', async () => {
    const phone = addInput('phone', '+420777123456');
    const postalCode = addInput('postal-code', '12345');
    const country = addInput('country', 'CZ');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input);

      if (url.endsWith('/phone')) {
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
    phone.dispatchEvent(new FocusEvent('blur'));
    postalCode.dispatchEvent(new FocusEvent('blur'));

    await waitFor(() => expect(phone.value).toBe('+420 777 123 456'));
    await waitFor(() => expect(postalCode.value).toBe('123 45'));
  });

  it('applies invalid postal validation to the postal control', async () => {
    const postalCode = addInput('postal-code', '12a345');
    const country = addInput('country', 'CZ');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          countryCode: 'CZ',
          displayValue: '12A345',
          errors: [
            {
              code: 'postal.invalid',
              field: 'postalCode',
              message: 'Enter a valid postal code for the selected country.',
            },
          ],
          inputHints: { autoComplete: 'postal-code', inputMode: 'numeric' },
          isValid: false,
          normalizedValue: '12A345',
          rawInput: '12a345',
        }),
      ),
    );

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      postalCode,
    });

    postalCode.dispatchEvent(new FocusEvent('blur'));

    await waitFor(() =>
      expect(postalCode.validationMessage).toBe(
        'Enter a valid postal code for the selected country.',
      ),
    );
    expect(postalCode.getAttribute('aria-invalid')).toBe('true');

    postalCode.value = '12345';
    postalCode.dispatchEvent(new Event('input', { bubbles: true }));

    expect(postalCode.validationMessage).toBe('');
    expect(postalCode.getAttribute('aria-invalid')).toBeNull();
  });

  it('applies rejected postal validation errors to the postal control', async () => {
    const postalCode = addInput('postal-code', '123-45');
    const country = addInput('country', 'CZ');
    const onError = vi.fn();
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse(
          {
            _tag: 'SmartSuggestValidationError',
            errors: [
              {
                code: 'validation-error',
                field: 'postalCode',
                message: 'Enter a valid postal code for the selected country.',
              },
            ],
            message: 'Enter a valid postal code for the selected country.',
          },
          { status: 422, statusText: 'Unprocessable Entity' },
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
      '/api/v1/validate/postal',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(postalCode.validationMessage).toBe(
      'Enter a valid postal code for the selected country.',
    );
    expect(postalCode.getAttribute('aria-invalid')).toBe('true');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 422 }));
  });

  it('keeps phone validation server-only by default and applies native tel semantics', async () => {
    const phone = addInput('phone', '+420777123456');
    const country = addInput('country', 'CZ');
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
      '/api/v1/validate/phone',
      expect.objectContaining({ method: 'POST' }),
    );
    await expect(readFetchJsonBody(fetchMock)).resolves.toEqual({
      defaultCountry: 'CZ',
      rawInput: '+420777123456',
    });
    expect(phone.value).toBe('+420 777 123 456');
    expect(phone.getAttribute('type')).toBe('tel');
    expect(phone.getAttribute('autocomplete')).toBe('tel');
    expect(phone.getAttribute('inputmode')).toBe('tel');
    expect(phone.getAttribute('aria-invalid')).toBeNull();

    instance.destroy();

    expect(phone.getAttribute('type')).toBeNull();
    expect(phone.getAttribute('autocomplete')).toBeNull();
    expect(phone.getAttribute('inputmode')).toBeNull();
  });

  it('blocks phone form submission when required server validation is inconclusive', async () => {
    const form = document.createElement('form');
    const phone = document.createElement('input');
    phone.value = '+420777123456';
    form.append(phone);
    document.body.append(form);
    const submitSpy = vi
      .spyOn(form, 'requestSubmit')
      .mockImplementation(() => undefined);
    const reportValiditySpy = vi
      .spyOn(phone, 'reportValidity')
      .mockImplementation(() => true);
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.reject(new Error('validation unavailable')),
    );

    attachSmartSuggest({
      fetch: fetchMock,
      phone,
    });

    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    await waitFor(() => expect(reportValiditySpy).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
    expect(phone.validationMessage).toBe(
      'Phone validation is unavailable. Try again.',
    );
    expect(phone.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps strict phone validation behind the dynamic phone-strict subpath', () => {
    const source = readFileSync('src/vanilla.ts', 'utf8');

    expect(source).toContain('@techsio/smart-suggest-validation/phone-lite');
    expect(source).toContain('@techsio/smart-suggest-validation/phone-strict');
    expect(source).not.toMatch(TOP_LEVEL_VALIDATION_IMPORT_PATTERN);
    expect(source).not.toMatch(LIBPHONENUMBER_IMPORT_PATTERN);
  });

  it('uses lite phone validation for obvious malformed input without posting', async () => {
    const phone = addInput('phone', 'not a phone');
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
      'Enter a phone number using digits and phone punctuation.',
    );
    expect(phone.getAttribute('aria-invalid')).toBe('true');
  });

  it('starts lazy strict phone validation loading on interaction and uses the frontend result', async () => {
    const phone = addInput('phone', '+420777123456');
    const country = addInput('country', 'CZ');
    const validatePhoneNumber = vi.fn(() => ({
      displayValue: '+420 777 123 456',
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
      phoneValidationMode: 'frontend-lazy',
      phoneValidatorLoader,
    });

    expect(phoneValidatorLoader).not.toHaveBeenCalled();

    phone.dispatchEvent(new FocusEvent('focus'));

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);

    await instance.validatePhone();

    expect(validatePhoneNumber).toHaveBeenCalledWith({
      defaultCountry: 'CZ',
      rawInput: '+420777123456',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(phone.value).toBe('+420 777 123 456');
  });

  it('falls back to server phone validation when lazy frontend loading fails', async () => {
    const phone = addInput('phone', '+420777123456');
    const phoneValidatorLoader = vi.fn<SmartSuggestVanillaPhoneValidatorLoader>(() =>
      Promise.reject(new Error('chunk failed')),
    );
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(jsonResponse(validPhoneResponse())),
    );
    const instance = attachSmartSuggest({
      fetch: fetchMock,
      phone,
      phoneValidationMode: 'frontend-lazy',
      phoneValidatorLoader,
    });

    phone.dispatchEvent(new Event('input', { bubbles: true }));
    await instance.validatePhone();

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/validate/phone',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(phone.value).toBe('+420 777 123 456');
  });

  it('starts immediate strict phone validation loading during attach', async () => {
    const phone = addInput('phone', '+420777123456');
    const validatePhoneNumber = vi.fn(() => ({
      displayValue: '+420 777 123 456',
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
      phoneValidationMode: 'frontend-immediate',
      phoneValidatorLoader,
    });

    expect(phoneValidatorLoader).toHaveBeenCalledTimes(1);

    await instance.validatePhone();

    expect(validatePhoneNumber).toHaveBeenCalledWith({
      rawInput: '+420777123456',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears stale phone errors on input', async () => {
    const phone = addInput('phone', 'not a phone');
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>(() =>
      Promise.resolve(
        jsonResponse({
          displayValue: 'not a phone',
          errors: [
            {
              code: 'phone.not_a_number',
              field: 'phone',
              message: 'Enter a phone number.',
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
      'Enter a phone number using digits and phone punctuation.',
    );
    expect(phone.getAttribute('aria-invalid')).toBe('true');

    phone.value = '+420777123456';
    phone.dispatchEvent(new Event('input', { bubbles: true }));

    expect(phone.validationMessage).toBe('');
    expect(phone.getAttribute('aria-invalid')).toBeNull();
  });

  it('does not overwrite edited validation fields with stale responses', async () => {
    const phone = addInput('phone', '+420777123456');
    const postalCode = addInput('postal-code', '12345');
    const country = addInput('country', 'CZ');
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
    phone.value = '+420111222333';
    postalCode.value = '99999';

    expect(pendingValidationResponses.map((entry) => entry.url)).toEqual([
      '/api/v1/validate/phone',
      '/api/v1/validate/postal',
    ]);
    pendingValidationResponses[0]?.resolve(
      jsonResponse({
        displayValue: '+420 777 123 456',
        errors: [],
        isValid: true,
      }),
    );
    pendingValidationResponses[1]?.resolve(
      jsonResponse({
        displayValue: '123 45',
        errors: [],
        isValid: true,
      }),
    );
    await Promise.all([phoneValidation, postalValidation]);

    expect(phone.value).toBe('+420111222333');
    expect(postalCode.value).toBe('99999');
  });

  it('does not apply stale phone validation after later edits cycle back to the same value', async () => {
    const phone = addInput('phone', '+420777123456');
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
    phone.value = '+420111222333';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    phone.value = '+420777123456';
    phone.dispatchEvent(new Event('input', { bubbles: true }));

    expect(pendingValidationResponses.map((entry) => entry.url)).toEqual([
      '/api/v1/validate/phone',
    ]);
    pendingValidationResponses[0]?.resolve(
      jsonResponse({
        displayValue: '+420 777 123 456',
        errors: [],
        isValid: true,
      }),
    );
    await phoneValidation;

    expect(phone.value).toBe('+420777123456');
  });

  it('installs the legacy global browser API', () => {
    const api = installSmartSuggestGlobal(smartSuggestWindow());

    expect(smartSuggestWindow().TechsioSmartSuggest).toBe(api);
    expect(smartSuggestWindow().TechsioSmartSuggest?.attach).toBe(attachSmartSuggest);
  });

  it('keeps the SDK demo phone field on native telephone semantics', () => {
    const demoHtml = readFileSync(
      '../../../apps/smart-suggest/apps/shell-super-app/sdk/demo.html',
      'utf8',
    );
    const demoDocument = new DOMParser().parseFromString(demoHtml, 'text/html');
    const phone = demoDocument.querySelector<HTMLInputElement>('#phone');

    expect(phone?.getAttribute('type')).toBe('tel');
    expect(phone?.getAttribute('autocomplete')).toBe('tel');
    expect(phone?.getAttribute('inputmode')).toBe('tel');
  });
});
