import { describe, expect, it, vi } from "vitest"
import { readBoundedTextBody } from "./bounded-body-reader"

const streamingRequest = (stream: ReadableStream<Uint8Array>) =>
  new Request("https://internal.test/lifecycle", {
    body: stream,
    duplex: "half",
    method: "POST",
  } as RequestInit & { duplex: "half" })

describe("readBoundedTextBody", () => {
  it("reads a streamed UTF-8 body up to the exact byte limit", async () => {
    const encoder = new TextEncoder()
    const request = streamingRequest(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("ab"))
          controller.enqueue(encoder.encode("č"))
          controller.close()
        },
      })
    )

    await expect(readBoundedTextBody(request, 4)).resolves.toEqual({
      kind: "text",
      value: "abč",
    })
  })

  it("cancels a stream as soon as the cumulative byte limit is exceeded", async () => {
    const cancel = vi.fn()
    const request = streamingRequest(
      new ReadableStream({
        cancel,
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]))
          controller.enqueue(new Uint8Array([4, 5]))
        },
      })
    )

    await expect(readBoundedTextBody(request, 4)).resolves.toEqual({
      kind: "too-large",
    })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("rejects a declared oversized body without consuming its stream", async () => {
    const request = new Request("https://internal.test/lifecycle", {
      body: "{}",
      headers: { "content-length": "65" },
      method: "POST",
    })

    await expect(readBoundedTextBody(request, 64)).resolves.toEqual({
      kind: "too-large",
    })
    expect(request.bodyUsed).toBe(false)
  })

  it("rejects malformed UTF-8", async () => {
    const request = streamingRequest(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0xc3, 0x28]))
          controller.close()
        },
      })
    )

    await expect(readBoundedTextBody(request, 64)).resolves.toEqual({
      kind: "invalid-encoding",
    })
  })
})
