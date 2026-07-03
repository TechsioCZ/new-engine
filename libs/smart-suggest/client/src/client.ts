import {
  SmartSuggestBadRequestError,
  SmartSuggestCachePolicyViolationError,
  SmartSuggestForbiddenError,
  SmartSuggestHttpApi,
  SmartSuggestInternalError,
  SmartSuggestNotFoundError,
  SmartSuggestProviderTimeoutError,
  SmartSuggestProviderUnavailableError,
  SmartSuggestRateLimitError,
  SmartSuggestErrorBodySchema,
  SmartSuggestStorageUnavailableError,
  SmartSuggestUnauthorizedError,
  SmartSuggestValidationError,
} from "./api";
import type {
  SmartSuggestAcceptEvent,
  SmartSuggestError,
  SmartSuggestRequest,
  SmartSuggestResponse,
} from "@techsio/smart-suggest-core";
import { canonicalizeSmartSuggestCountryCodes } from "@techsio/smart-suggest-core";
import type {
  PhoneValidationRequest,
  PhoneValidationResult,
  PostalValidationRequest,
  PostalValidationResult,
} from "@techsio/smart-suggest-validation";
import { Option, Schema } from "effect";
import { type Cause, isDieReason, isFailReason, squash } from "effect/Cause";
import {
  catchCause,
  type Effect,
  ensuring,
  fail,
  flatMap,
  map,
  mapError,
  sync,
  tryPromise,
} from "effect/Effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

export type SmartSuggestFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type SmartSuggestPublicUrlTransform = (url: string) => string;

export type SmartSuggestClientOptions = {
  apiBaseUrl?: string;
  fetch?: SmartSuggestFetch;
  timeoutMs?: number;
};

export type SmartSuggestRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type SmartSuggestAcceptResponse = {
  accepted: true;
};

export type SmartSuggestClientErrorPayload = {
  errors?: readonly SmartSuggestError[];
  message?: string;
};

export class SmartSuggestClientError extends Error {
  readonly errors: readonly SmartSuggestError[];
  readonly status: number;

  constructor(status: number, payload: SmartSuggestClientErrorPayload) {
    super(payload.message ?? `Smart Suggest request failed with ${status}.`);
    this.name = "SmartSuggestClientError";
    this.status = status;
    this.errors = payload.errors ?? [];
  }
}

const internalRelativeOrigin = "https://smart-suggest.internal";

const defaultFetch: SmartSuggestFetch = (input, init) => fetch(input, init);

const normalizeBaseUrl = (apiBaseUrl: string | undefined) => {
  const baseUrl = apiBaseUrl ?? "/api";
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
};

const toEffectBaseUrl = (apiBaseUrl: string) =>
  apiBaseUrl.startsWith("/") ? `${internalRelativeOrigin}${apiBaseUrl}` : apiBaseUrl;

const toPublicUrl = (url: string) =>
  url.startsWith(internalRelativeOrigin) ? url.slice(internalRelativeOrigin.length) || "/" : url;

const appendQueryParameter = (url: string, key: string, value: string) => {
  const nextUrl = new URL(url, internalRelativeOrigin);
  nextUrl.searchParams.set(key, value);
  return toPublicUrl(nextUrl.toString());
};

const toFetchUrl = (url: string, publicUrlTransform?: SmartSuggestPublicUrlTransform) => {
  const publicUrl = toPublicUrl(url);

  return publicUrlTransform?.(publicUrl) ?? publicUrl;
};

const createRequestSignal = (requestOptions: SmartSuggestRequestOptions, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Request timed out.", "TimeoutError"));
  }, requestOptions.timeoutMs ?? timeoutMs);

  const abortFromExternalSignal = () => {
    controller.abort(requestOptions.signal?.reason);
  };

  if (requestOptions.signal?.aborted === true) {
    abortFromExternalSignal();
  } else {
    requestOptions.signal?.addEventListener("abort", abortFromExternalSignal, {
      once: true,
    });
  }

  return {
    cleanup: () => {
      clearTimeout(timeout);
      requestOptions.signal?.removeEventListener("abort", abortFromExternalSignal);
    },
    signal: controller.signal,
  };
};

