import type { PayloadRequest } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createRequestTimeout,
  shouldReturnHtmlForRequest,
} from "@/lib/utils/request"

describe("request utilities", () => {
  describe("createRequestTimeout", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("returns an AbortController and clearTimeout function", () => {
      const result = createRequestTimeout(5000)

      expect(result.controller).toBeInstanceOf(AbortController)
      expect(typeof result.clearTimeout).toBe("function")
    })

    it("aborts after the specified timeout", () => {
      const { controller } = createRequestTimeout(5000)

      expect(controller.signal.aborted).toBe(false)

      vi.advanceTimersByTime(5000)

      expect(controller.signal.aborted).toBe(true)
    })

    it("does not abort before timeout", () => {
      const { controller } = createRequestTimeout(5000)

      vi.advanceTimersByTime(4999)

      expect(controller.signal.aborted).toBe(false)
    })

    it("clearTimeout prevents abort", () => {
      const { controller, clearTimeout } = createRequestTimeout(5000)

      vi.advanceTimersByTime(2000)
      clearTimeout()
      vi.advanceTimersByTime(5000)

      expect(controller.signal.aborted).toBe(false)
    })

    it("handles zero timeout (immediate abort)", () => {
      const { controller } = createRequestTimeout(0)

      vi.advanceTimersByTime(1)

      expect(controller.signal.aborted).toBe(true)
    })

    it("handles large timeout values", () => {
      const { controller } = createRequestTimeout(60_000)

      vi.advanceTimersByTime(59_999)
      expect(controller.signal.aborted).toBe(false)

      vi.advanceTimersByTime(1)
      expect(controller.signal.aborted).toBe(true)
    })
  })

  describe("shouldReturnHtmlForRequest", () => {
    const createMockRequest = (
      method: string,
      headerValue?: string
    ): PayloadRequest => {
      const headers = new Headers()
      if (headerValue !== undefined) {
        headers.set("x-payload-return-html", headerValue)
      }

      return {
        method,
        headers,
      } as unknown as PayloadRequest
    }

    it('returns true for GET request with header set to "true"', () => {
      const req = createMockRequest("GET", "true")
      expect(shouldReturnHtmlForRequest(req)).toBe(true)
    })

    it("returns false for GET request without header", () => {
      const req = createMockRequest("GET")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it('returns false for GET request with header set to "false"', () => {
      const req = createMockRequest("GET", "false")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false for POST request even with header", () => {
      const req = createMockRequest("POST", "true")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false for PUT request even with header", () => {
      const req = createMockRequest("PUT", "true")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false for DELETE request even with header", () => {
      const req = createMockRequest("DELETE", "true")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false for undefined request", () => {
      expect(shouldReturnHtmlForRequest(undefined)).toBe(false)
    })

    it("returns false for null request", () => {
      expect(
        shouldReturnHtmlForRequest(null as unknown as PayloadRequest)
      ).toBe(false)
    })

    it("returns false when headers object is missing", () => {
      const req = { method: "GET" } as unknown as PayloadRequest
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false when headers.get is not a function", () => {
      const req = {
        method: "GET",
        headers: {},
      } as unknown as PayloadRequest
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("is case-sensitive for header value", () => {
      const req = createMockRequest("GET", "TRUE")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })

    it("returns false for empty header value", () => {
      const req = createMockRequest("GET", "")
      expect(shouldReturnHtmlForRequest(req)).toBe(false)
    })
  })
})
