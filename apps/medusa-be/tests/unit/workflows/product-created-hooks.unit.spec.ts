import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const hookMocks = vi.hoisted(() => ({
  productsCreated: vi.fn(),
  productsDeleted: vi.fn(),
  productsUpdated: vi.fn(),
}))
const behaviorMocks = vi.hoisted(() => ({
  clearProductLifecycleEvents: vi.fn(),
  createProductContents: vi.fn(),
  deleteProductContents: vi.fn(),
  emitProductLifecycleEvents: vi.fn(),
  listProductContents: vi.fn(),
}))

const lifecycleCompensation = {
  eventGroupId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  eventName: "url-registry.product-lifecycle.requested",
} as const

vi.mock("@medusajs/medusa/core-flows", () => ({
  createProductsWorkflow: {
    hooks: { productsCreated: hookMocks.productsCreated },
  },
  deleteProductsWorkflow: {
    hooks: { productsDeleted: hookMocks.productsDeleted },
  },
  updateProductsWorkflow: {
    hooks: { productsUpdated: hookMocks.productsUpdated },
  },
}))

vi.mock("../../../src/utils/product-content", () => ({
  getLegacyProductContent: vi.fn(() => ({
    composition: "",
    other: "",
    usage: "",
    warning: "",
  })),
}))

vi.mock("../../../src/utils/product-content-service", () => ({
  getProductContentService: vi.fn(() => ({
    createProductContents: behaviorMocks.createProductContents,
    deleteProductContents: behaviorMocks.deleteProductContents,
    listProductContents: behaviorMocks.listProductContents,
  })),
}))

vi.mock(
  "../../../src/workflows/url-registry-outbox/product-lifecycle-event",
  () => ({
    clearProductLifecycleEvents: behaviorMocks.clearProductLifecycleEvents,
    emitProductLifecycleEvents: behaviorMocks.emitProductLifecycleEvents,
  })
)

type CreatedHookCompensation = Readonly<{
  productContentIds: readonly string[]
  productLifecycle: typeof lifecycleCompensation | undefined
}>

type CreatedHookHandler = (
  input: Readonly<{
    products: readonly Readonly<{
      id: string
      metadata?: Record<string, unknown> | null
    }>[]
  }>,
  context: never
) => Promise<Readonly<{ compensateInput: CreatedHookCompensation }>>

type CreatedHookCompensator = (
  compensation: CreatedHookCompensation | undefined,
  context: never
) => Promise<void>

describe("product creation workflow hooks", () => {
  beforeAll(async () => {
    await import("../../../src/workflows/hooks/product-attributes-deleted")
    await import("../../../src/workflows/hooks/product-content-created")
    await import("../../../src/workflows/hooks/product-content-updated")
    await import("../../../src/workflows/hooks/product-lifecycle-url-registry")
  })

  beforeEach(() => {
    behaviorMocks.clearProductLifecycleEvents.mockReset()
    behaviorMocks.createProductContents.mockReset()
    behaviorMocks.deleteProductContents.mockReset()
    behaviorMocks.emitProductLifecycleEvents.mockReset()
    behaviorMocks.listProductContents.mockReset()

    behaviorMocks.clearProductLifecycleEvents.mockResolvedValue(undefined)
    behaviorMocks.createProductContents.mockResolvedValue([{ id: "content_1" }])
    behaviorMocks.deleteProductContents.mockResolvedValue(undefined)
    behaviorMocks.emitProductLifecycleEvents.mockResolvedValue({
      compensateInput: lifecycleCompensation,
    })
    behaviorMocks.listProductContents.mockResolvedValue([])
  })

  it("registers only one productsCreated handler", () => {
    expect(hookMocks.productsCreated).toHaveBeenCalledOnce()
  })

  it("registers only one productsUpdated handler", () => {
    expect(hookMocks.productsUpdated).toHaveBeenCalledOnce()
  })

  it("registers only one productsDeleted handler", () => {
    expect(hookMocks.productsDeleted).toHaveBeenCalledOnce()
  })

  it("creates product content and emits the product lifecycle event", async () => {
    const [handler, compensate] = hookMocks.productsCreated.mock
      .calls[0] as unknown as [CreatedHookHandler, CreatedHookCompensator]
    const context = { container: {} } as never

    const response = await handler(
      { products: [{ id: "prod_1", metadata: {} }] },
      context
    )

    expect(behaviorMocks.createProductContents).toHaveBeenCalledOnce()
    expect(behaviorMocks.emitProductLifecycleEvents).toHaveBeenCalledWith(
      { productIds: ["prod_1"], reason: "created" },
      context
    )
    expect(response.compensateInput).toEqual({
      productContentIds: ["content_1"],
      productLifecycle: lifecycleCompensation,
    })

    await compensate(response.compensateInput, context)

    expect(behaviorMocks.clearProductLifecycleEvents).toHaveBeenCalledWith(
      lifecycleCompensation,
      context
    )
    expect(behaviorMocks.deleteProductContents).toHaveBeenCalledWith([
      "content_1",
    ])
  })

  it("removes created product content when lifecycle emission fails", async () => {
    const [handler] = hookMocks.productsCreated.mock.calls[0] as unknown as [
      CreatedHookHandler,
      CreatedHookCompensator,
    ]
    const failure = new Error("event bus unavailable")
    behaviorMocks.emitProductLifecycleEvents.mockRejectedValue(failure)

    await expect(
      handler({ products: [{ id: "prod_1", metadata: {} }] }, {
        container: {},
      } as never)
    ).rejects.toBe(failure)
    expect(behaviorMocks.deleteProductContents).toHaveBeenCalledWith([
      "content_1",
    ])
  })
})
