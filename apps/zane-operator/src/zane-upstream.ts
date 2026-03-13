import type { AppConfig } from "./config"
import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

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

function buildCookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie()
  }

  const header = headers.get("set-cookie")
  return header ? [header] : []
}

export function updateCookiesFromHeaders(cookies: Map<string, string>, headers: Headers): void {
  for (const headerValue of getSetCookieHeaders(headers)) {
    const cookiePair = headerValue.split(";", 1)[0]
    if (!cookiePair) {
      continue
    }

    const separatorIndex = cookiePair.indexOf("=")
    if (separatorIndex <= 0) {
      continue
    }

    const name = cookiePair.slice(0, separatorIndex).trim()
    const value = cookiePair.slice(separatorIndex + 1).trim()
    if (name) {
      cookies.set(name, value)
    }
  }
}

export function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const object = payload as Record<string, unknown>
  if (typeof object.detail === "string" && object.detail.trim()) {
    return object.detail
  }
  if (typeof object.message === "string" && object.message.trim()) {
    return object.message
  }

  if (Array.isArray(object.errors) && object.errors.length > 0) {
    const firstError = object.errors[0]
    if (firstError && typeof firstError === "object") {
      const firstErrorObject = firstError as Record<string, unknown>
      if (typeof firstErrorObject.detail === "string" && firstErrorObject.detail.trim()) {
        return firstErrorObject.detail
      }
      if (typeof firstErrorObject.message === "string" && firstErrorObject.message.trim()) {
        return firstErrorObject.message
      }
    }
  }

  return fallback
}

function requireZaneDeployConfig(config: AppConfig): {
  connectBaseUrl: string
  connectHostHeader: string | null
  username: string
  password: string
} {
  if (!config.zaneBaseUrl) {
    throw new BadRequestError("ZANE_BASE_URL is required for deploy orchestration")
  }
  if (!config.zaneUsername) {
    throw new BadRequestError("ZANE_USERNAME is required for deploy orchestration")
  }
  if (!config.zanePassword) {
    throw new BadRequestError("ZANE_PASSWORD is required for deploy orchestration")
  }

  return {
    connectBaseUrl: (config.zaneConnectBaseUrl ?? config.zaneBaseUrl).replace(/\/+$/, ""),
    connectHostHeader: config.zaneConnectHostHeader,
    username: config.zaneUsername,
    password: config.zanePassword,
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

  buildHeaders(session: ZaneSession | undefined, method: HttpMethod): Record<string, string> {
    const csrfToken = session?.cookies.get("csrftoken")
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    }

    if (session) {
      const cookieHeader = buildCookieHeader(session.cookies)
      if (cookieHeader) {
        headers.Cookie = cookieHeader
      }
    }

    if (method !== "GET" && csrfToken) {
      headers["X-CSRFToken"] = csrfToken
    }

    if (this.#connectHostHeader) {
      headers.Host = this.#connectHostHeader
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
      if (pending) {
        return await pending
      }
    }

    const initialization = this.initializeSession()
    pendingSessionInitializations.set(this.#sessionCacheKey, initialization)

    try {
      const session = await initialization
      cachedSessions.set(this.#sessionCacheKey, {
        session,
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
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
    payload?: unknown,
    options?: ZaneRequestOptions,
  ): Promise<T | null> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers: this.buildHeaders(session, method),
      body: payload == null ? undefined : JSON.stringify(payload),
    })

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (options?.allowNotFound && response.status === 404) {
      return null
    }

    if ((response.status === 401 || response.status === 403) && options?.retryOnAuthFailure !== false) {
      this.invalidateSessionCache()
      const freshSession = await this.authenticate(true)
      return await this.request(freshSession, method, path, payload, {
        ...options,
        retryOnAuthFailure: false,
      })
    }

    if (!response.ok) {
      let errorMessage = `ZaneOps request failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(response.status, "zane_request_failed", errorMessage)
    }

    if (response.status === 204) {
      return null
    }

    return (await response.json()) as T
  }

  private async initializeSession(): Promise<ZaneSession> {
    const session: ZaneSession = {
      cookies: new Map<string, string>(),
    }

    const csrfResponse = await fetch(`${this.#baseUrl}/api/csrf/`, {
      method: "GET",
      headers: this.buildHeaders(session, "GET"),
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
    if (!csrfToken) {
      throw new UpstreamHttpError(502, "zane_csrf_missing", "ZaneOps did not issue a csrftoken cookie")
    }

    const loginResponse = await fetch(`${this.#baseUrl}/api/auth/login/`, {
      method: "POST",
      headers: this.buildHeaders(session, "POST"),
      body: JSON.stringify({
        username: this.#username,
        password: this.#password,
      }),
    })

    updateCookiesFromHeaders(session.cookies, loginResponse.headers)
    if (!loginResponse.ok) {
      let errorMessage = `ZaneOps login failed (HTTP ${loginResponse.status})`
      try {
        errorMessage = parseErrorMessage(await loginResponse.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(loginResponse.status, "zane_login_failed", errorMessage)
    }

    if (!session.cookies.get("sessionid")) {
      throw new UpstreamHttpError(502, "zane_session_missing", "ZaneOps login did not return a session cookie")
    }

    return session
  }

  private invalidateSessionCache(): void {
    cachedSessions.delete(this.#sessionCacheKey)
    pendingSessionInitializations.delete(this.#sessionCacheKey)
  }
}
