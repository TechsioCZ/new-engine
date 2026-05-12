import type { FulfillmentOrderDTO } from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../../../src/modules/ppl-client", () => ({
  PPL_CLIENT_MODULE: "ppl_client",
}))

// Import after mock
import PplFulfillmentProviderService from "../../../../../src/modules/fulfillment-ppl/service"

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

const mockPplClient = {
  getCachedCurrencies: vi.fn(),
  getCachedCountries: vi.fn(),
  getCustomerInfo: vi.fn(),
  getCustomerAddresses: vi.fn(),
  getEffectiveConfig: vi.fn(),
  createShipmentBatch: vi.fn(),
  cancelShipment: vi.fn(),
  getBatchStatus: vi.fn(),
}

const createService = () =>
  new PplFulfillmentProviderService(
    { logger: mockLogger, ppl_client: mockPplClient } as any,
    {} as any
  )

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
  product_type: "PRIV",
  access_point_id: undefined,
  supports_cod: false,
  ...overrides,
})

describe("PplFulfillmentProviderService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPplClient.getCachedCurrencies.mockResolvedValue([
      { code: "CZK" },
      { code: "EUR" },
    ])
    mockPplClient.getCachedCountries.mockResolvedValue([
      { code: "CZ", codAllowed: true },
    ])
    mockPplClient.getCustomerInfo.mockResolvedValue({ name: "Test Company" })
    mockPplClient.getCustomerAddresses.mockResolvedValue(null)
    mockPplClient.getEffectiveConfig.mockResolvedValue({
      sender_name: "Test Sender",
      sender_street: "Sender Street 1",
      sender_city: "Prague",
      sender_zip_code: "10000",
      sender_country: "CZ",
    })
    mockPplClient.createShipmentBatch.mockResolvedValue("batch_123")
  })

  describe("createFulfillment", () => {
    it("throws if order is missing", async () => {
      await expect(
        createService().createFulfillment(createShippingData(), [], undefined, {
          id: "ful_1",
        })
      ).rejects.toThrow("PPL: Order is required for fulfillment")
    })

    it("throws if shipping address is missing", async () => {
      const order = createOrder({ shipping_address: undefined })
      await expect(
        createService().createFulfillment(createShippingData(), [], order, {
          id: "ful_1",
        })
      ).rejects.toThrow("PPL: Shipping address is required")
    })

    it("throws if country_code is missing", async () => {
      const order = createOrder({
        shipping_address: { ...baseShippingAddress, country_code: undefined },
      })
      await expect(
        createService().createFulfillment(createShippingData(), [], order, {
          id: "ful_1",
        })
      ).rejects.toThrow("PPL: Shipping address must include country_code")
    })

    it("builds recipient from shipping address and returns pending status", async () => {
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        createOrder(),
        { id: "ful_1" }
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          recipient: {
            name: "John Doe",
            street: "123 Main Street",
            city: "Prague",
            zipCode: "11000",
            country: "CZ",
            phone: "+420123456789",
            email: "customer@example.com",
          },
        }),
      ])

      expect(result).toEqual({
        data: {
          status: "pending",
          batch_id: "batch_123",
          product_type: "PRIV",
          access_point_id: undefined,
        },
        labels: [],
      })
    })

    it("builds COD settings with bank account when supports_cod is true", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue({
        sender_name: "Test",
        sender_street: "Street",
        sender_city: "City",
        sender_zip_code: "10000",
        sender_country: "CZ",
        cod_bank_account: "123456789",
        cod_bank_code: "0100",
      })

      await createService().createFulfillment(
        createShippingData({ supports_cod: true }),
        [],
        createOrder(),
        { id: "ful_1" }
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          cashOnDelivery: {
            codPrice: 1500,
            codCurrency: "CZK",
            codVarSym: "1001",
            bankAccount: "123456789",
            bankCode: "0100",
          },
        }),
      ])
    })

    it("throws if COD currency is not supported", async () => {
      const order = createOrder({ currency_code: "USD" })
      await expect(
        createService().createFulfillment(
          createShippingData({ supports_cod: true }),
          [],
          order,
          { id: "ful_1" }
        )
      ).rejects.toThrow("PPL: Currency USD is not supported for COD")
    })

    it("throws if COD not allowed for country", async () => {
      mockPplClient.getCachedCountries.mockResolvedValue([
        { code: "CZ", codAllowed: false },
      ])

      await expect(
        createService().createFulfillment(
          createShippingData({ supports_cod: true }),
          [],
          createOrder(),
          { id: "ful_1" }
        )
      ).rejects.toThrow("PPL: COD is not allowed for country CZ")
    })

    it("builds COD settings with IBAN when provided", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue({
        sender_name: "Test",
        sender_street: "Street",
        sender_city: "City",
        sender_zip_code: "10000",
        sender_country: "CZ",
        cod_iban: "CZ1234567890",
        cod_swift: "KOMBCZPP",
      })

      await createService().createFulfillment(
        createShippingData({ supports_cod: true }),
        [],
        createOrder(),
        { id: "ful_1" }
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          cashOnDelivery: {
            codPrice: 1500,
            codCurrency: "CZK",
            codVarSym: "1001",
            iban: "CZ1234567890",
            swift: "KOMBCZPP",
          },
        }),
      ])
    })

    it("includes access_point_id for pickup delivery", async () => {
      await createService().createFulfillment(
        createShippingData({ product_type: "SMAR", access_point_id: "AP123" }),
        [],
        createOrder(),
        { id: "ful_1" }
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          specificDelivery: { parcelShopCode: "AP123" },
        }),
      ])
    })
  })

  describe("validateFulfillmentData", () => {
    it("throws when PPL is disabled", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue(null)

      await expect(
        createService().validateFulfillmentData(
          { requires_access_point: false, product_type: "PRIV" },
          {},
          {} as any
        )
      ).rejects.toThrow("PPL shipping is currently unavailable")
    })

    it("throws when access point required but not provided", async () => {
      await expect(
        createService().validateFulfillmentData(
          { requires_access_point: true, product_type: "SMAR" },
          { access_point_id: undefined },
          {} as any
        )
      ).rejects.toThrow("PPL: Access point (pickup location) is required")
    })

    it("returns correct shape for pickup delivery", async () => {
      const result = await createService().validateFulfillmentData(
        {
          requires_access_point: true,
          product_type: "SMAR",
          supports_cod: false,
        },
        {
          access_point_id: "AP123",
          access_point_name: "Test Shop",
          access_point_type: "ParcelShop",
        },
        {} as any
      )

      expect(result).toEqual({
        product_type: "SMAR",
        requires_access_point: true,
        supports_cod: false,
        access_point_id: "AP123",
        access_point_name: "Test Shop",
        access_point_type: "ParcelShop",
      })
    })

    it("returns correct shape for home delivery", async () => {
      const result = await createService().validateFulfillmentData(
        {
          requires_access_point: false,
          product_type: "PRIV",
          supports_cod: true,
        },
        {},
        {} as any
      )

      expect(result).toEqual({
        product_type: "PRIV",
        requires_access_point: false,
        supports_cod: true,
        access_point_id: undefined,
        access_point_name: undefined,
        access_point_type: undefined,
      })
    })
  })

  describe("cancelFulfillment", () => {
    it("fetches batch status and cancels when pending without shipment_number", async () => {
      mockPplClient.getBatchStatus.mockResolvedValue({
        items: [{ referenceId: "ful_123", shipmentNumber: "12345678901" }],
      })
      mockPplClient.cancelShipment.mockResolvedValue(true)

      const result = await createService().cancelFulfillment({
        status: "pending",
        batch_id: "batch_123",
      })

      expect(mockPplClient.getBatchStatus).toHaveBeenCalledWith("batch_123")
      expect(mockPplClient.cancelShipment).toHaveBeenCalledWith("12345678901")
      expect(result).toEqual({
        cancelled: true,
        shipment_number: "12345678901",
      })
    })

    it("returns failure when batch not yet processed", async () => {
      mockPplClient.getBatchStatus.mockResolvedValue({
        items: [{ referenceId: "ful_123" }], // No shipmentNumber yet
      })

      const result = await createService().cancelFulfillment({
        status: "pending",
        batch_id: "batch_123",
      })

      expect(mockPplClient.getBatchStatus).toHaveBeenCalledWith("batch_123")
      expect(mockPplClient.cancelShipment).not.toHaveBeenCalled()
      expect(result).toEqual({
        cancelled: false,
        batch_id: "batch_123",
        note: "Batch not yet processed by PPL. Check PPL portal or retry later.",
      })
    })

    it("calls PPL API directly when shipment_number already available", async () => {
      mockPplClient.cancelShipment.mockResolvedValue(true)

      const result = await createService().cancelFulfillment({
        status: "completed",
        batch_id: "batch_123",
        shipment_number: "12345678901",
      })

      expect(mockPplClient.getBatchStatus).not.toHaveBeenCalled()
      expect(mockPplClient.cancelShipment).toHaveBeenCalledWith("12345678901")
      expect(result).toEqual({
        cancelled: true,
        shipment_number: "12345678901",
      })
    })

    it("returns failure when PPL cancellation fails", async () => {
      mockPplClient.cancelShipment.mockResolvedValue(false)

      const result = await createService().cancelFulfillment({
        status: "completed",
        batch_id: "batch_123",
        shipment_number: "12345678901",
      })

      expect(result).toEqual({
        cancelled: false,
        shipment_number: "12345678901",
        note: "Cancellation failed. Shipment may have been picked up. Contact PPL support.",
      })
    })
  })

  describe("validateOption", () => {
    it("returns true for valid product types", async () => {
      expect(
        await createService().validateOption({ product_type: "SMAR" })
      ).toBe(true)
      expect(
        await createService().validateOption({ product_type: "SMAD" })
      ).toBe(true)
      expect(
        await createService().validateOption({ product_type: "PRIV" })
      ).toBe(true)
      expect(
        await createService().validateOption({ product_type: "PRID" })
      ).toBe(true)
    })

    it("returns false for invalid product type", async () => {
      expect(
        await createService().validateOption({ product_type: "INVALID" })
      ).toBe(false)
    })
  })

  describe("getFulfillmentOptions", () => {
    it("returns all available PPL shipping options when enabled", async () => {
      const options = await createService().getFulfillmentOptions()

      expect(options).toHaveLength(4)
      expect(options.map((o) => o.id)).toEqual([
        "ppl-parcel-smart",
        "ppl-parcel-smart-cod",
        "ppl-private",
        "ppl-private-cod",
      ])
    })

    it("returns empty array when PPL is disabled", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue(null)

      const options = await createService().getFulfillmentOptions()

      expect(options).toEqual([])
    })
  })
})
