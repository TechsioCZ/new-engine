import { createHash } from "node:crypto"
import type { UrlRegistryInvalidationDeliveryV1 } from "./invalidation-contract"

type RevalidateTag = (
  tag: string,
  profile: Readonly<{ expire: 0 }>
) => Promise<void> | void

type InvalidationConsumerDependencies = Readonly<{
  maxRememberedEvents?: number
  revalidateTag: RevalidateTag
}>

export type UrlRegistryInvalidationAcknowledgement = Readonly<{
  invalidatedTagCount: number
  outboxEventId: string
  replayed: boolean
  schemaVersion: 1
}>

type RememberedEvent = {
  fingerprint: string
  result: Promise<void>
  state: "completed" | "pending"
}

export class UrlRegistryInvalidationConflictError extends Error {
  readonly code = "EVENT_ID_CONFLICT"

  constructor() {
    super("URL registry invalidation event ID was reused with another payload")
    this.name = "UrlRegistryInvalidationConflictError"
  }
}

const deliveryFingerprint = (
  delivery: UrlRegistryInvalidationDeliveryV1
): string =>
  createHash("sha256")
    .update(JSON.stringify([delivery.schemaVersion, delivery.tags]))
    .digest("hex")

const acknowledgement = (
  delivery: UrlRegistryInvalidationDeliveryV1,
  replayed: boolean
): UrlRegistryInvalidationAcknowledgement => ({
  invalidatedTagCount: delivery.tags.length,
  outboxEventId: delivery.outboxEventId,
  replayed,
  schemaVersion: 1,
})

export const createUrlRegistryInvalidationConsumer = ({
  maxRememberedEvents = 4096,
  revalidateTag,
}: InvalidationConsumerDependencies) => {
  if (!(Number.isSafeInteger(maxRememberedEvents) && maxRememberedEvents > 0)) {
    throw new RangeError("maxRememberedEvents must be a positive safe integer")
  }

  const remembered = new Map<string, RememberedEvent>()

  const enforceBound = () => {
    while (remembered.size > maxRememberedEvents) {
      const oldestCompleted = [...remembered].find(
        ([, event]) => event.state === "completed"
      )?.[0]
      if (typeof oldestCompleted !== "string") {
        return
      }
      remembered.delete(oldestCompleted)
    }
  }

  return Object.freeze({
    async consume(
      delivery: UrlRegistryInvalidationDeliveryV1
    ): Promise<UrlRegistryInvalidationAcknowledgement> {
      const fingerprint = deliveryFingerprint(delivery)
      const prior = remembered.get(delivery.outboxEventId)
      if (prior) {
        if (prior.fingerprint !== fingerprint) {
          throw new UrlRegistryInvalidationConflictError()
        }
        await prior.result
        return acknowledgement(delivery, true)
      }

      const result = Promise.resolve().then(async () => {
        for (const tag of delivery.tags) {
          await revalidateTag(tag, { expire: 0 })
        }
      })
      const event: RememberedEvent = {
        fingerprint,
        result,
        state: "pending",
      }
      remembered.set(delivery.outboxEventId, event)
      try {
        await result
        event.state = "completed"
        enforceBound()
        return acknowledgement(delivery, false)
      } catch (error) {
        if (remembered.get(delivery.outboxEventId) === event) {
          remembered.delete(delivery.outboxEventId)
        }
        throw error
      }
    },
  })
}

export type UrlRegistryInvalidationConsumer = ReturnType<
  typeof createUrlRegistryInvalidationConsumer
>
