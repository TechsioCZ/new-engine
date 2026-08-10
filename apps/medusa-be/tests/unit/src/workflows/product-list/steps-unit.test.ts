import { MedusaError } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PRODUCT_LIST_MODULE } from "../../../../../src/modules/product-list/constants"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

type GeneralMock = (...args: unknown[]) => unknown
type GeneralVitestMock = ReturnType<typeof vi.fn<GeneralMock>>

const {
  mockAssertProductSelectionExists,
  mockFindCustomerCustomProductListByHandle,
  mockFindCustomerFavoriteProductList,
  mockFindProductListItemForSelection,
  mockGetProductListType,
} = vi.hoisted(() => ({
  mockAssertProductSelectionExists: vi.fn<GeneralMock>(),
  mockFindCustomerCustomProductListByHandle: vi.fn<GeneralMock>(),
  mockFindCustomerFavoriteProductList: vi.fn<GeneralMock>(),
  mockFindProductListItemForSelection: vi.fn<GeneralMock>(),
  mockGetProductListType: vi.fn<GeneralMock>(),
}))

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
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
    createStep: vi.fn<
      (
        name: string,
        invoke: GeneralMock,
        compensate: GeneralMock,
      ) => GeneralMock & { compensate: GeneralMock }
    >((_name, invoke, compensate) => Object.assign(invoke, { compensate })),
  }),
)

vi.mock(
  import("../../../../../src/workflows/product-list/steps/helpers"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      assertProductSelectionExists: mockAssertProductSelectionExists,
      findCustomerCustomProductListByHandle:
        mockFindCustomerCustomProductListByHandle,
      findCustomerFavoriteProductList: mockFindCustomerFavoriteProductList,
      findProductListItemForSelection: mockFindProductListItemForSelection,
      getProductListType: mockGetProductListType,
    }),
)

interface MockService {
  createCustomProductList: GeneralVitestMock
  createFavoriteProductList: GeneralVitestMock
  createProductListItemForList: GeneralVitestMock
  deleteProductLists: GeneralVitestMock
  deleteProductListItems: GeneralVitestMock
  incrementProductListItemQuantity: GeneralVitestMock
  retrieveProductList: GeneralVitestMock
  updateProductListItems: GeneralVitestMock
}

interface MockStep {
  (
    input: unknown,
    context: { container: ReturnType<typeof makeContainer> },
  ): Promise<{
    compensateInput: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    context: { container: ReturnType<typeof makeContainer> },
  ) => Promise<void>
}

const assertMockStep: (candidate: unknown) => asserts candidate is MockStep = (
  candidate,
) => {
  if (
    typeof candidate !== "function" ||
    !("compensate" in candidate) ||
    typeof candidate.compensate !== "function"
  ) {
    throw new TypeError(
      "Expected the mocked workflow step to expose a compensate function",
    )
  }
}

const asMockStep = (candidate: unknown): MockStep => {
  assertMockStep(candidate)
  return candidate
}

const makeService = (): MockService => ({
  createCustomProductList: vi.fn<GeneralMock>(),
  createFavoriteProductList: vi.fn<GeneralMock>(),
  createProductListItemForList: vi.fn<GeneralMock>(),
  deleteProductListItems: vi.fn<GeneralMock>(),
  deleteProductLists: vi.fn<GeneralMock>(),
  incrementProductListItemQuantity: vi.fn<GeneralMock>(),
  retrieveProductList: vi.fn<GeneralMock>(),
  updateProductListItems: vi.fn<GeneralMock>(),
})

