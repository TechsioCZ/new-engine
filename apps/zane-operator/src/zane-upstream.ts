import { getErrorMessage } from "@techsio/std/object"
import { z } from "zod"

import type { AppConfig } from "./config"
import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
export type ResponseDecoder<T> = (payload: unknown) => T

export interface ZaneSession {
  cookies: Map<string, string>
}

interface CachedZaneSession {
  session: ZaneSession
  expiresAt: number
}

interface ZaneRequestOptions {
  allowNotFound?: boolean
  retryOnAuthFailure?: boolean
}

const SESSION_CACHE_TTL_MS = 10 * 60 * 1000
const cachedSessions = new Map<string, CachedZaneSession>()
const pendingSessionInitializations = new Map<string, Promise<ZaneSession>>()

const buildCookieHeader = (cookies: Map<string, string>): string =>
  [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ")

const getSetCookieHeaders = (headers: Headers): string[] => {
  const splitHeaders = headers.getSetCookie()
  if (splitHeaders.length > 0) {
    return splitHeaders
  }

  const header = headers.get("set-cookie")
  return header === null || header === "" ? [] : [header]
}

const parseCookiePair = (headerValue: string): [string, string] | null => {
  const [cookiePair] = headerValue.split(";", 1)
  if (cookiePair === undefined || cookiePair === "") {
    return null
  }

  const separatorIndex = cookiePair.indexOf("=")
  if (separatorIndex <= 0) {
    return null
  }

  const name = cookiePair.slice(0, separatorIndex).trim()
  return name === ""
    ? null
    : [name, cookiePair.slice(separatorIndex + 1).trim()]
}

export const updateCookiesFromHeaders = (
  cookies: Map<string, string>,
  headers: Headers,
): void => {
  for (const headerValue of getSetCookieHeaders(headers)) {
    const cookiePair = parseCookiePair(headerValue)
    if (cookiePair !== null) {
      cookies.set(...cookiePair)
    }
  }
}

const upstreamErrorDetailSchema = z.object({
  detail: z.string().optional(),
  message: z.string().optional(),
})

const upstreamErrorSchema = upstreamErrorDetailSchema.extend({
  errors: z.array(upstreamErrorDetailSchema).optional(),
})

export const parseErrorMessage = (
  payload: unknown,
  fallback: string,
): string => {
  const result = upstreamErrorSchema.safeParse(payload)
  if (!result.success) {
    return fallback
  }

  const messages = [
    result.data.detail,
    result.data.message,
    result.data.errors?.at(0)?.detail,
    result.data.errors?.at(0)?.message,
  ]
  return (
    messages.find(
      (message) => message !== undefined && message.trim() !== "",
    ) ?? fallback
  )
}

const requireZaneDeployConfig = (
  config: AppConfig,
): {
  connectBaseUrl: string
  connectHostHeader: string | null
  username: string
  password: string
} => {
  if (config.zaneBaseUrl === null || config.zaneBaseUrl === "") {
    throw new BadRequestError(
      "ZANE_BASE_URL is required for deploy orchestration",
    )
  }
  if (config.zaneUsername === null || config.zaneUsername === "") {
    throw new BadRequestError(
      "ZANE_USERNAME is required for deploy orchestration",
    )
  }
  if (config.zanePassword === null || config.zanePassword === "") {
    throw new BadRequestError(
      "ZANE_PASSWORD is required for deploy orchestration",
    )
  }

  return {
    connectBaseUrl: (config.zaneConnectBaseUrl ?? config.zaneBaseUrl).replace(
      /\/+$/u,
      "",
    ),
    connectHostHeader: config.zaneConnectHostHeader,
    password: config.zanePassword,
    username: config.zaneUsername,
  }
}

export class ZaneUpstreamClient {
  readonly #baseUrl: string
  readonly #connectHostHeader: string | null
  readonly #username: string
  readonly #password: string
  readonly #sessionCacheKey: string

  constructor(config: AppConfig) {
    const deployConfig = requireZaneDeployConfig(config)
    this.#baseUrl = deployConfig.connectBaseUrl
    this.#connectHostHeader = deployConfig.connectHostHeader
    this.#username = deployConfig.username
    this.#password = deployConfig.password
    this.#sessionCacheKey = `${this.#baseUrl}\n${this.#username}`
  }

  get baseUrl(): string {
    return this.#baseUrl
  }

  buildHeaders(
    session: ZaneSession | undefined,
    method: HttpMethod,
  ): Record<string, string> {
    const csrfToken = session?.cookies.get("csrftoken")
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    if (session !== undefined) {
      const cookieHeader = buildCookieHeader(session.cookies)
      if (cookieHeader !== "") {
        headers["Cookie"] = cookieHeader
      }
    }

    if (method !== "GET" && csrfToken !== undefined && csrfToken !== "") {
      headers["X-CSRFToken"] = csrfToken
    }

    if (this.#connectHostHeader !== null && this.#connectHostHeader !== "") {
      headers["Host"] = this.#connectHostHeader
    }

    return headers
  }

  async authenticate(forceRefresh = false): Promise<ZaneSession> {
    if (!forceRefresh) {
      const cached = cachedSessions.get(this.#sessionCacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return cached.session
      }

      const pending = pendingSessionInitializations.get(this.#sessionCacheKey)
      if (pending !== undefined) {
        return await pending
      }
    }

    const initialization = this.initializeSession()
    pendingSessionInitializations.set(this.#sessionCacheKey, initialization)

    try {
      const session = await initialization
      cachedSessions.set(this.#sessionCacheKey, {
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        session,
      })
      return session
    } finally {
      pendingSessionInitializations.delete(this.#sessionCacheKey)
    }
  }

  async request<T>(
    session: ZaneSession,
    method: HttpMethod,
    path: string,
    decodeResponse: ResponseDecoder<T>,
    payload?: unknown,
    options?: ZaneRequestOptions,
  ): Promise<T | null> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      body:
        payload === null || payload === undefined
          ? undefined
          : JSON.stringify(payload),
      headers: this.buildHeaders(session, method),
      method,
    })

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (options?.allowNotFound === true && response.status === 404) {
      return null
    }

    if (
      (response.status === 401 || response.status === 403) &&
      options?.retryOnAuthFailure !== false
    ) {
      this.invalidateSessionCache()
      const freshSession = await this.authenticate(true)
      return await this.request(
        freshSession,
        method,
        path,
        decodeResponse,
        payload,
        {
          ...options,
          retryOnAuthFailure: false,
        },
      )
    }

    if (!response.ok) {
      let errorMessage = `ZaneOps request failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_request_failed",
        errorMessage,
      )
    }

    if (response.status === 204) {
      return null
    }

    const responsePayload: unknown = await response.json()
    try {
      return decodeResponse(responsePayload)
    } catch (error: unknown) {
      const context = `${method} ${path} (HTTP ${response.status})`
      if (error instanceof UpstreamHttpError) {
        throw new UpstreamHttpError(
          error.status,
          error.errorCode,
          `${error.message}; response context: ${context}`,
        )
      }
      throw new UpstreamHttpError(
        502,
        "zane_response_invalid",
        `ZaneOps response decode failed for ${context}: ${getErrorMessage(error)}`,
      )
    }
  }

  private async initializeSession(): Promise<ZaneSession> {
    const session: ZaneSession = {
      cookies: new Map<string, string>(),
    }

    const csrfResponse = await fetch(`${this.#baseUrl}/api/csrf/`, {
      headers: this.buildHeaders(session, "GET"),
      method: "GET",
    })

    updateCookiesFromHeaders(session.cookies, csrfResponse.headers)
    if (!csrfResponse.ok) {
      throw new UpstreamHttpError(
        csrfResponse.status,
        "zane_csrf_failed",
        `Failed to initialize ZaneOps CSRF session (HTTP ${csrfResponse.status})`,
      )
    }

    const csrfToken = session.cookies.get("csrftoken")
    if (csrfToken === undefined || csrfToken === "") {
      throw new UpstreamHttpError(
        502,
        "zane_csrf_missing",
        "ZaneOps did not issue a csrftoken cookie",
      )
    }

    const loginResponse = await fetch(`${this.#baseUrl}/api/auth/login/`, {
      body: JSON.stringify({
        password: this.#password,
        username: this.#username,
      }),
      headers: this.buildHeaders(session, "POST"),
      method: "POST",
    })

    updateCookiesFromHeaders(session.cookies, loginResponse.headers)
    if (!loginResponse.ok) {
      let errorMessage = `ZaneOps login failed (HTTP ${loginResponse.status})`
      try {
        errorMessage = parseErrorMessage(
          await loginResponse.json(),
          errorMessage,
        )
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(
        loginResponse.status,
        "zane_login_failed",
        errorMessage,
      )
    }

    if ((session.cookies.get("sessionid") ?? "") === "") {
      throw new UpstreamHttpError(
        502,
        "zane_session_missing",
        "ZaneOps login did not return a session cookie",
      )
    }

    return session
  }

  private invalidateSessionCache(): void {
    cachedSessions.delete(this.#sessionCacheKey)
    pendingSessionInitializations.delete(this.#sessionCacheKey)
  }
}
