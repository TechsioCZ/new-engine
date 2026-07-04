import type {
  SmartSuggestAcceptEvent,
  SmartSuggestCountryCode,
  SmartSuggestRequest,
  SmartSuggestResponse,
} from '@techsio/smart-suggest-core';
import type { Effect } from 'effect/Effect';
import { flatMap, runCallback, sleep, succeed, suspend, sync } from 'effect/Effect';
import { isFailure } from 'effect/Exit';
import { squash } from 'effect/Cause';
import type {
  PhoneValidationRequest,
  PhoneValidationResult,
  ValidationIssue,
} from '@techsio/smart-suggest-validation/phone-lite';
import {
  liteResultToPhoneValidationResult,
  validatePhoneNumberLite,
} from '@techsio/smart-suggest-validation/phone-lite';
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type { PhoneValidationRequest, PhoneValidationResult };

export type SmartSuggestAsyncState<TData> =
  | {
      data?: undefined;
      error?: undefined;
      status: 'idle';
    }
  | {
      data?: TData;
      error?: undefined;
      status: 'loading';
    }
  | {
      data: TData;
      error?: undefined;
      status: 'success';
    }
  | {
      data?: TData;
      error: unknown;
      status: 'error';
    };

export type PostalValidationStatus = boolean | 'unknown';

export type PostalValidationRequest = {
  rawInput: string;
  countryCode: SmartSuggestCountryCode;
};

export type PostalInputHints = {
  autoComplete: 'postal-code';
  inputMode: 'numeric' | 'text';
};

export type PostalValidationResult = {
  rawInput: string;
  countryCode: SmartSuggestCountryCode;
  normalizedValue: string;
  displayValue: string;
  isValid: PostalValidationStatus;
  inputHints: PostalInputHints;
  errors: ValidationIssue[];
};

export type SmartSuggestAcceptResponse = {
  accepted: true;
};

export type SmartSuggestRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type SmartSuggestHookOptions<TRequest> = {
  client?: SmartSuggestEffectClient;
  enabled?: boolean;
  request?: TRequest;
};

export type SmartSuggestEffectClient = {
  accept: (
    event: SmartSuggestAcceptEvent,
    requestOptions?: SmartSuggestRequestOptions,
  ) => Effect<SmartSuggestAcceptResponse, Error>;
  suggest: (
    request: SmartSuggestRequest,
    requestOptions?: SmartSuggestRequestOptions,
  ) => Effect<SmartSuggestResponse, Error>;
  validatePhone: (
    request: PhoneValidationRequest,
    requestOptions?: SmartSuggestRequestOptions,
  ) => Effect<PhoneValidationResult, Error>;
  validatePostal: (
    request: PostalValidationRequest,
    requestOptions?: SmartSuggestRequestOptions,
  ) => Effect<PostalValidationResult, Error>;
};

export type AddressSuggestHookOptions = SmartSuggestHookOptions<SmartSuggestRequest> & {
  debounceMs?: number;
  minQueryLength?: number;
};

type SmartSuggestRequestRunner<TRequest, TResponse> = (
  client: SmartSuggestEffectClient,
  request: TRequest,
  requestOptions: SmartSuggestRequestOptions,
) => Effect<TResponse, Error>;

const SmartSuggestClientContext = createContext<SmartSuggestEffectClient | undefined>(undefined);

export const SmartSuggestProvider = ({
  children,
  client,
}: PropsWithChildren<{ client: SmartSuggestEffectClient }>) =>
  createElement(SmartSuggestClientContext.Provider, { value: client }, children);

export const useSmartSuggestClient = (client?: SmartSuggestEffectClient) => {
  const contextClient = useContext(SmartSuggestClientContext);
  const resolvedClient = client ?? contextClient;

  if (resolvedClient === undefined) {
    throw new Error('Smart Suggest client is not configured.');
  }

  return resolvedClient;
};

const idleState = <TData>(): SmartSuggestAsyncState<TData> => ({
  status: 'idle',
});

const toUnknownError = (cause: Parameters<typeof squash>[0]) => squash(cause);

const createRequestKey = <TRequest>(request: TRequest | undefined) =>
  request === undefined ? undefined : JSON.stringify(request);

export const detachSmartSuggestEffectAtBrowserEdge = <TData>(
  effect: Effect<TData, Error>,
  onError?: (error: unknown) => void,
) =>
  runCallback(effect, {
    onExit: (result) => {
      if (isFailure(result)) {
        onError?.(toUnknownError(result.cause));
      }
    },
  });