const makeContainer = (service: MockService) => ({
  resolve: vi.fn<(key: string) => MockService>((key) => {
    if (key === PRODUCT_LIST_MODULE) {
      return service
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

const expectPropertiesToBeAbsent = (record: object, properties: string[]) => {
  for (const property of properties) {
    expect(record).not.toHaveProperty(property)
  }
}

const expectStepResponse = (
  response: { compensateInput: unknown; payload: unknown },
  expected: { compensateInput: unknown; payload: unknown },
) => {
  expect(response.payload).toStrictEqual(expected.payload)
  expect(response.compensateInput).toStrictEqual(expected.compensateInput)
}

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
    const { createCustomerProductListStep } =
      await import("../../../../../src/workflows/product-list/steps/create-customer-product-list")

    const result = await asMockStep(createCustomerProductListStep)(
      {
        customer_id: "cus_1",
        data: {},
        type: "favorite",
      },
      { container },
    )

    expect(mockFindCustomerFavoriteProductList).toHaveBeenCalledWith(
      container,
      "cus_1",
    )
    expect(service.createFavoriteProductList).not.toHaveBeenCalled()
    expectStepResponse(result, {
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
      handle: "summer-picks",
      id: "plist_existing",
    })
    const container = makeContainer(service)
    const { createCustomerProductListStep } =
      await import("../../../../../src/workflows/product-list/steps/create-customer-product-list")

    await expect(
      asMockStep(createCustomerProductListStep)(
        {
          customer_id: "cus_1",
          data: {
            handle: "  Summer Picks  ",
            title: "Ignored Title",
          },
          type: "custom",
        },
        { container },
      ),
    ).rejects.toMatchObject({
      message: "Product list handle already exists: summer-picks",
      type: MedusaError.Types.DUPLICATE_ERROR,
    })

    expect(mockFindCustomerFavoriteProductList).not.toHaveBeenCalled()
    expect(mockFindCustomerCustomProductListByHandle).toHaveBeenCalledWith(
      container,
      "cus_1",
      "summer-picks",
    )
    expect(service.createCustomProductList).not.toHaveBeenCalled()
  })

  it("compensates only newly created product lists", async () => {
    const service = makeService()
    const container = makeContainer(service)
    const { createCustomerProductListStep } =
      await import("../../../../../src/workflows/product-list/steps/create-customer-product-list")
    const step = asMockStep(createCustomerProductListStep)

    await step.compensate(
      {
        created: true,
        list_id: "plist_new",
      },
      { container },
    )
    await step.compensate(
      {
        created: false,
        list_id: "plist_existing",
      },
      { container },
    )

    expect(service.deleteProductLists).toHaveBeenCalledExactlyOnceWith(
      "plist_new",
    )
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
    mockAssertProductSelectionExists.mockImplementation(async () => {})
    mockFindProductListItemForSelection.mockResolvedValue(null)
    const container = makeContainer(service)
    const { createProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/create-product-list-item")

    const result = await asMockStep(createProductListItemStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_favorite",
        product_id: "prod_1",
        quantity: 2,
      },
      { container },
    )

    const createInput = service.createProductListItemForList.mock.calls[0]?.[0]
    if (!isRecord(createInput)) {
      throw new TypeError("Expected a product list item create input")
    }
    expect(createInput).toMatchObject({
      list_id: "plist_favorite",
      list_type: "favorite",
      quantity: 2,
    })
    expectPropertiesToBeAbsent(createInput, ["metadata", "note", "sort_order"])
    expectStepResponse(result, {
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
    mockAssertProductSelectionExists.mockImplementation(async () => {})
    mockFindProductListItemForSelection.mockResolvedValue(null)
    const container = makeContainer(service)
    const { createProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/create-product-list-item")

    const result = await asMockStep(createProductListItemStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_favorite",
        metadata: { source: "test" },
        note: "Save for later",
        product_id: "prod_1",
        sort_order: 4,
      },
      { container },
    )

    expect(mockAssertProductSelectionExists).toHaveBeenCalledWith(
      container,
      "prod_1",
      undefined,
    )
    expect(mockFindProductListItemForSelection).toHaveBeenCalledWith(
      container,
      "plist_favorite",
      "prod_1",
      undefined,
    )
    const createInput = service.createProductListItemForList.mock.calls[0]?.[0]
    if (!isRecord(createInput)) {
      throw new TypeError("Expected a product list item create input")
    }
    expect(createInput).toMatchObject({
      list_id: "plist_favorite",
      list_type: "favorite",
      metadata: { source: "test" },
      note: "Save for later",
      sort_order: 4,
    })
    expectPropertiesToBeAbsent(createInput, ["quantity"])
    expectStepResponse(result, {
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
    mockAssertProductSelectionExists.mockImplementation(async () => {})
    mockFindProductListItemForSelection.mockResolvedValue(existingItem)
    const container = makeContainer(service)
    const { createProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/create-product-list-item")

    const result = await asMockStep(createProductListItemStep)(
      {
        customer_id: "cus_1",
        list_id: "plist_custom",
        product_id: "prod_1",
        quantity: 3,
        variant_id: "variant_1",
      },
      { container },
    )

    expect(mockAssertProductSelectionExists).toHaveBeenCalledWith(
      container,
      "prod_1",
      "variant_1",
    )
    expect(mockFindProductListItemForSelection).toHaveBeenCalledWith(
      container,
      "plist_custom",
      "prod_1",
      "variant_1",
    )
    expect(service.createProductListItemForList).not.toHaveBeenCalled()
    expectStepResponse(result, {
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
    const { createProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/create-product-list-item")
    const step = asMockStep(createProductListItemStep)

    await step.compensate(
      {
        created: true,
        item_id: "plitem_new",
      },
      { container },
    )
    await step.compensate(
      {
        created: false,
        item_id: "plitem_existing",
      },
      { container },
    )

    expect(service.deleteProductListItems).toHaveBeenCalledExactlyOnceWith(
      "plitem_new",
    )
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
    const { incrementProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/increment-product-list-item")

    const result = await asMockStep(incrementProductListItemStep)(
      {
        item_id: "plitem_1",
        list_id: "plist_favorite",
        previous_quantity: 1,
        quantity: 2,
      },
      { container },
    )

    expect(service.incrementProductListItemQuantity).toHaveBeenCalledWith(
      "plitem_1",
      2,
    )
    expectStepResponse(result, {
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
    const { incrementProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/increment-product-list-item")

    const result = await asMockStep(incrementProductListItemStep)(
      {
        item_id: "plitem_1",
        list_id: "plist_custom",
        previous_quantity: 3,
        quantity: 2,
      },
      { container },
    )

    expect(service.incrementProductListItemQuantity).toHaveBeenCalledWith(
      "plitem_1",
      2,
    )
    expectStepResponse(result, {
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
    const { incrementProductListItemStep } =
      await import("../../../../../src/workflows/product-list/steps/increment-product-list-item")
    const step = asMockStep(incrementProductListItemStep)

    await step.compensate(
      {
        item_id: "plitem_1",
        previous_quantity: 3,
      },
      { container },
    )
    await step.compensate(undefined, { container })

    expect(service.updateProductListItems).toHaveBeenCalledExactlyOnceWith({
      id: "plitem_1",
      quantity: 3,
    })
  })
})
