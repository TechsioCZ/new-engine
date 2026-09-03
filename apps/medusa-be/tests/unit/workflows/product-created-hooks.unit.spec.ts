import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const hookMocks = vi.hoisted(() => ({
  productsCreated: vi.fn(),
  productsDeleted: vi.fn(),
  productsUpdated: vi.fn(),
}))
const behaviorMocks = vi.hoisted(() => ({
  cleanupDeletedProductAttributes: vi.fn(),
  clearProductLifecycleEvents: vi.fn(),
  createProductContents: vi.fn(),
  deleteProductContents: vi.fn(),
  emitProductLifecycleEvents: vi.fn(),
  getProductAttributeService: vi.fn(),
  listProductContents: vi.fn(),
  restoreDeletedProductAttributes: vi.fn(),
  updateProductContents: vi.fn(),
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
    updateProductContents: behaviorMocks.updateProductContents,
  })),
}))

vi.mock("../../../src/utils/product-attributes", () => ({
  getProductAttributeService: behaviorMocks.getProductAttributeService,
}))

vi.mock(
  "../../../src/workflows/product-attribute/product-deletion-cleanup",
  () => ({
    cleanupDeletedProductAttributes:
      behaviorMocks.cleanupDeletedProductAttributes,
    restoreDeletedProductAttributes:
      behaviorMocks.restoreDeletedProductAttributes,
  })
)

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

type UpdatedHookCompensation = Readonly<{
  productContent: Readonly<{
    createdIds: readonly string[]
    previous: readonly Record<string, unknown>[]
  }>
  productLifecycle: typeof lifecycleCompensation | undefined
}>

type UpdatedHookHandler = (
  input: Readonly<{
    products: readonly Readonly<{
      id: string
      metadata?: Record<string, unknown> | null
    }>[]
  }>,
  context: never
) => Promise<Readonly<{ compensateInput: UpdatedHookCompensation }>>

type UpdatedHookCompensator = (
  compensation: UpdatedHookCompensation | undefined,
  context: never
) => Promise<void>

type DeletedHookCompensation = Readonly<{
  productAttributes: unknown
  productLifecycle: typeof lifecycleCompensation | undefined
}>

type DeletedHookHandler = (
  input: Readonly<{ ids: string[] }>,
  context: never
) => Promise<Readonly<{ compensateInput: DeletedHookCompensation }>>

type DeletedHookCompensator = (
  compensation: DeletedHookCompensation | undefined,
  context: never
) => Promise<void>

