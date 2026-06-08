import { MedusaError } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PRODUCT_LIST_MODULE } from "../../../../../src/modules/product-list/constants"

const {
  mockAssertProductSelectionExists,
  mockFindCustomerCustomProductListByHandle,
  mockFindCustomerFavoriteProductList,
  mockFindProductListItemForSelection,
  mockGetProductListType,
} = vi.hoisted(() => ({
  mockAssertProductSelectionExists: vi.fn(),
  mockFindCustomerCustomProductListByHandle: vi.fn(),
  mockFindCustomerFavoriteProductList: vi.fn(),
  mockFindProductListItemForSelection: vi.fn(),
  mockGetProductListType: vi.fn(),
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
  StepResponse: class StepResponse<
    TPayload = unknown,
    TCompensationInput = unknown,
  > {
    compensateInput: TCompensationInput
    payload: TPayload

    constructor(payload: TPayload, compensateInput: TCompensationInput) {
      this.payload = payload
      this.compensateInput = compensateInput
    }
  },
}))

vi.mock("../../../../../src/workflows/product-list/steps/helpers", () => ({
  assertProductSelectionExists: mockAssertProductSelectionExists,
  findCustomerCustomProductListByHandle:
    mockFindCustomerCustomProductListByHandle,
  findCustomerFavoriteProductList: mockFindCustomerFavoriteProductList,
  findProductListItemForSelection: mockFindProductListItemForSelection,
  getProductListType: mockGetProductListType,
}))

type MockService = {
  createCustomProductList: ReturnType<typeof vi.fn>
  createFavoriteProductList: ReturnType<typeof vi.fn>
  createProductListItemForList: ReturnType<typeof vi.fn>
  deleteProductLists: ReturnType<typeof vi.fn>
  deleteProductListItems: ReturnType<typeof vi.fn>
  incrementProductListItemQuantity: ReturnType<typeof vi.fn>
  retrieveProductList: ReturnType<typeof vi.fn>
  updateProductListItems: ReturnType<typeof vi.fn>
}

type MockStep = {
  (
    input: unknown,
    context: { container: ReturnType<typeof makeContainer> }
  ): Promise<{
    compensateInput: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    context: { container: ReturnType<typeof makeContainer> }
  ) => Promise<void>
}

const makeService = (): MockService => ({
  createCustomProductList: vi.fn(),
  createFavoriteProductList: vi.fn(),
  createProductListItemForList: vi.fn(),
  deleteProductLists: vi.fn(),
  deleteProductListItems: vi.fn(),
  incrementProductListItemQuantity: vi.fn(),
  retrieveProductList: vi.fn(),
  updateProductListItems: vi.fn(),
})

const makeContainer = (service: MockService) => ({
  resolve: vi.fn((key) => {
    if (key === PRODUCT_LIST_MODULE) {
      return service
    }

    throw new Error(`Unexpected dependency: ${String(key)}`)
  }),
})

const resetHelperMocks = () => {
  mockAssertProductSelectionExists.mockReset()
  mockFindCustomerCustomProductListByHandle.mockReset()
  mockFindCustomerFavoriteProductList.mockReset()
  mockFindProductListItemForSelection.mockReset()
  mockGetProductListType.mockReset()
}

