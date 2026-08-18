import { describe, expect, it, vi } from "vitest"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../../src/modules/url-registry-outbox"
import { UrlRegistryOutboxInputError } from "../../../src/modules/url-registry-outbox/types"
import productLifecycleUrlRegistryHandler, {
  config,
} from "../../../src/subscribers/product-lifecycle-url-registry"
import {
  type ProductLifecycleOutboxInput,
  URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
} from "../../../src/workflows/url-registry-outbox/product-lifecycle-event"

const INPUT = {
  affectedMarketCodes: ["sk", "cz", "hu", "ro"],
  eventId:
    "sha256:100b6121b095b337c4e1114c1002fd8322cced3434358b032dc49923841b847a",
  occurredAt: "2016-07-30T23:16:16.385Z",
  productId: "prod_01ABC",
  reason: "updated",
} as const satisfies ProductLifecycleOutboxInput

const event = (
  data: unknown = INPUT,
  name = URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT
) => ({
  data,
  metadata: {},
  name,
})

describe("product lifecycle URL registry subscriber", () => {
  it("subscribes only to the retryable custom lifecycle event", () => {
    expect(config).toEqual({
      event: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
    })
  })

  it("enqueues the validated high-level event without reading a product", async () => {
    const enqueueProductLifecycleEvent = vi.fn().mockResolvedValue(undefined)
    const resolve = vi.fn((key: string) => {
      if (key !== URL_REGISTRY_OUTBOX_MODULE) {
        throw new Error(`Unexpected container resolution: ${key}`)
      }
      return { enqueueProductLifecycleEvent }
    })

    await productLifecycleUrlRegistryHandler({
      container: { resolve },
      event: event(),
      pluginOptions: {},
    } as never)

    expect(resolve).toHaveBeenCalledOnce()
    expect(resolve).toHaveBeenCalledWith(URL_REGISTRY_OUTBOX_MODULE)
    expect(enqueueProductLifecycleEvent).toHaveBeenCalledOnce()
    expect(enqueueProductLifecycleEvent).toHaveBeenCalledWith(INPUT)
  })

  it("propagates enqueue failures so Redis can retry the custom job", async () => {
    const failure = new Error("outbox unavailable")
    const enqueueProductLifecycleEvent = vi.fn().mockRejectedValue(failure)
    const resolve = vi.fn(() => ({ enqueueProductLifecycleEvent }))

    await expect(
      productLifecycleUrlRegistryHandler({
        container: { resolve },
        event: event(),
        pluginOptions: {},
      } as never)
    ).rejects.toBe(failure)
  })

  it("rejects a wrong topic or malformed payload before resolving the outbox", async () => {
    const resolve = vi.fn()

    await expect(
      productLifecycleUrlRegistryHandler({
        container: { resolve },
        event: event(INPUT, "product.updated"),
        pluginOptions: {},
      } as never)
    ).rejects.toBeInstanceOf(UrlRegistryOutboxInputError)
    await expect(
      productLifecycleUrlRegistryHandler({
        container: { resolve },
        event: event({ ...INPUT, unexpected: true }),
        pluginOptions: {},
      } as never)
    ).rejects.toBeInstanceOf(UrlRegistryOutboxInputError)
    expect(resolve).not.toHaveBeenCalled()
  })
})
