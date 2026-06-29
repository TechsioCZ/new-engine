import { readFile } from "node:fs/promises"
import { describe, expect, it, vi } from "@effect/vitest"
import { squash } from "effect/Cause"
import * as Effect from "effect/Effect"
import { isFailure } from "effect/Exit"
import * as Fiber from "effect/Fiber"
import {
  createSmartSuggestEffectClient,
  type SmartSuggestClientError,
  type SmartSuggestFetch,
} from "../src/client"

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const responseInit: ResponseInit = {
    headers: { "content-type": "application/json" },
    status: init?.status ?? 200,
  }

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText
  }

  return new Response(JSON.stringify(body), responseInit)
}

const expectFetchGet = (
  fetchMock: {
    mock: {
      calls: Array<Parameters<SmartSuggestFetch>>
    }
  },
  pathname: string,
  query: Record<string, string>
) => {
  const [input, init] = fetchMock.mock.calls[0] ?? []
  const url = new URL(String(input), "https://smart-suggest.test")

  expect(url.pathname).toBe(pathname)
  expect(Object.fromEntries(url.searchParams)).toEqual(query)
  expect(init).toEqual(expect.objectContaining({ method: "GET" }))
}

const importSpecifierPattern = /from\s+"([^"]+)"/gu
const manualHttpPathPattern = /["'`]\/v1\//u
const forbiddenClientImportPattern =
  /(?:^react$|@techsio\/ui-kit|@techsio\/smart-suggest-(?:integrations|react|storage|ui)|drizzle|cloudflare|@cloudflare)/u
const forbiddenRuntimeGlobalPattern = new RegExp(
  `\\b(?:${["D1", "Database"].join("")}|${["Execution", "Context"].join(
    ""
  )})\\b`,
  "u"
)

describe("createSmartSuggestEffectClient", () => {
  it.effect("exposes a lazy Effect-native client", () =>
    Effect.gen(function* effectNativeClientProgram() {
      const fetchMock = vi.fn<SmartSuggestFetch>(async () =>
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-effect",
          suggestions: [],
        })
      )
      const client = createSmartSuggestEffectClient({
        apiBaseUrl: "/smart-api",
        fetch: fetchMock,
      })
      const effect = client.suggest({
        countryCode: "CZ",
        kind: "address",
        query: "Praha",
      })

      expect(fetchMock).not.toHaveBeenCalled()

      const response = yield* effect

      expect(response).toMatchObject({
        requestId: "request-effect",
      })
      expectFetchGet(fetchMock, "/smart-api/v1/suggest", {
        countryCode: "CZ",
        kind: "address",
        q: "Praha",
      })
    })
  )

  it.effect("calls suggest with query parameters and injectable fetch", () =>
    Effect.gen(function* suggestQueryParametersProgram() {
      const fetchMock = vi.fn<SmartSuggestFetch>(async () =>
        jsonResponse({
          cacheStatus: "miss",
          requestId: "request-1",
          suggestions: [],
        })
      )
      const client = createSmartSuggestEffectClient({
        apiBaseUrl: "/smart-api",
        fetch: fetchMock,
      })

      const response = yield* client.suggest({
        countryCode: "CZ",
        kind: "address",
        limit: 5,
        query: "Praha",
        tenant: { tenantId: "tenant-a" },
      })

      expect(response).toMatchObject({ requestId: "request-1" })
      expectFetchGet(fetchMock, "/smart-api/v1/suggest", {
        countryCode: "CZ",
        kind: "address",
        limit: "5",
        q: "Praha",
        tenantId: "tenant-a",
      })
    })
  )

  it.effect("posts accept and validation requests", () =>
    Effect.gen(function* postRequestsProgram() {
      const calls: string[] = []
      const fetchMock: SmartSuggestFetch = (input) => {
        calls.push(String(input))

        if (String(input).endsWith("/accept")) {
          return Promise.resolve(jsonResponse({ accepted: true }))
        }

        if (String(input).endsWith("/phone")) {
          return Promise.resolve(
            jsonResponse({
              displayValue: "+420 777 123 456",
              e164: "+420777123456",
              errors: [],
              isPossible: true,
              isValid: true,
              rawInput: "+420777123456",
            })
          )
        }

        return Promise.resolve(
          jsonResponse({
            countryCode: "CZ",
            displayValue: "123 45",
            errors: [],
            inputHints: { autoComplete: "postal-code", inputMode: "numeric" },
            isValid: true,
            normalizedValue: "12345",
            rawInput: "12345",
          })
        )
      }
      const client = createSmartSuggestEffectClient({ fetch: fetchMock })

      const acceptResponse = yield* client.accept({
        acceptedAt: "2026-06-26T12:00:00.000Z",
        requestId: "request-1",
        source: { id: "source-1", kind: "owned-dataset", name: "Sample" },
        suggestionId: "suggestion-1",
      })
      const phoneResponse = yield* client.validatePhone({
        rawInput: "+420777123456",
      })
      const postalResponse = yield* client.validatePostal({
        countryCode: "CZ",
        rawInput: "12345",
      })

      expect(acceptResponse).toEqual({ accepted: true })
      expect(phoneResponse).toMatchObject({ e164: "+420777123456" })
      expect(postalResponse).toMatchObject({ displayValue: "123 45" })
      expect(calls).toEqual([
        "/api/v1/accept",
        "/api/v1/validate/phone",
        "/api/v1/validate/postal",
      ])
    })
  )

  it.effect("fails with typed API errors", () =>
    Effect.gen(function* badRequestProgram() {
      const client = createSmartSuggestEffectClient({
        fetch: async () =>
          jsonResponse(
            {
              _tag: "SmartSuggestBadRequestError",
              errors: [{ code: "bad-request", message: "Bad input" }],
              message: "Bad input",
            },
            { status: 400, statusText: "Bad Request" }
          ),
      })

      const exit = yield* Effect.exit(
        client.validatePostal({ countryCode: "CZ", rawInput: "" })
      )

      expect(isFailure(exit)).toBe(true)

      if (!isFailure(exit)) {
        return
      }

      expect(squash(exit.cause)).toMatchObject({
        errors: [expect.objectContaining({ code: "bad-request" })],
        status: 400,
      } satisfies Partial<SmartSuggestClientError>)
    })
  )

  it.effect("fails Effect programs with typed API errors", () =>
    Effect.gen(function* typedApiErrorProgram() {
      const client = createSmartSuggestEffectClient({
        fetch: async () =>
          jsonResponse(
            {
              _tag: "SmartSuggestValidationError",
              errors: [
                { code: "validation-error", message: "Bad postal code" },
              ],
              message: "Bad postal code",
            },
            { status: 422, statusText: "Unprocessable Entity" }
          ),
      })

      const exit = yield* Effect.exit(
        client.validatePostal({ countryCode: "CZ", rawInput: "" })
      )

      expect(isFailure(exit)).toBe(true)

      if (!isFailure(exit)) {
        return
      }

      expect(squash(exit.cause)).toMatchObject({
        errors: [expect.objectContaining({ code: "validation-error" })],
        status: 422,
      } satisfies Partial<SmartSuggestClientError>)
    })
  )

  it.live("uses AbortController for request timeouts", () =>
    Effect.gen(function* requestTimeoutProgram() {
      vi.useFakeTimers()

      try {
        const client = createSmartSuggestEffectClient({
          fetch: (_input, init) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                reject(init.signal?.reason)
              })
            }),
          timeoutMs: 10,
        })
        const fiber = yield* client
          .validatePhone({ rawInput: "+420777123456" })
          .pipe(Effect.forkChild({ startImmediately: true }))

        yield* Effect.promise(() => vi.advanceTimersByTimeAsync(11))

        const exit = yield* Effect.exit(Fiber.join(fiber))

        expect(isFailure(exit)).toBe(true)

        if (!isFailure(exit)) {
          return
        }

        expect(squash(exit.cause)).toMatchObject({ name: "TimeoutError" })
      } finally {
        vi.useRealTimers()
      }
    })
  )

  it.effect("propagates external aborts through the Effect client", () =>
    Effect.gen(function* externalAbortProgram() {
      const abortReason = new DOMException("User aborted.", "AbortError")
      const controller = new AbortController()
      controller.abort(abortReason)
      const client = createSmartSuggestEffectClient({
        fetch: (_input, init) => {
          if (init?.signal?.aborted === true) {
            return Promise.reject(init.signal.reason)
          }

          return Promise.resolve(
            jsonResponse({
              cacheStatus: "miss",
              requestId: "request-abort",
              suggestions: [],
            })
          )
        },
      })

      const exit = yield* Effect.exit(
        client.suggest(
          {
            kind: "address",
            query: "Praha",
          },
          { signal: controller.signal }
        )
      )

      expect(isFailure(exit)).toBe(true)

      if (!isFailure(exit)) {
        return
      }

      expect(squash(exit.cause)).toMatchObject({ name: "AbortError" })
    })
  )

  it("keeps generated HttpApi construction and import boundaries intact", async () => {
    const source = await readFile(new URL("../src/client.ts", import.meta.url), {
      encoding: "utf8",
    })
    const importSpecifiers = Array.from(
      source.matchAll(importSpecifierPattern),
      ([, specifier]) => specifier
    )

    expect(importSpecifiers).toContain("./api")
    expect(importSpecifiers).not.toContain("@smart-suggest/shell-super-app/api")
    expect(importSpecifiers).toContain("effect/unstable/httpapi")
    expect(source).toContain("HttpApiClient.makeWith(SmartSuggestHttpApi")
    expect(source).not.toContain("createSmartSuggestClient")
    expect(source).not.toContain("promiseCompatibilityAdapter")
    expect(source).not.toContain("runCallback")
    expect(source).not.toMatch(manualHttpPathPattern)
    expect(source).not.toContain("URLSearchParams")
    expect(source).not.toContain("JSON.stringify(")

    for (const specifier of importSpecifiers) {
      expect(specifier).not.toMatch(forbiddenClientImportPattern)
    }

    expect(source).not.toMatch(forbiddenRuntimeGlobalPattern)
  })
})