describe("createCustomerProductListStep", () => {
  beforeEach(() => {
    resetHelperMocks()
  })

  it("returns an existing favorite list without creating another one", async () => {
    const existingFavorite = {
      id: "plist_favorite",
      type: "favorite",
    }
    const service = makeService()
    mockFindCustomerFavoriteProductList.mockResolvedValue(existingFavorite)
    const container = makeContainer(service)
    const { createCustomerProductListStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-customer-product-list"
    )

    const result = await (createCustomerProductListStep as MockStep)(
      {
        customer_id: "cus_1",
        data: {},
        type: "favorite",
      },
      { container }
    )

    expect(mockFindCustomerFavoriteProductList).toHaveBeenCalledWith(
      container,
      "cus_1"
    )
    expect(service.createFavoriteProductList).not.toHaveBeenCalled()
    expect(result).toEqual({
      compensateInput: {
        created: false,
        list_id: "plist_favorite",
      },
      payload: {
        created: false,
        product_list: existingFavorite,
      },
    })
  })

  it("rejects duplicate normalized custom handles before creating a list", async () => {
    const service = makeService()
    mockFindCustomerFavoriteProductList.mockResolvedValue(null)
    mockFindCustomerCustomProductListByHandle.mockResolvedValue({
      id: "plist_existing",
      handle: "summer-picks",
    })
    const container = makeContainer(service)
    const { createCustomerProductListStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-customer-product-list"
    )

    await expect(
      (createCustomerProductListStep as MockStep)(
        {
          customer_id: "cus_1",
          data: {
            handle: "  Summer Picks  ",
            title: "Ignored Title",
          },
          type: "custom",
        },
        { container }
      )
    ).rejects.toMatchObject({
      message: "Product list handle already exists: summer-picks",
      type: MedusaError.Types.DUPLICATE_ERROR,
    })

    expect(mockFindCustomerFavoriteProductList).not.toHaveBeenCalled()
    expect(mockFindCustomerCustomProductListByHandle).toHaveBeenCalledWith(
      container,
      "cus_1",
      "summer-picks"
    )
    expect(service.createCustomProductList).not.toHaveBeenCalled()
  })

  it("compensates only newly created product lists", async () => {
    const service = makeService()
    const container = makeContainer(service)
    const { createCustomerProductListStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-customer-product-list"
    )
    const step = createCustomerProductListStep as MockStep

    await step.compensate(
      {
        created: true,
        list_id: "plist_new",
      },
      { container }
    )
    await step.compensate(
      {
        created: false,
        list_id: "plist_existing",
      },
      { container }
    )

    expect(service.deleteProductLists).toHaveBeenCalledOnce()
    expect(service.deleteProductLists).toHaveBeenCalledWith("plist_new")
  })
})

describe("createProductListItemStep", () => {
  beforeEach(() => {
    resetHelperMocks()
  })

  it("creates favorite list items when quantity is set", async () => {
    const createdItem = {
      id: "plitem_new",
      list_id: "plist_favorite",
      quantity: 2,
      sort_order: 0,
    }
    const service = makeService()
    service.retrieveProductList.mockResolvedValue({
      id: "plist_favorite",
      type: "favorite",
    })
    service.createProductListItemForList.mockResolvedValue(createdItem)
    mockGetProductListType.mockReturnValue("favorite")
    mockAssertProductSelectionExists.mockResolvedValue(undefined)
    mockFindProductListItemForSelection.mockResolvedValue(null)
    const container = makeContainer(service)
    const { createProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-product-list-item"
    )

    const result = await (createProductListItemStep as MockStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_favorite",
        product_id: "prod_1",
        quantity: 2,
      },
      { container }
    )

    expect(service.createProductListItemForList).toHaveBeenCalledWith({
      list_id: "plist_favorite",
      list_type: "favorite",
      metadata: undefined,
      note: undefined,
      quantity: 2,
      sort_order: undefined,
    })
    expect(result).toEqual({
      compensateInput: {
        created: true,
        item_id: "plitem_new",
      },
      payload: {
        created: true,
        item: createdItem,
      },
    })
  })

  it("creates favorite list items when quantity is omitted", async () => {
    const createdItem = {
      id: "plitem_new",
      list_id: "plist_favorite",
      quantity: 1,
      sort_order: 0,
    }
    const service = makeService()
    service.retrieveProductList.mockResolvedValue({
      id: "plist_favorite",
      type: "favorite",
    })
    service.createProductListItemForList.mockResolvedValue(createdItem)
    mockGetProductListType.mockReturnValue("favorite")
    mockAssertProductSelectionExists.mockResolvedValue(undefined)
    mockFindProductListItemForSelection.mockResolvedValue(null)
    const container = makeContainer(service)
    const { createProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-product-list-item"
    )

    const result = await (createProductListItemStep as MockStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_favorite",
        metadata: { source: "test" },
        note: "Save for later",
        product_id: "prod_1",
        sort_order: 4,
      },
      { container }
    )

    expect(mockAssertProductSelectionExists).toHaveBeenCalledWith(
      container,
      "prod_1",
      undefined
    )
    expect(mockFindProductListItemForSelection).toHaveBeenCalledWith(
      container,
      "plist_favorite",
      "prod_1",
      undefined
    )
    expect(service.createProductListItemForList).toHaveBeenCalledWith({
      list_id: "plist_favorite",
      list_type: "favorite",
      metadata: { source: "test" },
      note: "Save for later",
      quantity: undefined,
      sort_order: 4,
    })
    expect(result).toEqual({
      compensateInput: {
        created: true,
        item_id: "plitem_new",
      },
      payload: {
        created: true,
        item: createdItem,
      },
    })
  })

  it("returns existing selections without creating another list item", async () => {
    const existingItem = {
      id: "plitem_existing",
      list_id: "plist_custom",
      quantity: 3,
      sort_order: 1,
    }
    const service = makeService()
    service.retrieveProductList.mockResolvedValue({
      id: "plist_custom",
      type: "custom",
    })
    mockGetProductListType.mockReturnValue("custom")
    mockAssertProductSelectionExists.mockResolvedValue(undefined)
    mockFindProductListItemForSelection.mockResolvedValue(existingItem)
    const container = makeContainer(service)
    const { createProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-product-list-item"
    )

    const result = await (createProductListItemStep as MockStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_custom",
        product_id: "prod_1",
        quantity: 3,
        variant_id: "variant_1",
      },
      { container }
    )

    expect(mockAssertProductSelectionExists).toHaveBeenCalledWith(
      container,
      "prod_1",
      "variant_1"
    )
    expect(mockFindProductListItemForSelection).toHaveBeenCalledWith(
      container,
      "plist_custom",
      "prod_1",
      "variant_1"
    )
    expect(service.createProductListItemForList).not.toHaveBeenCalled()
    expect(result).toEqual({
      compensateInput: {
        created: false,
        item_id: "plitem_existing",
      },
      payload: {
        created: false,
        item: existingItem,
      },
    })
  })

  it("compensates only newly created list items", async () => {
    const service = makeService()
    const container = makeContainer(service)
    const { createProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/create-product-list-item"
    )
    const step = createProductListItemStep as MockStep

    await step.compensate(
      {
        created: true,
        item_id: "plitem_new",
      },
      { container }
    )
    await step.compensate(
      {
        created: false,
        item_id: "plitem_existing",
      },
      { container }
    )

    expect(service.deleteProductListItems).toHaveBeenCalledOnce()
    expect(service.deleteProductListItems).toHaveBeenCalledWith("plitem_new")
  })
})

