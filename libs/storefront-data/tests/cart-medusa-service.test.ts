import type { HttpTypes } from "@medusajs/types"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import type {
  MedusaCartAddItemParams,
  MedusaCartCreateParams,
  MedusaCartUpdateItemParams,
  MedusaCartUpdateParams,
  MedusaCompleteCartResult,
} from "../src/cart/medusa-service"
import { createMedusaCartService } from "../src/cart/medusa-service"
import {
  createStoreCart,
  createStoreOrder,
  createTestMedusaSdk,
} from "./medusa-fixtures"

type FetchCart = (
  path: string,
  init?: {
    query?: HttpTypes.SelectParams
    signal?: AbortSignal | null
  },
) => Promise<{ cart?: HttpTypes.StoreCart | null }>
type CartResponse = Promise<{ cart?: HttpTypes.StoreCart | null }>
type ParentResponse = Promise<{ parent?: HttpTypes.StoreCart | null }>
type CompleteResponse = Promise<MedusaCompleteCartResult>

interface SdkSpies {
  clientFetch: Mock<FetchCart>
  complete: Mock<(cartId: string) => CompleteResponse>
  create: Mock<
    (
      params: MedusaCartCreateParams,
      query?: HttpTypes.SelectParams,
    ) => CartResponse
  >
  createLineItem: Mock<
    (
      cartId: string,
      params: MedusaCartAddItemParams,
      query?: HttpTypes.SelectParams,
    ) => CartResponse
  >
  deleteLineItem: Mock<
    (
      cartId: string,
      lineItemId: string,
      query?: HttpTypes.SelectParams,
    ) => ParentResponse
  >
  transferCart: Mock<
    (cartId: string, query?: HttpTypes.SelectParams) => CartResponse
  >
  update: Mock<
    (
      cartId: string,
      params: MedusaCartUpdateParams,
      query?: HttpTypes.SelectParams,
    ) => CartResponse
  >
  updateLineItem: Mock<
    (
      cartId: string,
      lineItemId: string,
      params: MedusaCartUpdateItemParams,
      query?: HttpTypes.SelectParams,
    ) => CartResponse
  >
}

const createSdkMock = (fetchImpl?: FetchCart) => {
  const sdk = createTestMedusaSdk()
  const spies: SdkSpies = {
    clientFetch: vi.fn<FetchCart>(),
    complete: vi.fn<(cartId: string) => CompleteResponse>(),
    create:
      vi.fn<
        (
          params: MedusaCartCreateParams,
          query?: HttpTypes.SelectParams,
        ) => CartResponse
      >(),
    createLineItem:
      vi.fn<
        (
          cartId: string,
          params: MedusaCartAddItemParams,
          query?: HttpTypes.SelectParams,
        ) => CartResponse
      >(),
    deleteLineItem:
      vi.fn<
        (
          cartId: string,
          lineItemId: string,
          query?: HttpTypes.SelectParams,
        ) => ParentResponse
      >(),
    transferCart:
      vi.fn<(cartId: string, query?: HttpTypes.SelectParams) => CartResponse>(),
    update:
      vi.fn<
        (
          cartId: string,
          params: MedusaCartUpdateParams,
          query?: HttpTypes.SelectParams,
        ) => CartResponse
      >(),
    updateLineItem:
      vi.fn<
        (
          cartId: string,
          lineItemId: string,
          params: MedusaCartUpdateItemParams,
          query?: HttpTypes.SelectParams,
        ) => CartResponse
      >(),
  }

  spies.clientFetch.mockImplementation(
    fetchImpl ??
      (async (path) =>
        await Promise.resolve({
          cart: createStoreCart(path.replace("/store/carts/", "")),
        })),
  )

  Object.defineProperty(sdk.client, "fetch", { value: spies.clientFetch })
  Object.defineProperties(sdk.store.cart, {
    complete: { value: spies.complete },
    create: { value: spies.create },
    createLineItem: { value: spies.createLineItem },
    deleteLineItem: { value: spies.deleteLineItem },
    transferCart: { value: spies.transferCart },
    update: { value: spies.update },
    updateLineItem: { value: spies.updateLineItem },
  })

  return { sdk, spies }
}

const addItemParams: MedusaCartAddItemParams = {
  quantity: 1,
  variant_id: "variant_1",
}
const updateItemParams: MedusaCartUpdateItemParams = { quantity: 2 }