describe("product lifecycle workflow hooks", () => {
  beforeAll(async () => {
    await import("../../../src/workflows/hooks/product-attributes-deleted")
    await import("../../../src/workflows/hooks/product-content-created")
    await import("../../../src/workflows/hooks/product-content-updated")
    await import("../../../src/workflows/hooks/product-lifecycle-url-registry")
  })

  beforeEach(() => {
    behaviorMocks.cleanupDeletedProductAttributes.mockReset()
    behaviorMocks.clearProductLifecycleEvents.mockReset()
    behaviorMocks.createProductContents.mockReset()
    behaviorMocks.deleteProductContents.mockReset()
    behaviorMocks.emitProductLifecycleEvents.mockReset()
    behaviorMocks.getProductAttributeService.mockReset()
    behaviorMocks.listProductContents.mockReset()
    behaviorMocks.restoreDeletedProductAttributes.mockReset()
    behaviorMocks.updateProductContents.mockReset()

    behaviorMocks.cleanupDeletedProductAttributes.mockResolvedValue({
      assignments: [],
    })
    behaviorMocks.clearProductLifecycleEvents.mockResolvedValue(undefined)
    behaviorMocks.createProductContents.mockResolvedValue([{ id: "content_1" }])
    behaviorMocks.deleteProductContents.mockResolvedValue(undefined)
    behaviorMocks.emitProductLifecycleEvents.mockResolvedValue({
      compensateInput: lifecycleCompensation,
    })
    behaviorMocks.getProductAttributeService.mockReturnValue({})
    behaviorMocks.listProductContents.mockResolvedValue([])
    behaviorMocks.restoreDeletedProductAttributes.mockResolvedValue(undefined)
    behaviorMocks.updateProductContents.mockResolvedValue(undefined)
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

  it("updates product content before emission and restores it during compensation", async () => {
    const [handler, compensate] = hookMocks.productsUpdated.mock
      .calls[0] as unknown as [UpdatedHookHandler, UpdatedHookCompensator]
    const previousContent = {
      composition: "Previous composition",
      id: "content_existing",
      other: "Previous other",
      product_id: "prod_1",
      usage: "Previous usage",
      warning: "Previous warning",
    }
    const createdContent = {
      composition: "",
      id: "content_created",
      other: "",
      product_id: "prod_2",
      usage: "",
      warning: "",
    }
    behaviorMocks.listProductContents.mockResolvedValue([previousContent])
    behaviorMocks.createProductContents.mockResolvedValue([createdContent])
    const context = { container: {} } as never

    const response = await handler(
      {
        products: [
          { id: "prod_1", metadata: {} },
          { id: "prod_2", metadata: {} },
        ],
      },
      context
    )

    expect(behaviorMocks.createProductContents).toHaveBeenCalledOnce()
    expect(behaviorMocks.updateProductContents).toHaveBeenCalledOnce()
    expect(
      behaviorMocks.createProductContents.mock.invocationCallOrder[0]
    ).toBeLessThan(
      behaviorMocks.emitProductLifecycleEvents.mock.invocationCallOrder[0]
    )
    expect(
      behaviorMocks.updateProductContents.mock.invocationCallOrder[0]
    ).toBeLessThan(
      behaviorMocks.emitProductLifecycleEvents.mock.invocationCallOrder[0]
    )
    expect(behaviorMocks.emitProductLifecycleEvents).toHaveBeenCalledWith(
      { productIds: ["prod_1", "prod_2"], reason: "updated" },
      context
    )
    expect(response.compensateInput).toStrictEqual({
      productContent: {
        createdIds: ["content_created"],
        previous: [previousContent],
      },
      productLifecycle: lifecycleCompensation,
    })

    await compensate(response.compensateInput, context)

    expect(behaviorMocks.clearProductLifecycleEvents).toHaveBeenCalledWith(
      lifecycleCompensation,
      context
    )
    expect(behaviorMocks.deleteProductContents).toHaveBeenCalledWith([
      "content_created",
    ])
    expect(behaviorMocks.updateProductContents).toHaveBeenLastCalledWith([
      previousContent,
    ])
  })

  it("deletes product attributes before emission and restores them during compensation", async () => {
    const [handler, compensate] = hookMocks.productsDeleted.mock
      .calls[0] as unknown as [DeletedHookHandler, DeletedHookCompensator]
    const productAttributes = {
      assignments: [{ attribute_id: "attr_1", product_id: "prod_1" }],
    }
    const attributeService = { name: "product-attribute-service" }
    const lockingModule = { name: "locking-module" }
    behaviorMocks.cleanupDeletedProductAttributes.mockResolvedValue(
      productAttributes
    )
    behaviorMocks.getProductAttributeService.mockReturnValue(attributeService)
    const context = {
      container: { resolve: vi.fn(() => lockingModule) },
    } as never

    const response = await handler({ ids: ["prod_1"] }, context)

    expect(behaviorMocks.cleanupDeletedProductAttributes).toHaveBeenCalledWith({
      lockingModule,
      productIds: ["prod_1"],
      service: attributeService,
    })
    expect(
      behaviorMocks.cleanupDeletedProductAttributes.mock.invocationCallOrder[0]
    ).toBeLessThan(
      behaviorMocks.emitProductLifecycleEvents.mock.invocationCallOrder[0]
    )
    expect(behaviorMocks.emitProductLifecycleEvents).toHaveBeenCalledWith(
      { productIds: ["prod_1"], reason: "deleted" },
      context
    )
    expect(response.compensateInput).toStrictEqual({
      productAttributes,
      productLifecycle: lifecycleCompensation,
    })

    await compensate(response.compensateInput, context)

    expect(behaviorMocks.clearProductLifecycleEvents).toHaveBeenCalledWith(
      lifecycleCompensation,
      context
    )
    expect(behaviorMocks.restoreDeletedProductAttributes).toHaveBeenCalledWith({
      compensation: productAttributes,
      lockingModule,
      service: attributeService,
    })
  })
})
