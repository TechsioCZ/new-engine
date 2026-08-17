import type {
  FulfillmentOrderDTO,
  IFileModuleService,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../../src/modules/packeta-client", () => ({
  PACKETA_CLIENT_MODULE: "packeta_client",
}))

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import PacketaFulfillmentProviderService from "../../../../../src/modules/fulfillment-packeta/service"
// Import after mock
import type { PacketaClientModuleService } from "../../../../../src/modules/packeta-client"
import type { PacketaOptions } from "../../../../../src/modules/packeta-client/types"

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

const mockPacketaClient = {
  getEffectiveConfig: vi.fn(),
  createPacket: vi.fn(),
  cancelPacket: vi.fn(),
  getPacketStatus: vi.fn(),
  downloadLabelPdf: vi.fn(),
  getBranches: vi.fn(),
}

const mockFileService = {
  createFiles: vi.fn(),
}

const mockQuery = {
  graph: vi.fn(),
}

const PICKUP_POINT_ERROR = /Pickup point/
const INVALID_PICKUP_POINT_ERROR = /Invalid pickup point ID/

type ServiceConstructorArgs = ConstructorParameters<
  typeof PacketaFulfillmentProviderService
>
type InjectedDependencies = ServiceConstructorArgs[0]

const defaultOptions: PacketaOptions = {
  config_id: "packeta-config-testing",
  api_password: "test-pwd",
  environment: "testing",
  allow_live_operations: true,
  default_label_format: "A6",
  default_label_offset: 0,
  sender_label: "Test Eshop",
}

const createInjectedDependencies = (): InjectedDependencies => ({
  logger: mockLogger as unknown as Logger,
  packeta_client: mockPacketaClient as unknown as PacketaClientModuleService,
  [Modules.FILE]: mockFileService as unknown as IFileModuleService,
  [ContainerRegistrationKeys.QUERY]: mockQuery as unknown as Query,
})

const createService = (options: Partial<PacketaOptions> = {}) =>
  new PacketaFulfillmentProviderService(createInjectedDependencies(), {
    ...defaultOptions,
    ...options,
  })

const baseShippingAddress = {
  id: "addr_123",
  created_at: new Date(),
  updated_at: new Date(),
  first_name: "John",
  last_name: "Doe",
  address_1: "123 Main Street",
  city: "Prague",
  postal_code: "11000",
  country_code: "cz",
  phone: "+420123456789",
}

const createOrder = (
  overrides: Partial<FulfillmentOrderDTO> = {}
): Partial<FulfillmentOrderDTO> => ({
  id: "order_123",
  display_id: 1001,
  email: "customer@example.com",
  total: 1500,
  currency_code: "CZK",
  shipping_address: baseShippingAddress,
  ...overrides,
})

const createShippingData = (overrides = {}) => ({
  code: "z_point",
  requires_access_point: true,
  supports_cod: false,
  access_point_id: 4242,
  access_point_name: "Praha 1",
  access_point_street: "Main Street 1",
  access_point_city: "Prague",
  access_point_zip: "11000",
  access_point_country: "CZ",
  ...overrides,
})

const validationContext = {
  shipping_address: baseShippingAddress,
}

