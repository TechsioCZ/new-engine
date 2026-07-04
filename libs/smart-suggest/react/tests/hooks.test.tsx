import type { SmartSuggestRequest, SmartSuggestResponse } from '@techsio/smart-suggest-core';
import { callback, fail, succeed } from 'effect/Effect';
import { act, createElement, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMockSmartSuggestClient,
  type SmartSuggestAsyncState,
  type SmartSuggestEffectClient,
  type PhoneValidationResult,
  type PostalValidationResult,
  useAddressSuggest,
  usePhoneValidation,
  usePostalValidation,
} from '../src/react';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | undefined;
let root: Root | undefined;

const render = async (element: ReactElement) => {
  if (root === undefined) {
    throw new Error('React test root is not initialized.');
  }

  const activeRoot = root;
  await act(() => {
    activeRoot.render(element);
  });
};

const advanceTimers = async (milliseconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  const activeRoot = root;

  if (activeRoot !== undefined) {
    await act(() => {
      activeRoot.unmount();
    });
  }

  container?.remove();
  container = undefined;
  root = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Smart Suggest React hooks', () => {
  it('debounces address suggestions without restarting after success', async () => {
    const request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>(() =>
      succeed({
        cacheStatus: 'miss',
        requestId: 'request-1',
        suggestions: [],
      }),
    );
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 20, request }));
      return null;
    };

    await render(createElement(Probe));
    expect(suggest).toHaveBeenCalledTimes(0);

    await advanceTimers(20);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'request-1' },
      status: 'success',
    });

    await advanceTimers(100);

    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('keeps previous address suggestions and stays quiet while a debounced request is waiting', async () => {
    let request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>((activeRequest) =>
      succeed({
        cacheStatus: 'miss',
        requestId: activeRequest.query,
        suggestions: [],
      }),
    );
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 20, request }));
      return null;
    };

    await render(createElement(Probe));
    // During the debounce window, loading must not announce: state stays idle
    // and no request has fired yet.
    expect(states.at(-1)).toMatchObject({ status: 'idle' });
    expect(suggest).toHaveBeenCalledTimes(0);

    await advanceTimers(20);

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'success',
    });

    request = {
      kind: 'address',
      query: 'Brno',
    };
    await render(createElement(Probe));

    // Previous data stays visible; status does not flip to loading before the
    // debounce fires.
    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'success',
    });
    expect(suggest).toHaveBeenCalledTimes(1);

    await advanceTimers(19);

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'success',
    });
    expect(suggest).toHaveBeenCalledTimes(1);

    await advanceTimers(1);

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Brno' },
      status: 'success',
    });
    expect(suggest).toHaveBeenCalledTimes(2);
  });

  it('keeps previous suggestions visible while a new request is in flight', async () => {
    let request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const resolvePendingResponses: Array<(response: SmartSuggestResponse) => void> = [];
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>(() =>
      callback<SmartSuggestResponse, Error>((resume) => {
        resolvePendingResponses.push((response) => {
          resume(succeed(response));
        });
      }),
    );
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 0, request }));
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    await act(() => {
      resolvePendingResponses[0]!({
        cacheStatus: 'miss',
        requestId: 'Praha',
        suggestions: [],
      });
    });

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'success',
    });

    request = { kind: 'address', query: 'Brno' };
    await render(createElement(Probe));
    await advanceTimers(0);

    // New request is in flight, but previous Praha data is retained so the
    // consumer can keep the suggestion list stable.
    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'loading',
    });
    expect(suggest).toHaveBeenCalledTimes(2);
  });

  it('keeps previous suggestions visible after a single transient fetch error', async () => {
    let request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    let shouldFail = false;
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>((activeRequest) =>
      shouldFail
        ? fail(new Error('transient'))
        : succeed({
            cacheStatus: 'miss',
            requestId: activeRequest.query,
            suggestions: [],
          }),
    );
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 0, request }));
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      status: 'success',
    });

    shouldFail = true;
    request = { kind: 'address', query: 'Brno' };
    await render(createElement(Probe));
    await advanceTimers(0);

    // Transient failure surfaces the error but keeps previous data so the UI
    // does not collapse into an unavailable state mid-typing.
    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Praha' },
      error: expect.any(Error),
      status: 'error',
    });
  });

  it('discards a stale address response when request changes before it resolves', async () => {
    let request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const resolvePendingResponses: Array<(response: SmartSuggestResponse) => void> = [];
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>(() =>
      callback<SmartSuggestResponse, Error>((resume) => {
        resolvePendingResponses.push((response) => {
          resume(succeed(response));
        });
      }),
    );
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 0, request }));
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(suggest).toHaveBeenCalledTimes(1);

    request = { kind: 'address', query: 'Brno' };
    await render(createElement(Probe));
    await advanceTimers(0);

    expect(suggest).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvePendingResponses[0]!({
        cacheStatus: 'miss',
        requestId: 'Praha-stale',
        suggestions: [],
      });
      await Promise.resolve();
    });

    expect(states.at(-1)).toMatchObject({ status: 'loading' });
    expect(states).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ requestId: 'Praha-stale' }),
        }),
      ]),
    );

    await act(async () => {
      resolvePendingResponses[1]!({
        cacheStatus: 'miss',
        requestId: 'Brno-current',
        suggestions: [],
      });
      await Promise.resolve();
    });

    expect(states.at(-1)).toMatchObject({
      data: { requestId: 'Brno-current' },
      status: 'success',
    });
  });

  it('aborts an in-flight address request when the query changes', async () => {
    let request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const abortSignals: AbortSignal[] = [];
    const resolvePendingResponses: Array<(response: SmartSuggestResponse) => void> = [];
    const suggest = vi.fn<SmartSuggestEffectClient['suggest']>(() => {
      return callback<SmartSuggestResponse, Error>((resume, signal) => {
        abortSignals.push(signal);
        resolvePendingResponses.push((response) => {
          resume(succeed(response));
        });
      });
    });
    const client = createMockSmartSuggestClient({ suggest });

    const Probe = () => {
      useAddressSuggest({ client, debounceMs: 0, request });
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(abortSignals[0]?.aborted).toBe(false);

    request = { kind: 'address', query: 'Bratislava' };
    await render(createElement(Probe));
    await advanceTimers(0);

    expect(suggest).toHaveBeenCalledTimes(2);
    expect(abortSignals[0]?.aborted).toBe(true);
    expect(abortSignals[1]?.aborted).toBe(false);

    for (const resolve of resolvePendingResponses) {
      resolve({
        cacheStatus: 'miss',
        requestId: 'resolved-after-abort',
        suggestions: [],
      });
    }
  });

  it('runs phone validation through the typed client hook', async () => {
    const states: SmartSuggestAsyncState<PhoneValidationResult>[] = [];
    const validatePhone = vi.fn<SmartSuggestEffectClient['validatePhone']>(
      (_request, _requestOptions) => {
        return succeed({
          callingCode: '420',
          detectedCountry: 'CZ',
          displayValue: '+420 777 123 456',
          e164: '+420777123456',
          errors: [],
          isPossible: true,
          isValid: true,
          nationalNumber: '777123456',
          rawInput: '777 123 456',
          type: 'MOBILE',
        });
      },
    );
    const client = createMockSmartSuggestClient({ validatePhone });

    const Probe = () => {
      states.push(
        usePhoneValidation({
          client,
          request: {
            defaultCountry: 'CZ',
            rawInput: '777 123 456',
          },
        }),
      );
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(validatePhone).toHaveBeenCalledWith(
      { defaultCountry: 'CZ', rawInput: '777 123 456' },
      {},
    );
    expect(states.at(-1)).toMatchObject({
      data: { e164: '+420777123456', isValid: true },
      status: 'success',
    });
  });

  it('runs postal validation through the typed client hook', async () => {
    const states: SmartSuggestAsyncState<PostalValidationResult>[] = [];
    const validatePostal = vi.fn<SmartSuggestEffectClient['validatePostal']>(
      (_request, _requestOptions) => {
        return succeed({
          countryCode: 'PL',
          displayValue: '12-345',
          errors: [],
          inputHints: {
            autoComplete: 'postal-code',
            inputMode: 'numeric',
          },
          isValid: true,
          normalizedValue: '12345',
          rawInput: '12345',
        });
      },
    );
    const client = createMockSmartSuggestClient({ validatePostal });

    const Probe = () => {
      states.push(
        usePostalValidation({
          client,
          request: {
            countryCode: 'PL',
            rawInput: '12345',
          },
        }),
      );
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(validatePostal).toHaveBeenCalledWith({ countryCode: 'PL', rawInput: '12345' }, {});
    expect(states.at(-1)).toMatchObject({
      data: { displayValue: '12-345', isValid: true },
      status: 'success',
    });
  });

  it('surfaces effect failures as hook errors', async () => {
    const request = {
      kind: 'address',
      query: 'Praha',
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const client = createMockSmartSuggestClient({
      suggest: () => fail(new Error('offline')),
    });

    const Probe = () => {
      states.push(useAddressSuggest({ client, debounceMs: 0, request }));
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(states.at(-1)).toMatchObject({
      error: expect.any(Error),
      status: 'error',
    });
  });
});
