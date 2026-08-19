import { describe, expect, it, vi } from "vitest"
import {
  createUrlRegistryInvalidationConsumer,
  UrlRegistryInvalidationConflictError,
} from "./invalidation-consumer"
import type { UrlRegistryInvalidationDeliveryV1 } from "./invalidation-contract"

const delivery = (
  outboxEventId = "123",
  tags: readonly string[] = ["market:sk", "sitemap:sk"]
): UrlRegistryInvalidationDeliveryV1 => ({
  outboxEventId,
  schemaVersion: 1,
  tags,
})

describe("URL registry invalidation consumer", () => {
  it("immediately expires every bounded tag with the explicit Next profile", async () => {
    const revalidateTag = vi.fn()
    const consumer = createUrlRegistryInvalidationConsumer({ revalidateTag })

    await expect(consumer.consume(delivery())).resolves.toEqual({
      invalidatedTagCount: 2,
      outboxEventId: "123",
      replayed: false,
      schemaVersion: 1,
    })
    expect(revalidateTag.mock.calls).toEqual([
      ["market:sk", { expire: 0 }],
      ["sitemap:sk", { expire: 0 }],
    ])
  })

  it("coalesces concurrent and later exact event-ID replays", async () => {
    let release: (() => void) | undefined
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const revalidateTag = vi.fn(() => blocked)
    const consumer = createUrlRegistryInvalidationConsumer({ revalidateTag })

    const first = consumer.consume(delivery())
    const replay = consumer.consume(delivery())
    await vi.waitFor(() => expect(revalidateTag).toHaveBeenCalledOnce())
    release?.()

    await expect(first).resolves.toMatchObject({ replayed: false })
    await expect(replay).resolves.toMatchObject({ replayed: true })
    await expect(consumer.consume(delivery())).resolves.toMatchObject({
      replayed: true,
    })
    expect(revalidateTag).toHaveBeenCalledTimes(2)
  })

  it("rejects payload drift for an immutable outbox event ID", async () => {
    const consumer = createUrlRegistryInvalidationConsumer({
      revalidateTag: vi.fn(),
    })
    await consumer.consume(delivery())

    await expect(
      consumer.consume(delivery("123", ["market:cz"]))
    ).rejects.toBeInstanceOf(UrlRegistryInvalidationConflictError)
  })

  it("forgets a failed attempt so a retry can succeed", async () => {
    const revalidateTag = vi
      .fn()
      .mockRejectedValueOnce(new Error("cache unavailable"))
      .mockResolvedValue(undefined)
    const consumer = createUrlRegistryInvalidationConsumer({ revalidateTag })

    await expect(consumer.consume(delivery())).rejects.toThrow(
      "cache unavailable"
    )
    await expect(consumer.consume(delivery())).resolves.toMatchObject({
      replayed: false,
    })
    expect(revalidateTag).toHaveBeenCalledTimes(3)
  })

  it("bounds remembered event IDs without changing replay safety", async () => {
    const revalidateTag = vi.fn()
    const consumer = createUrlRegistryInvalidationConsumer({
      maxRememberedEvents: 1,
      revalidateTag,
    })
    await consumer.consume(delivery("1"))
    await consumer.consume(delivery("2"))

    await expect(consumer.consume(delivery("1"))).resolves.toMatchObject({
      replayed: false,
    })
  })

  it("never evicts an in-flight event while enforcing the replay bound", async () => {
    let releaseFirst: (() => void) | undefined
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const revalidateTag = vi.fn((tag: string) =>
      tag === "market:sk" ? firstBlocked : undefined
    )
    const consumer = createUrlRegistryInvalidationConsumer({
      maxRememberedEvents: 1,
      revalidateTag,
    })

    const first = consumer.consume(delivery("1", ["market:sk"]))
    await vi.waitFor(() => expect(revalidateTag).toHaveBeenCalledOnce())
    await consumer.consume(delivery("2", ["market:cz"]))
    const replay = consumer.consume(delivery("1", ["market:sk"]))

    expect(revalidateTag).toHaveBeenCalledTimes(2)
    releaseFirst?.()
    await expect(first).resolves.toMatchObject({ replayed: false })
    await expect(replay).resolves.toMatchObject({ replayed: true })
  })
})