const mergeAbortSignals = (signals: readonly AbortSignal[]) => {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];

  const abortFrom = (signal: AbortSignal) => {
    if (!controller.signal.aborted) {
      controller.abort(signal.reason);
    }
  };

  for (const signal of signals) {
    if (signal.aborted) {
      abortFrom(signal);
      continue;
    }

    const listener = () => abortFrom(signal);
    signal.addEventListener("abort", listener, { once: true });
    cleanups.push(() => {
      signal.removeEventListener("abort", listener);
    });
  }

  return {
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
    signal: controller.signal,
  };
};

const requestInitFromWebRequest = (request: Request, signal: AbortSignal): RequestInit => {
  const init: RequestInit & { duplex?: "half" } = {
    body: request.body,
    headers: request.headers,
    method: request.method,
    signal,
  };

  if (request.body !== null) {
    init.duplex = "half";
  }

  return init;
};

const transportError = (request: HttpClientRequest.HttpClientRequest, cause: unknown) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.TransportError({ cause, request }),
  });

const invalidUrlError = (request: HttpClientRequest.HttpClientRequest, cause: unknown) =>
  new HttpClientError.HttpClientError({
    reason: new HttpClientError.InvalidUrlError({ cause, request }),
  });

const createHttpClient = (
  fetchImpl: SmartSuggestFetch,
  requestSignal: AbortSignal,
  publicUrlTransform?: SmartSuggestPublicUrlTransform,
) =>
  HttpClient.make((request, _url, signal) => {
    const mergedSignal = mergeAbortSignals([requestSignal, signal]);

    return HttpClientRequest.toWeb(request, {
      signal: mergedSignal.signal,
    }).pipe(
      mapError((cause) => invalidUrlError(request, cause)),
      flatMap((webRequest) =>
        tryPromise({
          catch: (cause) => transportError(request, cause),
          try: () =>
            fetchImpl(
              toFetchUrl(webRequest.url, publicUrlTransform),
              requestInitFromWebRequest(webRequest, mergedSignal.signal),
            ),
        }),
      ),
      map((response) => HttpClientResponse.fromWeb(request, response)),
      ensuring(sync(mergedSignal.cleanup)),
    );
  });

const isNamedAbortError = (value: unknown): value is Error =>
  value instanceof Error && (value.name === "AbortError" || value.name === "TimeoutError");

const extractClientErrorPayload = (value: unknown): SmartSuggestClientErrorPayload => {
  const decoded = Option.getOrUndefined(
    Schema.decodeUnknownOption(SmartSuggestErrorBodySchema)(value),
  );

  if (decoded === undefined) {
    return {};
  }

  return {
    errors: decoded.errors,
    message: decoded.message,
  };
};

const abortCauseFromClientError = (error: HttpClientError.HttpClientError) => {
  const { reason } = error;

  return reason._tag === "TransportError" && isNamedAbortError(reason.cause)
    ? reason.cause
    : undefined;
};

const sharedApiErrorStatus = (error: unknown) => {
  if (error instanceof SmartSuggestBadRequestError) {
    return 400;
  }

  if (error instanceof SmartSuggestUnauthorizedError) {
    return 401;
  }

  if (error instanceof SmartSuggestForbiddenError) {
    return 403;
  }

  if (error instanceof SmartSuggestRateLimitError) {
    return 429;
  }

  if (error instanceof SmartSuggestValidationError) {
    return 422;
  }

  if (error instanceof SmartSuggestProviderTimeoutError) {
    return 504;
  }

  if (error instanceof SmartSuggestProviderUnavailableError) {
    return 503;
  }

  if (error instanceof SmartSuggestCachePolicyViolationError) {
    return 409;
  }

  if (error instanceof SmartSuggestStorageUnavailableError) {
    return 503;
  }

  if (error instanceof SmartSuggestNotFoundError) {
    return 404;
  }

  if (error instanceof SmartSuggestInternalError) {
    return 500;
  }

  return undefined;
};

const toClientError = (error: unknown) => {
  const sharedStatus = sharedApiErrorStatus(error);

  if (sharedStatus !== undefined) {
    return new SmartSuggestClientError(sharedStatus, extractClientErrorPayload(error));
  }

  if (HttpClientError.isHttpClientError(error)) {
    const abortCause = abortCauseFromClientError(error);

    if (abortCause !== undefined) {
      return abortCause;
    }

    return new SmartSuggestClientError(error.response?.status ?? 0, {
      message: error.message,
    });
  }

  if (isNamedAbortError(error)) {
    return error;
  }

  return error instanceof Error
    ? error
    : new SmartSuggestClientError(0, {
        message: "Smart Suggest request failed.",
      });
};

