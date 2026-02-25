import { MedusaError } from "@medusajs/framework/utils"
import { soap } from "strong-soap"
import { TimeoutError } from "../http"
import { isRecord } from "../type-guards"

export type SoapWsSecurityOptions = {
  username: string
  password: string
  passwordType?: "PasswordText" | "PasswordDigest"
  actor?: string
  mustUnderstand?: boolean
}

export type SoapClientOptions = {
  wsdlUrl: string
  endpoint?: string
  wsdlTimeout?: number
  wsdlHeaders?: Record<string, string>
  wsdlOptions?: Record<string, unknown>
  httpHeaders?: Record<string, string>
  wsSecurity?: SoapWsSecurityOptions
}

export type SoapClient = {
  setSecurity?: (security: unknown) => void
  setEndpoint?: (endpoint: string) => void
  addHttpHeader?: (name: string, value: string) => void
  [key: string]: unknown
}

export type SoapResultValidator<T> =
  | { parse: (value: unknown) => T }
  | ((value: unknown) => value is T)

type SoapCreateClientOptions = {
  endpoint?: string
  wsdl_headers?: Record<string, string>
  wsdl_options?: Record<string, unknown>
}

const DEFAULT_SOAP_TIMEOUT_MS = 15_000

function isSocketTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error) || !isRecord(error)) {
    return false
  }

  const code = error.code
  return code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT"
}

function isSoapClient(value: unknown): value is SoapClient {
  if (!isRecord(value)) {
    return false
  }

  if ("setSecurity" in value && typeof value.setSecurity !== "function") {
    return false
  }

  if ("setEndpoint" in value && typeof value.setEndpoint !== "function") {
    return false
  }

  if ("addHttpHeader" in value && typeof value.addHttpHeader !== "function") {
    return false
  }

  return true
}

function createWsSecurity(options: SoapWsSecurityOptions): unknown {
  const WSSecurity = (soap as unknown as { WSSecurity?: unknown }).WSSecurity

  if (typeof WSSecurity !== "function") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "SOAP WS-Security is not available"
    )
  }

  const SecurityCtor = WSSecurity as new (
    username: string,
    password: string,
    options: {
      passwordType?: string
      actor?: string
      mustUnderstand?: boolean
    }
  ) => unknown

  return new SecurityCtor(options.username, options.password, {
    passwordType: options.passwordType ?? "PasswordText",
    actor: options.actor,
    mustUnderstand: options.mustUnderstand,
  })
}

