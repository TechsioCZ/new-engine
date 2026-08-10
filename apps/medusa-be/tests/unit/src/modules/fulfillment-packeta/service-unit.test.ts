import { logger } from "@medusajs/framework"
import type {
  FulfillmentOrderDTO,
  IFileModuleService,
  Query,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getRecordValue, isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"

import PacketaFulfillmentProviderService from "../../../../../src/modules/fulfillment-packeta/service"
import type { PacketaClientModuleService } from "../../../../../src/modules/packeta-client"
import type {
  PacketaOptions,
  PacketaShippingOptionData,
} from "../../../../../src/modules/packeta-client/types"

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

vi.mock(
  import("../../../../../src/modules/packeta-client"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      PACKETA_CLIENT_MODULE: "packeta_client",
    }),
)

type PacketaClientStub = Pick<
  PacketaClientModuleService,
  "cancelPacket" | "createPacket" | "downloadLabelPdf" | "getEffectiveConfig"
>
type FileServiceStub = Pick<IFileModuleService, "createFiles">
type QueryStub = Pick<Query, "graph">

const mockPacketaClient = {
  cancelPacket: vi.fn<PacketaClientStub["cancelPacket"]>(),
  createPacket: vi.fn<PacketaClientStub["createPacket"]>(),
  downloadLabelPdf: vi.fn<PacketaClientStub["downloadLabelPdf"]>(),
  getEffectiveConfig: vi.fn<PacketaClientStub["getEffectiveConfig"]>(),
} satisfies PacketaClientStub

const createFilesMock = vi.fn<(data: unknown) => Promise<unknown>>()
const graphMock = vi.fn<(options: unknown) => Promise<unknown>>()

const isFileServiceStub = (candidate: unknown): candidate is FileServiceStub =>
  isRecord(candidate) &&
  typeof getRecordValue(candidate, "createFiles") === "function"

const requireFileService = (candidate: unknown): FileServiceStub => {
  if (!isFileServiceStub(candidate)) {
    throw new TypeError("Expected a file service mock")
  }
  return candidate
}

const isQueryStub = (candidate: unknown): candidate is QueryStub =>
  isRecord(candidate) &&
  typeof getRecordValue(candidate, "graph") === "function"

const requireQuery = (candidate: unknown): QueryStub => {
  if (!isQueryStub(candidate)) {
    throw new TypeError("Expected a query mock")
  }
  return candidate
}

const mockFileService = requireFileService({ createFiles: createFilesMock })
const mockQuery = requireQuery({ graph: graphMock })

const validationContext: ValidateFulfillmentDataContext = {
  from_location: {
    address_id: "addr_stock_1",
    created_at: new Date(),
    deleted_at: null,
    fulfillment_sets: [],
    id: "sloc_1",
    metadata: null,
    name: "Warehouse",
    updated_at: new Date(),
  },
  id: "cart_1",
  items: [],
  shipping_address: {
    address_1: "Customer street 1",
    city: "Prague",
    country_code: "cz",
    created_at: new Date(),
    first_name: "Ada",
    id: "addr_customer_1",
    last_name: "Lovelace",
    postal_code: "11000",
    updated_at: new Date(),
  },
}

const PICKUP_POINT_ERROR = /Pickup point/u
const INVALID_PICKUP_POINT_ERROR = /Invalid pickup point ID/u

type ServiceConstructorArgs = ConstructorParameters<
  typeof PacketaFulfillmentProviderService
>
type InjectedDependencies = ServiceConstructorArgs[0]

const defaultOptions: PacketaOptions = {
  api_password: "test-pwd",
  default_label_format: "A6",
  default_label_offset: 0,
  environment: "testing",
  sender_label: "Test Eshop",
}

const createInjectedDependencies = (): InjectedDependencies => ({
  logger,
  packeta_client: mockPacketaClient,
  [Modules.FILE]: mockFileService,
  [ContainerRegistrationKeys.QUERY]: mockQuery,
})

const createService = (options: Partial<PacketaOptions> = {}) =>
  new PacketaFulfillmentProviderService(createInjectedDependencies(), {
    ...defaultOptions,
    ...options,
  })