describe("PacketaFulfillmentProviderService", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPacketaClient.getEffectiveConfig.mockResolvedValue({
      config_id: "packeta-config-testing",
      api_password: "test-pwd",
      environment: "testing",
      allow_live_operations: true,
      default_label_format: "A6",
      default_label_offset: 0,
      sender_label: "Test Eshop",
    })
    mockPacketaClient.createPacket.mockResolvedValue({
      id: 987_654_321,
      barcode: "Z987654321",
      barcodeText: "Z 987 654 321",
    })
    mockPacketaClient.downloadLabelPdf.mockResolvedValue(Buffer.from("PDF"))
    mockPacketaClient.getBranches.mockResolvedValue([
      {
        id: 4242,
        name: "Praha 1",
        nameStreet: "Main Street 1",
        street: "Main Street 1",
        city: "Prague",
        zip: "11000",
        country: "cz",
        branchType: "pickup",
      },
    ])
    mockFileService.createFiles.mockResolvedValue([
      { url: "https://files.example/packeta-label-Z987654321.pdf" },
    ])
    mockQuery.graph.mockResolvedValue({ data: [] })
  })

  describe("getFulfillmentOptions", () => {
    it("returns empty array when Packeta is disabled", async () => {
      mockPacketaClient.getEffectiveConfig.mockResolvedValueOnce(null)
      const options = await createService().getFulfillmentOptions()
      expect(options).toEqual([])
    })

    it("returns both z_point options when enabled", async () => {
      const options = await createService().getFulfillmentOptions()
      expect(options).toHaveLength(2)
      expect(options.map((o: any) => o.code)).toEqual([
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
      expect(await createService().validateOption({ code })).toBe(expected)
    })
  })

  describe("validateFulfillmentData", () => {
    it("throws when access_point_id is missing", async () => {
      await expect(
        createService().validateFulfillmentData(
          { code: "z_point", supports_cod: false },
          {},
          validationContext as any
        )
      ).rejects.toThrow(PICKUP_POINT_ERROR)
    })

    it("throws when access_point_id is not a positive number", async () => {
      await expect(
        createService().validateFulfillmentData(
          { code: "z_point", supports_cod: false },
          { access_point_id: "not-a-number" },
          validationContext as any
        )
      ).rejects.toThrow(INVALID_PICKUP_POINT_ERROR)
    })

    it("parses numeric string access_point_id and returns normalised data", async () => {
      const data = await createService().validateFulfillmentData(
        { code: "z_point_cod", supports_cod: true },
        { access_point_id: "4242", access_point_name: "Praha 1" },
        validationContext as any
      )
      expect(data).toMatchObject({
        code: "z_point_cod",
        access_point_id: 4242,
        supports_cod: true,
        access_point_name: "Praha 1",
        access_point_street: "Main Street 1",
        access_point_city: "Prague",
        access_point_zip: "11000",
        access_point_country: "CZ",
      })
    })

    it("rejects a pickup point outside the cart shipping country", async () => {
      mockPacketaClient.getBranches.mockResolvedValueOnce([
        {
          id: 4242,
          name: "Bratislava",
          street: "Street 1",
          city: "Bratislava",
          zip: "81101",
          country: "sk",
        },
      ])

      await expect(
        createService().validateFulfillmentData(
          { code: "z_point", supports_cod: false },
          { access_point_id: 4242 },
          validationContext as any
        )
      ).rejects.toThrow("unavailable for the cart shipping country")
    })
  })

  describe("createFulfillment", () => {
    it("throws when order is missing", async () => {
      await expect(
        createService().createFulfillment(createShippingData(), [], undefined, {
          id: "ful_1",
        })
      ).rejects.toThrow("Packeta: Order is required")
    })

    it("throws when shipping_address is missing", async () => {
      const order = createOrder({ shipping_address: undefined })
      await expect(
        createService().createFulfillment(createShippingData(), [], order, {
          id: "ful_1",
        })
      ).rejects.toThrow("Packeta: Shipping address is required")
    })

    it("creates packet, downloads label, returns completed data", async () => {
      const order = createOrder()
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        order,
        { id: "ful_1" }
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({
          number: "ful_1",
          name: "John",
          surname: "Doe",
          addressId: 4242,
          currency: "CZK",
          eshop: "Test Eshop",
          weight: 0.5,
        }),
        {
          config_id: "packeta-config-testing",
          environment: "testing",
        }
      )
      expect(mockPacketaClient.downloadLabelPdf).toHaveBeenCalledWith(
        987_654_321,
        undefined,
        undefined,
        {
          config_id: "packeta-config-testing",
          environment: "testing",
        }
      )
      expect(mockFileService.createFiles).toHaveBeenCalled()
      expect(result.data).toMatchObject({
        status: "completed",
        packet_id: 987_654_321,
        barcode: "Z987654321",
        access_point_id: 4242,
        config_id: "packeta-config-testing",
        environment: "testing",
        label_url: "https://files.example/packeta-label-Z987654321.pdf",
        tracking_url: "https://tracking.packeta.com/Z987654321",
      })
      expect(result.labels).toEqual([
        expect.objectContaining({
          tracking_number: "Z987654321",
          tracking_url: "https://tracking.packeta.com/Z987654321",
        }),
      ])
    })

    it("requires a persisted fulfillment id before creating a packet", async () => {
      await expect(
        createService().createFulfillment(
          createShippingData(),
          [],
          createOrder(),
          {}
        )
      ).rejects.toThrow("Fulfillment id is required")

      expect(mockPacketaClient.createPacket).not.toHaveBeenCalled()
    })

    it("sets COD amount when supports_cod is true", async () => {
      const order = createOrder()
      await createService().createFulfillment(
        createShippingData({ code: "z_point_cod", supports_cod: false }),
        [],
        order,
        { id: "ful_1" }
      )
      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ cod: 1500, currency: "CZK" }),
        expect.any(Object)
      )
    })

    it("throws for COD when order total is missing", async () => {
      const order = createOrder({ total: undefined } as any)
      await expect(
        createService().createFulfillment(
          createShippingData({ code: "z_point_cod", supports_cod: false }),
          [],
          order,
          { id: "ful_1" }
        )
      ).rejects.toThrow(
        "Packeta: a positive order total or item_total is required for COD shipments"
      )
      expect(mockPacketaClient.createPacket).not.toHaveBeenCalled()
    })

    it("throws for COD when order total is zero", async () => {
      const order = createOrder({ total: 0 } as any)
      await expect(
        createService().createFulfillment(
          createShippingData({ code: "z_point_cod", supports_cod: false }),
          [],
          order,
          { id: "ful_1" }
        )
      ).rejects.toThrow(
        "Packeta: a positive order total or item_total is required for COD shipments"
      )
      expect(mockPacketaClient.createPacket).not.toHaveBeenCalled()
    })

    it("uses explicit shipping weight as kilograms", async () => {
      const order = createOrder()
      await createService().createFulfillment(
        createShippingData({ weight: 1.2 }),
        [],
        order,
        { id: "ful_1" }
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 1.2 }),
        expect.any(Object)
      )
    })

    it("calculates weight from variant weight in grams", async () => {
      const order = createOrder({
        items: [
          {
            id: "ordli_1",
            quantity: 2,
            variant: {
              weight: 400,
            },
          } as any,
        ],
      })
      await createService().createFulfillment(
        createShippingData(),
        [{ line_item_id: "ordli_1", quantity: 2 } as any],
        order,
        { id: "ful_1" }
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 0.8 }),
        expect.any(Object)
      )
    })

    it("calculates weight from product weight in grams", async () => {
      mockQuery.graph.mockResolvedValueOnce({
        data: [{ id: "prod_1", weight: 1000 }],
      })
      const order = createOrder({
        items: [
          {
            id: "ordli_1",
            product_id: "prod_1",
            quantity: 3,
            variant: {},
          } as any,
        ],
      })
      await createService().createFulfillment(
        createShippingData(),
        [{ line_item_id: "ordli_1", quantity: 3 } as any],
        order,
        { id: "ful_1" }
      )

      expect(mockPacketaClient.createPacket).toHaveBeenCalledWith(
        expect.objectContaining({ weight: 3 }),
        expect.any(Object)
      )
    })

    it("still returns completed fulfillment if label upload fails", async () => {
      mockPacketaClient.downloadLabelPdf.mockRejectedValueOnce(
        new Error("S3 down")
      )
      const order = createOrder()
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        order,
        { id: "ful_1" }
      )
      expect((result.data as any).status).toBe("completed")
      expect((result.data as any).label_url).toBeUndefined()
      expect(result.labels).toEqual([])
    })
  })

  describe("cancelFulfillment", () => {
    it("rejects cancellation when no packet_id is available", async () => {
      await expect(createService().cancelFulfillment({})).rejects.toThrow(
        "has no packet identifier"
      )
    })

    it("calls packeta client cancel when packet_id present", async () => {
      mockPacketaClient.cancelPacket.mockResolvedValue(true)
      const result = await createService().cancelFulfillment({
        packet_id: 123,
        barcode: "Z123",
        config_id: "packeta-config-testing",
        environment: "testing",
      })
      expect(mockPacketaClient.cancelPacket).toHaveBeenCalledWith(123, {
        config_id: "packeta-config-testing",
        environment: "testing",
      })
      expect(result).toMatchObject({ cancelled: true, packet_id: 123 })
    })

    it("rejects cancellation when Packeta does not cancel the packet", async () => {
      mockPacketaClient.cancelPacket.mockResolvedValue(false)
      await expect(
        createService().cancelFulfillment({ packet_id: 123, barcode: "Z123" })
      ).rejects.toThrow("was not cancelled by the carrier")
    })
  })
})
