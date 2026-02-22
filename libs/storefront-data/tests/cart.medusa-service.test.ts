import type { HttpTypes } from "@medusajs/types"
import { createMedusaCartService } from "../src/cart/medusa-service"

type SdkLike = {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
  store: {
    cart: {
      retrieve: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      createLineItem: ReturnType<typeof vi.fn>
      updateLineItem: ReturnType<typeof vi.fn>
      deleteLineItem: ReturnType<typeof vi.fn>
      transferCart: ReturnType<typeof vi.fn>
      complete: ReturnType<typeof vi.fn>
    }
  }
}

function createSdkMock(
  fetchImpl?: (
    path: string,
    init?: { signal?: AbortSignal }
  ) => Promise<{ cart?: HttpTypes.StoreCart | null }>
): SdkLike {
  return {
    client: {
      fetch: vi
        .fn()
        .mockImplementation(
          fetchImpl ??
            ((path: string) =>
              Promise.resolve({
                cart: {
                  id: path.replace("/store/carts/", ""),
                } as HttpTypes.StoreCart,
              }))
        ),
    },
    store: {
      cart: {
        retrieve: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        createLineItem: vi.fn(),
        updateLineItem: vi.fn(),
        deleteLineItem: vi.fn(),
        transferCart: vi.fn(),
        complete: vi.fn(),
      },
    },
  }
}

describe("createMedusaCartService", () => {
  it("returns cart when retrieve succeeds", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCartService(sdk as never)

    const result = await service.retrieveCart("cart_1")

    expect(result).toEqual({ id: "cart_1" })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/carts/cart_1", {
      signal: undefined,
    })
  })

  it("forwards AbortSignal to retrieve cart request", async () => {
    const sdk = createSdkMock()
    const service = createMedusaCartService(sdk as never)
    const controller = new AbortController()

    await service.retrieveCart("cart_1", controller.signal)

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/carts/cart_1", {
      signal: controller.signal,
    })
  })

  it("returns null when API response has no cart payload", async () => {
    const sdk = createSdkMock(async () => ({ cart: undefined }))
    const service = createMedusaCartService(sdk as never)

    const result = await service.retrieveCart("cart_empty")

    expect(result).toBeNull()
  })

  it("returns null for top-level 404 errors", async () => {
    const sdk = createSdkMock(async () => {
      throw { status: 404 }
    })
    const service = createMedusaCartService(sdk as never)

    const result = await service.retrieveCart("cart_missing")

    expect(result).toBeNull()
  })

  it("returns null for wrapped 404 errors in response.status", async () => {
    const sdk = createSdkMock(async () => {
      throw { response: { status: 404 } }
    })
    const service = createMedusaCartService(sdk as never)

    const result = await service.retrieveCart("cart_missing")

    expect(result).toBeNull()
  })

  it("uses custom not-found detector for non-standard error shapes", async () => {
    const error = { code: "STALE_CART_ID" }
    const detector = vi.fn((err: unknown) => {
      if (!err || typeof err !== "object") {
        return false
      }
      return "code" in err && err.code === "STALE_CART_ID"
    })
    const sdk = createSdkMock(async () => {
      throw error
    })
    const service = createMedusaCartService(sdk as never, {
      isNotFoundError: detector,
    })

    const result = await service.retrieveCart("cart_missing")

    expect(detector).toHaveBeenCalledWith(error)
    expect(result).toBeNull()
  })

  it("rethrows non not-found errors", async () => {
    const error = { status: 500, message: "Internal Server Error" }
    const sdk = createSdkMock(async () => {
      throw error
    })
    const service = createMedusaCartService(sdk as never)

    await expect(service.retrieveCart("cart_1")).rejects.toBe(error)
  })
})