const baseShippingAddress = {
  address_1: "123 Main Street",
  city: "Prague",
  country_code: "cz",
  created_at: new Date(),
  first_name: "John",
  id: "addr_123",
  last_name: "Doe",
  phone: "+420123456789",
  postal_code: "11000",
  updated_at: new Date(),
}

const createOrder = (
  overrides: Partial<FulfillmentOrderDTO> = {},
): Partial<FulfillmentOrderDTO> => ({
  currency_code: "CZK",
  display_id: 1001,
  email: "customer@example.com",
  id: "order_123",
  shipping_address: baseShippingAddress,
  total: 1500,
  ...overrides,
})

type TestShippingData = PacketaShippingOptionData & { weight?: number }

const createShippingData = (
  overrides: Partial<TestShippingData> = {},
): TestShippingData => ({
  access_point_id: 4242,
  code: "z_point",
  requires_access_point: true,
  supports_cod: false,
  ...overrides,
})

describe(PacketaFulfillmentProviderService, () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPacketaClient.getEffectiveConfig.mockResolvedValue({
      api_password: "test-pwd",
      default_label_format: "A6",
      default_label_offset: 0,
      environment: "testing",
      sender_label: "Test Eshop",
    })
    mockPacketaClient.createPacket.mockResolvedValue({
      barcode: "Z987654321",
      barcodeText: "Z 987 654 321",
      id: 987_654_321,
    })
    mockPacketaClient.downloadLabelPdf.mockResolvedValue(Buffer.from("PDF"))
    createFilesMock.mockResolvedValue([
      {
        id: "file_1",
        url: "https://files.example/packeta-label-Z987654321.pdf",
      },
    ])
    graphMock.mockResolvedValue({ data: [] })
  })

  describe("getFulfillmentOptions", () => {
    it("returns empty array when Packeta is disabled", async () => {
      mockPacketaClient.getEffectiveConfig.mockResolvedValueOnce(null)
      const options = await createService().getFulfillmentOptions()
      expect(options).toStrictEqual([])
    })

    it("returns both z_point options when enabled", async () => {
      const options = await createService().getFulfillmentOptions()
      expect(options).toHaveLength(2)
      expect(options.map((option) => option["code"])).toStrictEqual([
        "z_point",
        "z_point_cod",
      ])
    })
  })

  describe("validateOption", () => {
    it.each([
      ["z_point", true],
      ["z_point_cod", true],
      ["home_delivery", false],
      [undefined, false],
    ])("validates code=%s -> %s", async (code, expected) => {
      await expect(createService().validateOption({ code })).resolves.toBe(
        expected,
      )
    })
  })

  describe("validateFulfillmentData", () => {
    it("throws when access_point_id is missing", async () => {
      await expect(
        createService().validateFulfillmentData(
          { code: "z_point", supports_cod: false },
          {},
          validationContext,
        ),
      ).rejects.toThrow(PICKUP_POINT_ERROR)
    })

    it("throws when access_point_id is not a positive number", async () => {
      await expect(
        createService().validateFulfillmentData(
          { code: "z_point", supports_cod: false },
          { access_point_id: "not-a-number" },
          validationContext,
        ),
      ).rejects.toThrow(INVALID_PICKUP_POINT_ERROR)
    })

    it("parses numeric string access_point_id and returns normalised data", async () => {
      const data = await createService().validateFulfillmentData(
        { code: "z_point_cod", supports_cod: true },
        { access_point_id: "4242", access_point_name: "Praha 1" },
        validationContext,
      )
      expect(data).toMatchObject({
        access_point_id: 4242,
        access_point_name: "Praha 1",
        code: "z_point_cod",
        supports_cod: true,
      })
    })
  })

  describe("createFulfillment", () => {
    it("throws when order is missing", async () => {
      await expect(
        createService().createFulfillment(createShippingData(), [], undefined, {
          id: "ful_1",
        }),
      ).rejects.toThrow("Packeta: Order is required")
    })

    it("throws when shipping_address is missing", async () => {
      const order = createOrder()
      Reflect.deleteProperty(order, "shipping_address")
      await expect(
        createService().createFulfillment(createShippingData(), [], order, {
          id: "ful_1",
        }),
      ).rejects.toThrow("Packeta: Shipping address is required")
    })

    it("creates packet, downloads label, returns completed data", async () => {
      const order = createOrder()
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        order,
        { id: "ful_1" },
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({
          addressId: 4242,
          currency: "CZK",
          eshop: "Test Eshop",
          name: "John",
          number: "1001",
          surname: "Doe",
          weight: 0.5,
        }),
      )
      expect(mockPacketaClient.downloadLabelPdf).toHaveBeenCalledWith(
        987_654_321,
      )
      expect(createFilesMock).toHaveBeenCalledWith([
        {
          content: "UERG",
          filename: "packeta-label-Z987654321.pdf",
          mimeType: "application/pdf",
        },
      ])
      expect(result.data).toMatchObject({
        access_point_id: 4242,
        barcode: "Z987654321",
        label_url: "https://files.example/packeta-label-Z987654321.pdf",
        packet_id: 987_654_321,
        status: "completed",
        tracking_url: "https://tracking.packeta.com/Z987654321",
      })
      expect(result.labels).toStrictEqual([
        expect.objectContaining({
          tracking_number: "Z987654321",
          tracking_url: "https://tracking.packeta.com/Z987654321",
        }),
      ])
    })

    it("sets COD amount when supports_cod is true", async () => {
      const order = createOrder()
      await createService().createFulfillment(
        createShippingData({ supports_cod: true }),
        [],
        order,
        { id: "ful_1" },
      )
      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ cod: 1500, currency: "CZK" }),
      )
    })

    it("throws for COD when order total is missing", async () => {
      const order = createOrder()
      Reflect.deleteProperty(order, "total")
      await expect(
        createService().createFulfillment(
          createShippingData({ supports_cod: true }),
          [],
          order,
          { id: "ful_1" },
        ),
      ).rejects.toThrow(
        "Packeta: order total or item_total is required for COD shipments",
      )
      expect(mockPacketaClient.createPacket).not.toHaveBeenCalled()
    })

    it("uses explicit shipping weight as kilograms", async () => {
      const order = createOrder()
      await createService().createFulfillment(
        createShippingData({ weight: 1.2 }),
        [],
        order,
        { id: "ful_1" },
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 1.2 }),
      )
    })

    it("calculates weight from variant weight in grams", async () => {
      const order = createOrder()
      Object.defineProperty(order, "items", {
        value: [
          {
            id: "ordli_1",
            quantity: 2,
            variant: { weight: 400 },
          },
        ],
      })
      await createService().createFulfillment(
        createShippingData(),
        [{ line_item_id: "ordli_1", quantity: 2 }],
        order,
        { id: "ful_1" },
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 0.8 }),
      )
    })

    it("calculates weight from product weight in grams", async () => {
      graphMock.mockResolvedValueOnce({
        data: [{ id: "prod_1", weight: 1000 }],
      })
      const order = createOrder()
      Object.defineProperty(order, "items", {
        value: [
          {
            id: "ordli_1",
            product_id: "prod_1",
            quantity: 3,
            variant: {},
          },
        ],
      })
      await createService().createFulfillment(
        createShippingData(),
        [{ line_item_id: "ordli_1", quantity: 3 }],
        order,
        { id: "ful_1" },
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 3 }),
      )
    })

    it("still returns completed fulfillment if label upload fails", async () => {
      mockPacketaClient.downloadLabelPdf.mockRejectedValueOnce(
        new Error("S3 down"),
      )
      const order = createOrder()
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        order,
        { id: "ful_1" },
      )
      expect(result.data["status"]).toBe("completed")
      expect(result.data["label_url"]).toBeUndefined()
      expect(result.labels).toStrictEqual([])
    })
  })

  describe("cancelFulfillment", () => {
    it("returns cancelled=false when no packet_id", async () => {
      const result = await createService().cancelFulfillment({})
      expect(result).toMatchObject({ cancelled: false })
    })

    it("calls packeta client cancel when packet_id present", async () => {
      mockPacketaClient.cancelPacket.mockResolvedValue(true)
      const result = await createService().cancelFulfillment({
        barcode: "Z123",
        packet_id: 123,
      })
      expect(mockPacketaClient.cancelPacket).toHaveBeenCalledWith(123)
      expect(result).toMatchObject({ cancelled: true, packet_id: 123 })
    })
  })
})