const useAbortableRequest = <TRequest, TResponse>(
  options: SmartSuggestHookOptions<TRequest>,
  requestFn: SmartSuggestRequestRunner<TRequest, TResponse>,
  delayMs = 0,
) => {
  const client = useSmartSuggestClient(options.client);
  const [state, setState] = useState<SmartSuggestAsyncState<TResponse>>(idleState<TResponse>);
  const request = options.request;
  const requestKey = createRequestKey(request);
  const enabled = options.enabled;

  useEffect(() => {
    if (enabled === false || request === undefined) {
      setState(idleState<TResponse>());
      return;
    }

    const activeRequest = request;
    let isActive = true;

    // Keep previous data visible while a new request is debouncing or in flight.
    // Loading is announced only once the debounce window has elapsed, never before.
    const announceLoading = sync(() => {
      setState((previous) => {
        if (previous.status === 'loading') {
          return previous;
        }

        return previous.data === undefined
          ? { status: 'loading' }
          : { data: previous.data, status: 'loading' };
      });
    });

    const startRequest = suspend(() => requestFn(client, activeRequest, {}));
    const program =
      delayMs > 0
        ? sleep(delayMs).pipe(flatMap(() => announceLoading), flatMap(() => startRequest))
        : announceLoading.pipe(flatMap(() => startRequest));
    const interrupt = runCallback(program, {
      onExit: (result) => {
        if (!isActive) {
          return;
        }

        if (isFailure(result)) {
          setState((previous) =>
            previous.data === undefined
              ? { error: toUnknownError(result.cause), status: 'error' }
              : {
                  data: previous.data,
                  error: toUnknownError(result.cause),
                  status: 'error',
                },
          );
          return;
        }

        setState({ data: result.value, status: 'success' });
      },
    });

    return () => {
      isActive = false;
      interrupt();
    };
  }, [client, delayMs, enabled, requestFn, requestKey]);

  return state;
};

const requestAddressSuggestions: SmartSuggestRequestRunner<
  SmartSuggestRequest,
  SmartSuggestResponse
> = (client, request, requestOptions) => client.suggest(request, requestOptions);

const requestPhoneValidation: SmartSuggestRequestRunner<
  PhoneValidationRequest,
  PhoneValidationResult
> = (client, request, requestOptions) => client.validatePhone(request, requestOptions);

const requestPostalValidation: SmartSuggestRequestRunner<
  PostalValidationRequest,
  PostalValidationResult
> = (client, request, requestOptions) => client.validatePostal(request, requestOptions);

export const useAddressSuggest = (options: AddressSuggestHookOptions) => {
  const request = options.request;
  const hasMinimumQuery =
    request === undefined || request.query.trim().length >= (options.minQueryLength ?? 2);
  const hookOptions: SmartSuggestHookOptions<SmartSuggestRequest> = {
    enabled: options.enabled !== false && hasMinimumQuery,
  };

  if (options.client !== undefined) {
    hookOptions.client = options.client;
  }

  if (request !== undefined) {
    hookOptions.request = request;
  }

  return useAbortableRequest(hookOptions, requestAddressSuggestions, options.debounceMs ?? 250);
};

export const usePhoneValidation = (options: SmartSuggestHookOptions<PhoneValidationRequest>) =>
  useAbortableRequest(options, requestPhoneValidation);

export const usePostalValidation = (options: SmartSuggestHookOptions<PostalValidationRequest>) =>
  useAbortableRequest(options, requestPostalValidation);

export const createMockSmartSuggestClient = (
  overrides: Partial<SmartSuggestEffectClient> = {},
): SmartSuggestEffectClient => {
  const client: SmartSuggestEffectClient = {
    accept: (_event: SmartSuggestAcceptEvent) => succeed({ accepted: true }),
    suggest: (request: SmartSuggestRequest) =>
      succeed({
        cacheStatus: 'disabled',
        requestId: `mock-${request.kind}`,
        suggestions: [],
      }),
    validatePhone: (request: PhoneValidationRequest) =>
      succeed(createLitePhoneValidationResult(request)),
    validatePostal: (request: PostalValidationRequest) =>
      succeed(createMockPostalValidationResult(request)),
  };

  return { ...client, ...overrides };
};

export const useMockSmartSuggestClient = (overrides: Partial<SmartSuggestEffectClient> = {}) =>
  useMemo(() => createMockSmartSuggestClient(overrides), [overrides]);

const createLitePhoneValidationResult = (
  request: PhoneValidationRequest,
): PhoneValidationResult => {
  return liteResultToPhoneValidationResult(validatePhoneNumberLite(request));
};

const createMockPostalValidationResult = (
  request: PostalValidationRequest,
): PostalValidationResult => {
  const displayValue = request.rawInput.trim();

  return {
    rawInput: request.rawInput,
    countryCode: request.countryCode,
    normalizedValue: displayValue.toUpperCase(),
    displayValue,
    isValid: 'unknown',
    inputHints: {
      autoComplete: 'postal-code',
      inputMode: 'numeric',
    },
    errors: [],
  };
};
