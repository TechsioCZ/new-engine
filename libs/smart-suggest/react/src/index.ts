import type {
  SmartSuggestClient,
  SmartSuggestRequestOptions,
} from "@techsio/smart-suggest-client"
import type {
  SmartSuggestAcceptEvent,
  SmartSuggestRequest,
  SmartSuggestResponse,
} from "@techsio/smart-suggest-core"
import {
  type PhoneValidationRequest,
  type PhoneValidationResult,
  type PostalValidationRequest,
  type PostalValidationResult,
  validatePhoneNumber,
  validatePostalCode,
} from "@techsio/smart-suggest-validation"
import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type SmartSuggestAsyncState<TData> =
  | {
      data?: undefined
      error?: undefined
      status: "idle" | "loading"
    }
  | {
      data: TData
      error?: undefined
      status: "success"
    }
  | {
      data?: undefined
      error: unknown
      status: "error"
    }

export type SmartSuggestHookOptions<TRequest> = {
  client?: SmartSuggestClient
  enabled?: boolean
  request?: TRequest
}

export type AddressSuggestHookOptions =
  SmartSuggestHookOptions<SmartSuggestRequest> & {
    debounceMs?: number
    minQueryLength?: number
  }

type SmartSuggestRequestRunner<TRequest, TResponse> = (
  client: SmartSuggestClient,
  request: TRequest,
  requestOptions: SmartSuggestRequestOptions
) => Promise<TResponse>

const SmartSuggestClientContext = createContext<SmartSuggestClient | undefined>(
  undefined
)

export const SmartSuggestProvider = ({
  children,
  client,
}: PropsWithChildren<{ client: SmartSuggestClient }>) =>
  createElement(SmartSuggestClientContext.Provider, { value: client }, children)

export const useSmartSuggestClient = (client?: SmartSuggestClient) => {
  const contextClient = useContext(SmartSuggestClientContext)
  const resolvedClient = client ?? contextClient

  if (resolvedClient === undefined) {
    throw new Error("Smart Suggest client is not configured.")
  }

  return resolvedClient
}

const idleState = <TData>(): SmartSuggestAsyncState<TData> => ({
  status: "idle",
})

const useAbortableRequest = <TRequest, TResponse>(
  options: SmartSuggestHookOptions<TRequest>,
  requestFn: SmartSuggestRequestRunner<TRequest, TResponse>,
  delayMs = 0
) => {
  const client = useSmartSuggestClient(options.client)
  const [state, setState] = useState<SmartSuggestAsyncState<TResponse>>(
    idleState<TResponse>
  )
  const request = options.request
  const enabled = options.enabled

  useEffect(() => {
    if (enabled === false || request === undefined) {
      setState(idleState<TResponse>())
      return
    }

    const activeRequest = request
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      setState({ status: "loading" })
      requestFn(client, activeRequest, { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) {
            setState({ data, status: "success" })
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setState({ error, status: "error" })
          }
        })
    }, delayMs)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [client, delayMs, enabled, request, requestFn])

  return state
}

const requestAddressSuggestions: SmartSuggestRequestRunner<
  SmartSuggestRequest,
  SmartSuggestResponse
> = (client, request, requestOptions) => client.suggest(request, requestOptions)

const requestPhoneValidation: SmartSuggestRequestRunner<
  PhoneValidationRequest,
  PhoneValidationResult
> = (client, request, requestOptions) =>
  client.validatePhone(request, requestOptions)

const requestPostalValidation: SmartSuggestRequestRunner<
  PostalValidationRequest,
  PostalValidationResult
> = (client, request, requestOptions) =>
  client.validatePostal(request, requestOptions)

export const useAddressSuggest = (options: AddressSuggestHookOptions) => {
  const request = options.request
  const hasMinimumQuery =
    request === undefined ||
    request.query.trim().length >= (options.minQueryLength ?? 2)
  const hookOptions: SmartSuggestHookOptions<SmartSuggestRequest> = {
    enabled: options.enabled !== false && hasMinimumQuery,
  }

  if (options.client !== undefined) {
    hookOptions.client = options.client
  }

  if (request !== undefined) {
    hookOptions.request = request
  }

  return useAbortableRequest(
    hookOptions,
    requestAddressSuggestions,
    options.debounceMs ?? 250
  )
}

export const usePhoneValidation = (
  options: SmartSuggestHookOptions<PhoneValidationRequest>
) => useAbortableRequest(options, requestPhoneValidation)

export const usePostalValidation = (
  options: SmartSuggestHookOptions<PostalValidationRequest>
) => useAbortableRequest(options, requestPostalValidation)

export const createMockSmartSuggestClient = (
  overrides: Partial<SmartSuggestClient> = {}
): SmartSuggestClient => {
  const client: SmartSuggestClient = {
    accept: async (_event: SmartSuggestAcceptEvent) => ({ accepted: true }),
    suggest: async (
      request: SmartSuggestRequest
    ): Promise<SmartSuggestResponse> => ({
      cacheStatus: "disabled",
      requestId: `mock-${request.kind}`,
      suggestions: [],
    }),
    validatePhone: async (
      request: PhoneValidationRequest
    ): Promise<PhoneValidationResult> => validatePhoneNumber(request),
    validatePostal: async (
      request: PostalValidationRequest
    ): Promise<PostalValidationResult> => validatePostalCode(request),
  }

  return { ...client, ...overrides }
}

export const useMockSmartSuggestClient = (
  overrides: Partial<SmartSuggestClient> = {}
) => useMemo(() => createMockSmartSuggestClient(overrides), [overrides])
