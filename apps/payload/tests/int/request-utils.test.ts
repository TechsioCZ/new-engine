import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  createRequestTimeout,
  shouldReturnHtmlForRequest,
} from "@/lib/utils/request"

const createMockRequest = (method: string, headerValue?: string): unknown => {
  const headers = new Headers()
  if (headerValue !== undefined) {
    headers.set("x-payload-return-html", headerValue)
  }

  return { headers, method }
}

const callShouldReturnHtmlForRequest = (req?: unknown): boolean => {
  const result: unknown = Reflect.apply(shouldReturnHtmlForRequest, undefined, [
    req,
  ])
  if (typeof result === "boolean") {
    return result
  }
  throw new TypeError("shouldReturnHtmlForRequest returned an invalid value")
}

describe("request utilities", () => {
  describe(createRequestTimeout, () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("returns an AbortController and clearTimeout function", () => {
      const result = createRequestTimeout(5000)
      expect(result.controller).toBeInstanceOf(AbortController)
      expect(result.clearTimeout).toBeTypeOf("function")
    })

    it("aborts after the specified timeout", () => {
      const { controller } = createRequestTimeout(5000)
      expect(controller.signal.aborted).toBeFalsy()
      vi.advanceTimersByTime(5000)
      expect(controller.signal.aborted).toBeTruthy()
    })

    it("does not abort before timeout", () => {
      const { controller } = createRequestTimeout(5000)
      vi.advanceTimersByTime(4999)
      expect(controller.signal.aborted).toBeFalsy()
    })

    it("clearTimeout prevents abort", () => {
      const { controller, clearTimeout } = createRequestTimeout(5000)
      vi.advanceTimersByTime(2000)
      clearTimeout()
      vi.advanceTimersByTime(5000)
      expect(controller.signal.aborted).toBeFalsy()
    })

    it("handles zero timeout (immediate abort)", () => {
      const { controller } = createRequestTimeout(0)
      vi.advanceTimersByTime(1)
      expect(controller.signal.aborted).toBeTruthy()
    })

    it("handles large timeout values", () => {
      const { controller } = createRequestTimeout(60_000)
      vi.advanceTimersByTime(59_999)
      expect(controller.signal.aborted).toBeFalsy()
      vi.advanceTimersByTime(1)
      expect(controller.signal.aborted).toBeTruthy()
    })
  })

  describe(shouldReturnHtmlForRequest, () => {
    it('returns true for GET request with header set to "true"', () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("GET", "true")),
      ).toBeTruthy()
    })

    it("returns false for GET request without header", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("GET")),
      ).toBeFalsy()
    })

    it('returns false for GET request with header set to "false"', () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("GET", "false")),
      ).toBeFalsy()
    })

    it("returns false for POST request even with header", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("POST", "true")),
      ).toBeFalsy()
    })

    it("returns false for PUT request even with header", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("PUT", "true")),
      ).toBeFalsy()
    })

    it("returns false for DELETE request even with header", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("DELETE", "true")),
      ).toBeFalsy()
    })

    it("returns false for undefined request", () => {
      expect(callShouldReturnHtmlForRequest()).toBeFalsy()
    })

    it("returns false for null request", () => {
      expect(callShouldReturnHtmlForRequest(null)).toBeFalsy()
    })

    it("returns false when headers object is missing", () => {
      expect(callShouldReturnHtmlForRequest({ method: "GET" })).toBeFalsy()
    })

    it("returns false when headers.get is not a function", () => {
      expect(
        callShouldReturnHtmlForRequest({ headers: {}, method: "GET" }),
      ).toBeFalsy()
    })

    it("is case-sensitive for header value", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("GET", "TRUE")),
      ).toBeFalsy()
    })

    it("returns false for empty header value", () => {
      expect(
        callShouldReturnHtmlForRequest(createMockRequest("GET", "")),
      ).toBeFalsy()
    })
  })
})