async function createClientPromise(
  wsdlUrl: string,
  options: SoapCreateClientOptions
): Promise<SoapClient> {
  const createClientAsync = (
    soap as unknown as {
      createClientAsync?: (
        wsdl: string,
        opts?: SoapCreateClientOptions
      ) => Promise<unknown>
    }
  ).createClientAsync

  if (typeof createClientAsync === "function") {
    const client = await createClientAsync(wsdlUrl, options)
    if (!isSoapClient(client)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "SOAP client creation returned invalid client"
      )
    }
    return client
  }

  return await new Promise<SoapClient>((resolve, reject) => {
    const createClient = (
      soap as unknown as {
        createClient?: (
          wsdl: string,
          opts: SoapCreateClientOptions,
          callback: (error: unknown, client: SoapClient | undefined) => void
        ) => void
      }
    ).createClient

    if (typeof createClient !== "function") {
      reject(
        new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "SOAP client factory is not available"
        )
      )
      return
    }

    createClient(wsdlUrl, options, (error, client) => {
      if (error) {
        reject(error)
        return
      }
      if (!client) {
        reject(
          new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "SOAP client creation returned empty client"
          )
        )
        return
      }
      if (!isSoapClient(client)) {
        reject(
          new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "SOAP client creation returned invalid client"
          )
        )
        return
      }

      resolve(client)
    })
  })
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string,
  onTimeout?: () => void
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      onTimeout?.()
      reject(new TimeoutError(`${context} after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then((result) => resolve(result))
      .catch((error) => {
        if (isSocketTimeoutError(error)) {
          reject(new TimeoutError(`${context} after ${timeoutMs}ms`))
          return
        }

        reject(error)
      })
      .finally(() => clearTimeout(timeoutId))
  })
}

function soapValidationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return `: ${error.message}`
  }

  return ""
}

function validateSoapResult<T>(
  value: unknown,
  validator: SoapResultValidator<T>
): T {
  if (typeof validator === "function") {
    try {
      if (validator(value)) {
        return value
      }
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `SOAP response validation failed${soapValidationErrorMessage(error)}`
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "SOAP response validation failed"
    )
  }

  try {
    return validator.parse(value)
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `SOAP response validation failed${soapValidationErrorMessage(error)}`
    )
  }
}

function normalizeSoapResult(result: unknown): unknown
function normalizeSoapResult<T>(
  result: unknown,
  validator: SoapResultValidator<T>
): T
function normalizeSoapResult<T>(
  result: unknown,
  validator?: SoapResultValidator<T>
): unknown | T {
  if (Array.isArray(result)) {
    if (result.length === 0) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "SOAP operation returned empty result"
      )
    }
    const value = result[0]
    return validator ? validateSoapResult(value, validator) : value
  }

  return validator ? validateSoapResult(result, validator) : result
}

export function extractSoapFaultMessage(error: unknown): string | null {
  if (!isRecord(error)) {
    return null
  }

  const root = error.root
  let nestedFault: unknown
  if (isRecord(root)) {
    const envelope = root.Envelope
    if (isRecord(envelope)) {
      const body = envelope.Body
      if (isRecord(body)) {
        nestedFault = body.Fault
      }
    }
  }

  const fault = error.Fault ?? error.fault ?? nestedFault

  if (isRecord(fault)) {
    const message = fault.faultstring ?? fault.faultcode ?? fault.message

    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return null
}

export async function createSoapClient(
  options: SoapClientOptions
): Promise<SoapClient> {
  const wsdlUrl = options.wsdlUrl?.trim()
  if (!wsdlUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "SOAP WSDL URL is required"
    )
  }

  const wsdlTimeoutMs = options.wsdlTimeout ?? DEFAULT_SOAP_TIMEOUT_MS
  const wsdlAbortController = new AbortController()
  const clientOptions: SoapCreateClientOptions = {
    endpoint: options.endpoint,
    wsdl_headers: options.wsdlHeaders,
    wsdl_options: {
      ...options.wsdlOptions,
      signal: wsdlAbortController.signal,
      timeout: wsdlTimeoutMs,
    },
  }

  const client = await withTimeout(
    createClientPromise(wsdlUrl, clientOptions),
    wsdlTimeoutMs,
    "SOAP client creation (WSDL fetch) timed out",
    () => wsdlAbortController.abort()
  )

  if (options.endpoint && client.setEndpoint) {
    client.setEndpoint(options.endpoint)
  }

  if (options.httpHeaders && client.addHttpHeader) {
    for (const [key, value] of Object.entries(options.httpHeaders)) {
      client.addHttpHeader(key, value)
    }
  }

  if (options.wsSecurity && client.setSecurity) {
    client.setSecurity(createWsSecurity(options.wsSecurity))
  }

  return client
}

export async function callSoapOperation(
  client: SoapClient,
  operation: string,
  args: unknown,
  timeoutMs?: number
): Promise<unknown>
export async function callSoapOperation<T>(
  client: SoapClient,
  operation: string,
  args: unknown,
  timeoutMs: number | undefined,
  validator: SoapResultValidator<T>
): Promise<T>
/**
 * Pass a validator whenever the SOAP response type cannot be guaranteed by
 * compile-time types alone. Without a validator the result is returned as unknown.
 */
export async function callSoapOperation<T>(
  client: SoapClient,
  operation: string,
  args: unknown,
  timeoutMs: number = DEFAULT_SOAP_TIMEOUT_MS,
  validator?: SoapResultValidator<T>
): Promise<unknown | T> {
  const asyncMethodName = `${operation}Async`
  const asyncMethod = client[asyncMethodName]

  if (typeof asyncMethod === "function") {
    const requestAbortController = new AbortController()
    const result = await withTimeout(
      Promise.resolve(
        (
          asyncMethod as (
            input: unknown,
            options?: Record<string, unknown>
          ) => Promise<unknown>
        ).call(client, args, {
          signal: requestAbortController.signal,
          timeout: timeoutMs,
        })
      ),
      timeoutMs,
      `SOAP ${operation} timed out`,
      () => requestAbortController.abort()
    )
    return validator
      ? normalizeSoapResult(result, validator)
      : normalizeSoapResult(result)
  }

  const method = client[operation]
  if (typeof method !== "function") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `SOAP operation not available: ${operation}`
    )
  }

  const requestAbortController = new AbortController()
  const result = await withTimeout(
    new Promise<unknown>((resolve, reject) => {
      const callbackMethod = method as (
        input: unknown,
        callback: (error: unknown, value?: unknown) => void,
        options?: Record<string, unknown>,
        extraHeaders?: Record<string, string>
      ) => void
      callbackMethod.call(
        client,
        args,
        (error, value) => {
          if (error) {
            reject(error)
            return
          }
          resolve(value)
        },
        {
          signal: requestAbortController.signal,
          timeout: timeoutMs,
        }
      )
    }),
    timeoutMs,
    `SOAP ${operation} timed out`,
    () => requestAbortController.abort()
  )

  return validator
    ? normalizeSoapResult(result, validator)
    : normalizeSoapResult(result)
}