const toClientErrorFromCause = (cause: Cause<unknown>) => {
  const failReason = cause.reasons.find(isFailReason);

  if (failReason !== undefined) {
    return toClientError(failReason.error);
  }

  const dieReason = cause.reasons.find(isDieReason);

  if (dieReason !== undefined) {
    return toClientError(dieReason.defect);
  }

  return toClientError(squash(cause));
};

const normalizeClientFailures = <TResponse, R>(
  effect: Effect<TResponse, unknown, R>,
): Effect<TResponse, Error, R> =>
  effect.pipe(catchCause((cause) => fail(toClientErrorFromCause(cause))));

type SmartSuggestApiClient = HttpApiClient.ForApi<typeof SmartSuggestHttpApi>;

const createApiClientEffect = (
  apiBaseUrl: string,
  fetchImpl: SmartSuggestFetch,
  requestSignal: AbortSignal,
  publicUrlTransform?: SmartSuggestPublicUrlTransform,
): Effect<SmartSuggestApiClient> =>
  HttpApiClient.makeWith(SmartSuggestHttpApi, {
    baseUrl: toEffectBaseUrl(apiBaseUrl),
    httpClient: createHttpClient(fetchImpl, requestSignal, publicUrlTransform),
  });

const toSuggestQuery = (request: SmartSuggestRequest) => {
  const countryCodes = canonicalizeSmartSuggestCountryCodes(request.countryCodes);

  return {
    kind: request.kind,
    q: request.query,
    ...(request.countryCode === undefined ? {} : { countryCode: request.countryCode }),
    ...(countryCodes.length === 0 ? {} : { countryCodes: countryCodes.join(",") }),
    ...(request.language === undefined ? {} : { language: request.language }),
    ...(request.limit === undefined ? {} : { limit: request.limit }),
    ...(request.tenant?.tenantId === undefined ? {} : { tenantId: request.tenant.tenantId }),
    ...(request.tenant?.salesChannelId === undefined
      ? {}
      : { salesChannelId: request.tenant.salesChannelId }),
    ...(request.tenant?.cartId === undefined ? {} : { cartId: request.tenant.cartId }),
    ...(request.tenant?.sessionId === undefined ? {} : { sessionId: request.tenant.sessionId }),
  };
};

const toAcceptUrlTransform = (
  event: SmartSuggestAcceptEvent,
): SmartSuggestPublicUrlTransform | undefined => {
  const tenantId = event.tenant?.tenantId;

  return tenantId === undefined
    ? undefined
    : (url) => appendQueryParameter(url, "tenantId", tenantId);
};

/**
 * Canonical browser-safe Smart Suggest client. Methods return lazy Effect
 * programs and should be the default API for new app code.
 */
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

export const createSmartSuggestEffectClient = (
  options: SmartSuggestClientOptions = {},
): SmartSuggestEffectClient => {
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl);
  const fetchImpl = options.fetch ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? 5000;

  const runWithRequestEffect = <TResponse>(
    requestOptions: SmartSuggestRequestOptions,
    useClient: (client: SmartSuggestApiClient) => Effect<TResponse, unknown>,
    publicUrlTransform?: SmartSuggestPublicUrlTransform,
  ): Effect<TResponse, Error> =>
    sync(() => createRequestSignal(requestOptions, timeoutMs)).pipe(
      flatMap((requestSignal) =>
        createApiClientEffect(apiBaseUrl, fetchImpl, requestSignal.signal, publicUrlTransform).pipe(
          flatMap((client) => useClient(client)),
          normalizeClientFailures,
          ensuring(sync(requestSignal.cleanup)),
        ),
      ),
    );

  return {
    accept: (event, requestOptions = {}) =>
      runWithRequestEffect(
        requestOptions,
        (client) => client.accept({ payload: event }),
        toAcceptUrlTransform(event),
      ),
    suggest: (request, requestOptions = {}) =>
      runWithRequestEffect(requestOptions, (client) =>
        client.suggest({ query: toSuggestQuery(request) }),
      ),
    validatePhone: (request, requestOptions = {}) =>
      runWithRequestEffect(requestOptions, (client) => client.validatePhone({ payload: request })),
    validatePostal: (request, requestOptions = {}) =>
      runWithRequestEffect(requestOptions, (client) => client.validatePostal({ payload: request })),
  };
};