const configureSuccessfulMutationResponses = (spies: SdkSpies) => {
  spies.create.mockResolvedValue({ cart: createStoreCart("cart_created") })
  spies.update.mockResolvedValue({ cart: createStoreCart("cart_updated") })
  spies.createLineItem.mockResolvedValue({
    cart: createStoreCart("cart_with_item"),
  })
  spies.updateLineItem.mockResolvedValue({
    cart: createStoreCart("cart_item_updated"),
  })
  spies.deleteLineItem.mockResolvedValue({
    parent: createStoreCart("cart_item_removed"),
  })
  spies.transferCart.mockResolvedValue({
    cart: createStoreCart("cart_transferred"),
  })
}

describe(createMedusaCartService, () => {
  it("returns cart when retrieve succeeds", async () => {
    const { sdk, spies } = createSdkMock()
    const service = createMedusaCartService(sdk)

    const result = await service.retrieveCart("cart_1")

    expect(result?.id).toBe("cart_1")
    expect(spies.clientFetch).toHaveBeenCalledWith("/store/carts/cart_1", {
      signal: null,
    })
  })

  it("forwards AbortSignal to retrieve cart request", async () => {
    const { sdk, spies } = createSdkMock()
    const service = createMedusaCartService(sdk)
    const controller = new AbortController()

    await service.retrieveCart("cart_1", controller.signal)

    expect(spies.clientFetch).toHaveBeenCalledWith("/store/carts/cart_1", {
      signal: controller.signal,
    })
  })

  it("returns null when API response has no cart payload", async () => {
    const { sdk } = createSdkMock(async () => await Promise.resolve({}))
    const service = createMedusaCartService(sdk)

    const result = await service.retrieveCart("cart_empty")

    expect(result).toBeNull()
  })

  it("returns null for top-level 404 errors", async () => {
    const error = Object.assign(new Error("Cart not found"), { status: 404 })
    const { sdk } = createSdkMock(async () => await Promise.reject(error))
    const service = createMedusaCartService(sdk)

    const result = await service.retrieveCart("cart_missing")

    expect(result).toBeNull()
  })

  it("returns null for wrapped 404 errors in response.status", async () => {
    const error = Object.assign(new Error("Cart not found"), {
      response: { status: 404 },
    })
    const { sdk } = createSdkMock(async () => await Promise.reject(error))
    const service = createMedusaCartService(sdk)

    const result = await service.retrieveCart("cart_missing")

    expect(result).toBeNull()
  })

  it("uses custom not-found detector for non-standard error shapes", async () => {
    const error = Object.assign(new Error("Stale cart ID"), {
      code: "STALE_CART_ID",
    })
    const detector = vi.fn<(error: unknown) => boolean>()
    detector.mockReturnValue(true)
    const { sdk } = createSdkMock(async () => await Promise.reject(error))
    const service = createMedusaCartService(sdk, {
      isNotFoundError: detector,
    })

    const result = await service.retrieveCart("cart_missing")

    expect(detector).toHaveBeenCalledWith(error)
    expect(result).toBeNull()
  })

  it("rethrows non not-found errors", async () => {
    const error = Object.assign(new Error("Internal Server Error"), {
      status: 500,
    })
    const { sdk } = createSdkMock(async () => await Promise.reject(error))
    const service = createMedusaCartService(sdk)

    await expect(service.retrieveCart("cart_1")).rejects.toBe(error)
  })

  it("forwards params and returns carts for mutation methods", async () => {
    const { sdk, spies } = createSdkMock()
    configureSuccessfulMutationResponses(spies)
    const completeResult: MedusaCompleteCartResult = {
      order: createStoreOrder("order_1"),
      type: "order",
    }
    spies.complete.mockResolvedValue(completeResult)
    const service = createMedusaCartService(sdk)

    const results = await Promise.all([
      service.createCart({}),
      service.updateCart("cart_1", {}),
      service.addLineItem("cart_1", addItemParams),
      service.updateLineItem("cart_1", "item_1", updateItemParams),
      service.removeLineItem("cart_1", "item_1"),
      service.transferCart("cart_1"),
    ])
    const completed = await service.completeCart("cart_1")

    expect(results.map((cart) => cart.id)).toStrictEqual([
      "cart_created",
      "cart_updated",
      "cart_with_item",
      "cart_item_updated",
      "cart_item_removed",
      "cart_transferred",
    ])
    expect(completed).toBe(completeResult)
    expect({
      complete: spies.complete.mock.calls,
      create: spies.create.mock.calls,
      createLineItem: spies.createLineItem.mock.calls,
      deleteLineItem: spies.deleteLineItem.mock.calls,
      transferCart: spies.transferCart.mock.calls,
      update: spies.update.mock.calls,
      updateLineItem: spies.updateLineItem.mock.calls,
    }).toStrictEqual({
      complete: [["cart_1"]],
      create: [[{}]],
      createLineItem: [["cart_1", addItemParams]],
      deleteLineItem: [["cart_1", "item_1"]],
      transferCart: [["cart_1"]],
      update: [["cart_1", {}]],
      updateLineItem: [["cart_1", "item_1", updateItemParams]],
    })
  })

  it("passes configured cart fields to retrieve and mutation responses", async () => {
    const { sdk, spies } = createSdkMock()
    configureSuccessfulMutationResponses(spies)
    const fields = "id,total,subtotal,tax_total,item_subtotal,item_tax_total"
    const query = { fields }
    const service = createMedusaCartService(sdk, { cartFields: fields })

    await service.retrieveCart("cart_1")
    await service.createCart({})
    await service.updateCart("cart_1", {})
    await service.addLineItem("cart_1", addItemParams)
    await service.updateLineItem("cart_1", "item_1", updateItemParams)
    await service.removeLineItem("cart_1", "item_1")
    await service.transferCart("cart_1")

    expect({
      clientFetch: spies.clientFetch.mock.calls,
      create: spies.create.mock.calls,
      createLineItem: spies.createLineItem.mock.calls,
      deleteLineItem: spies.deleteLineItem.mock.calls,
      transferCart: spies.transferCart.mock.calls,
      update: spies.update.mock.calls,
      updateLineItem: spies.updateLineItem.mock.calls,
    }).toStrictEqual({
      clientFetch: [["/store/carts/cart_1", { query, signal: null }]],
      create: [[{}, query]],
      createLineItem: [["cart_1", addItemParams, query]],
      deleteLineItem: [["cart_1", "item_1", query]],
      transferCart: [["cart_1", query]],
      update: [["cart_1", {}, query]],
      updateLineItem: [["cart_1", "item_1", updateItemParams, query]],
    })
  })

  it("strips unsupported top-level country_code from cart create/update params", async () => {
    const { sdk, spies } = createSdkMock()
    spies.create.mockResolvedValue({ cart: createStoreCart("cart_created") })
    spies.update.mockResolvedValue({ cart: createStoreCart("cart_updated") })
    const service = createMedusaCartService(sdk)
    const createParams = { country_code: "cz", region_id: "reg_1" }
    const updateParams = {
      country_code: "cz",
      shipping_address: { country_code: "cz" },
    }

    await service.createCart(createParams)
    await service.updateCart("cart_1", updateParams)

    expect(spies.create).toHaveBeenCalledWith({ region_id: "reg_1" })
    expect(spies.update).toHaveBeenCalledWith("cart_1", {
      shipping_address: { country_code: "cz" },
    })
  })

  it("throws clear errors when create and update responses miss cart payloads", async () => {
    const { sdk, spies } = createSdkMock()
    spies.create.mockResolvedValue({})
    spies.update.mockResolvedValue({})
    spies.createLineItem.mockResolvedValue({})
    const service = createMedusaCartService(sdk)

    await expect(service.createCart({})).rejects.toThrow(
      "Failed to create cart",
    )
    await expect(service.updateCart("cart_1", {})).rejects.toThrow(
      "Failed to update cart",
    )
    await expect(service.addLineItem("cart_1", addItemParams)).rejects.toThrow(
      "Failed to add item to cart",
    )
  })

  it("throws clear errors when item and transfer responses miss cart payloads", async () => {
    const { sdk, spies } = createSdkMock()
    spies.updateLineItem.mockResolvedValue({})
    spies.deleteLineItem.mockResolvedValue({})
    spies.transferCart.mockResolvedValue({})
    const service = createMedusaCartService(sdk)

    await expect(
      service.updateLineItem("cart_1", "item_1", updateItemParams),
    ).rejects.toThrow("Failed to update line item")
    await expect(service.removeLineItem("cart_1", "item_1")).rejects.toThrow(
      "Failed to remove line item",
    )
    await expect(service.transferCart("cart_1")).rejects.toThrow(
      "Failed to transfer cart",
    )
  })

  it("rethrows completeCart errors from SDK", async () => {
    const { sdk, spies } = createSdkMock()
    const error = new Error("complete failed")
    spies.complete.mockRejectedValue(error)
    const service = createMedusaCartService(sdk)

    await expect(service.completeCart("cart_1")).rejects.toBe(error)
    expect(spies.complete).toHaveBeenCalledWith("cart_1")
  })
})