describe("incrementProductListItemStep", () => {
  beforeEach(() => {
    resetHelperMocks()
  })

  it("increments favorite list item quantities and records compensation input", async () => {
    const incrementedItem = {
      id: "plitem_1",
      list_id: "plist_favorite",
      quantity: 3,
    }
    const service = makeService()
    service.incrementProductListItemQuantity.mockResolvedValue(incrementedItem)
    const container = makeContainer(service)
    const { incrementProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/increment-product-list-item"
    )

    const result = await (incrementProductListItemStep as MockStep)(
      {
        item_id: "plitem_1",
        list_id: "plist_favorite",
        previous_quantity: 1,
        quantity: 2,
      },
      { container }
    )

    expect(service.incrementProductListItemQuantity).toHaveBeenCalledWith(
      "plitem_1",
      2
    )
    expect(result).toEqual({
      compensateInput: {
        item_id: "plitem_1",
        previous_quantity: 1,
      },
      payload: incrementedItem,
    })
  })

  it("increments custom list item quantities and records compensation input", async () => {
    const incrementedItem = {
      id: "plitem_1",
      list_id: "plist_custom",
      quantity: 5,
    }
    const service = makeService()
    service.retrieveProductList.mockResolvedValue({
      id: "plist_custom",
      type: "custom",
    })
    service.incrementProductListItemQuantity.mockResolvedValue(incrementedItem)
    const container = makeContainer(service)
    const { incrementProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/increment-product-list-item"
    )

    const result = await (incrementProductListItemStep as MockStep)(
      {
        item_id: "plitem_1",
        list_id: "plist_custom",
        previous_quantity: 3,
        quantity: 2,
      },
      { container }
    )

    expect(service.incrementProductListItemQuantity).toHaveBeenCalledWith(
      "plitem_1",
      2
    )
    expect(result).toEqual({
      compensateInput: {
        item_id: "plitem_1",
        previous_quantity: 3,
      },
      payload: incrementedItem,
    })
  })

  it("compensates by restoring the previous item quantity", async () => {
    const service = makeService()
    const container = makeContainer(service)
    const { incrementProductListItemStep } = await import(
      "../../../../../src/workflows/product-list/steps/increment-product-list-item"
    )
    const step = incrementProductListItemStep as MockStep

    await step.compensate(
      {
        item_id: "plitem_1",
        previous_quantity: 3,
      },
      { container }
    )
    await step.compensate(undefined, { container })

    expect(service.updateProductListItems).toHaveBeenCalledOnce()
    expect(service.updateProductListItems).toHaveBeenCalledWith({
      id: "plitem_1",
      quantity: 3,
    })
  })
})
