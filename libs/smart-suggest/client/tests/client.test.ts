import { describe, expect, it, vi } from "vitest"

import {
  createSmartSuggestClient,
  type SmartSuggestClientError,
  type SmartSuggestFetch,
} from "../src/index"

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

describe("createSmartSuggestClient", () => {
  it("calls suggest with query parameters and injectable fetch", async () => {
    const fetchMock = vi.fn<SmartSuggestFetch>(async () =>
      jsonResponse({
        cacheStatus: "miss",
        requestId: "request-1",
        suggestions: [],
      })
    )
    const client = createSmartSuggestClient({
      apiBaseUrl: "/smart-api",
      fetch: fetchMock,
    })

    await expect(
      client.suggest({
        countryCode: "CZ",
        kind: "address",
        limit: 5,
        query: "Praha",
        tenant: { tenantId: "tenant-a" },
      })
    ).resolves.toMatchObject({ requestId: "request-1" })

    expect(fetchMock).toHaveBeenCalledWith(
      "/smart-api/v1/suggest?kind=address&q=Praha&countryCode=CZ&limit=5&tenantId=tenant-a",
      expect.objectContaining({ method: "GET" })
    )
  })

  it("posts accept and validation requests", async () => {
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
    const client = createSmartSuggestClient({ fetch: fetchMock })

    await expect(
      client.accept({
        acceptedAt: "2026-06-26T12:00:00.000Z",
        requestId: "request-1",
        source: { id: "source-1", kind: "owned-dataset", name: "Sample" },
        suggestionId: "suggestion-1",
      })
    ).resolves.toEqual({ accepted: true })
    await expect(
      client.validatePhone({ rawInput: "+420777123456" })
    ).resolves.toMatchObject({ e164: "+420777123456" })
    await expect(
      client.validatePostal({ countryCode: "CZ", rawInput: "12345" })
    ).resolves.toMatchObject({ displayValue: "123 45" })

    expect(calls).toEqual([
      "/api/v1/accept",
      "/api/v1/validate/phone",
      "/api/v1/validate/postal",
    ])
  })

  it("throws typed API errors", async () => {
    const client = createSmartSuggestClient({
      fetch: async () =>
        jsonResponse(
          {
            errors: [{ code: "bad-request", message: "Bad input" }],
            message: "Bad input",
          },
          { status: 400, statusText: "Bad Request" }
        ),
    })

    await expect(
      client.validatePostal({ countryCode: "CZ", rawInput: "" })
    ).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: "bad-request" })],
      status: 400,
    } satisfies Partial<SmartSuggestClientError>)
  })

  it("uses AbortController for request timeouts", async () => {
    const client = createSmartSuggestClient({
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason)
          })
        }),
      timeoutMs: 1,
    })

    await expect(
      client.validatePhone({ rawInput: "+420777123456" })
    ).rejects.toMatchObject({ name: "TimeoutError" })
  })
})
