import type { SmartSuggestClient } from "@techsio/smart-suggest-client";
import type { SmartSuggestRequest, SmartSuggestResponse } from "@techsio/smart-suggest-core";
import type {
  PhoneValidationResult,
  PostalValidationResult,
} from "@techsio/smart-suggest-validation";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockSmartSuggestClient,
  type SmartSuggestAsyncState,
  useAddressSuggest,
  usePhoneValidation,
  usePostalValidation,
} from "../src/index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | undefined;
let root: Root | undefined;

const render = async (element: ReactElement) => {
  if (root === undefined) {
    throw new Error("React test root is not initialized.");
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
  container = document.createElement("div");
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

describe("Smart Suggest React hooks", () => {
  it("debounces address suggestions without restarting after success", async () => {
    const request = {
      kind: "address",
      query: "Praha",
    } satisfies SmartSuggestRequest;
    const states: SmartSuggestAsyncState<SmartSuggestResponse>[] = [];
    const suggest = vi.fn<SmartSuggestClient["suggest"]>(async () => ({
      cacheStatus: "miss",
      requestId: "request-1",
      suggestions: [],
    }));
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
      data: { requestId: "request-1" },
      status: "success",
    });

    await advanceTimers(100);

    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight address request when the query changes", async () => {
    let request = {
      kind: "address",
      query: "Praha",
    } satisfies SmartSuggestRequest;
    const signals: AbortSignal[] = [];
    const resolvePendingResponses: Array<(response: SmartSuggestResponse) => void> = [];
    const suggest = vi.fn<SmartSuggestClient["suggest"]>((_suggestRequest, requestOptions) => {
      if (requestOptions?.signal === undefined) {
        throw new Error("Smart Suggest hook did not pass an AbortSignal.");
      }

      signals.push(requestOptions.signal);
      return new Promise<SmartSuggestResponse>((resolve) => {
        resolvePendingResponses.push(resolve);
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
    expect(signals[0]?.aborted).toBe(false);

    request = { kind: "address", query: "Bratislava" };
    await render(createElement(Probe));
    await advanceTimers(0);

    expect(suggest).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    for (const resolve of resolvePendingResponses) {
      resolve({
        cacheStatus: "miss",
        requestId: "resolved-after-abort",
        suggestions: [],
      });
    }
  });

  it("runs phone validation through the typed client hook", async () => {
    const states: SmartSuggestAsyncState<PhoneValidationResult>[] = [];
    const validatePhone = vi.fn<SmartSuggestClient["validatePhone"]>(
      async (_request, requestOptions) => {
        expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
        return {
          callingCode: "420",
          detectedCountry: "CZ",
          displayValue: "+420 777 123 456",
          e164: "+420777123456",
          errors: [],
          isPossible: true,
          isValid: true,
          nationalNumber: "777123456",
          rawInput: "777 123 456",
          type: "MOBILE",
        };
      },
    );
    const client = createMockSmartSuggestClient({ validatePhone });

    const Probe = () => {
      states.push(
        usePhoneValidation({
          client,
          request: {
            defaultCountry: "CZ",
            rawInput: "777 123 456",
          },
        }),
      );
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(validatePhone).toHaveBeenCalledWith(
      { defaultCountry: "CZ", rawInput: "777 123 456" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(states.at(-1)).toMatchObject({
      data: { e164: "+420777123456", isValid: true },
      status: "success",
    });
  });

  it("runs postal validation through the typed client hook", async () => {
    const states: SmartSuggestAsyncState<PostalValidationResult>[] = [];
    const validatePostal = vi.fn<SmartSuggestClient["validatePostal"]>(
      async (_request, requestOptions) => {
        expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
        return {
          countryCode: "PL",
          displayValue: "12-345",
          errors: [],
          inputHints: {
            autoComplete: "postal-code",
            inputMode: "numeric",
          },
          isValid: true,
          normalizedValue: "12345",
          rawInput: "12345",
        };
      },
    );
    const client = createMockSmartSuggestClient({ validatePostal });

    const Probe = () => {
      states.push(
        usePostalValidation({
          client,
          request: {
            countryCode: "PL",
            rawInput: "12345",
          },
        }),
      );
      return null;
    };

    await render(createElement(Probe));
    await advanceTimers(0);

    expect(validatePostal).toHaveBeenCalledWith(
      { countryCode: "PL", rawInput: "12345" },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(states.at(-1)).toMatchObject({
      data: { displayValue: "12-345", isValid: true },
      status: "success",
    });
  });
});
