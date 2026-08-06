import type {
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

import PplFulfillmentProviderService from "../../../../../src/modules/fulfillment-ppl/service"
import { PplClientModuleService } from "../../../../../src/modules/ppl-client/service"

type FulfillmentConstructorArgs = ConstructorParameters<
  typeof PplFulfillmentProviderService
>
type InjectedDependencies = FulfillmentConstructorArgs[0]
type PplOptions = FulfillmentConstructorArgs[1]

type PplClientConstructorArgs = ConstructorParameters<
  typeof PplClientModuleService
>
type PplClientInjectedDependencies = PplClientConstructorArgs[0]
type PplClientModuleOptions = PplClientConstructorArgs[1]

const mockLogger: Logger = {
  activity: vi.fn<Logger["activity"]>(),
  debug: vi.fn<Logger["debug"]>(),
  error: vi.fn<Logger["error"]>(),
  failure: vi.fn<Logger["failure"]>(),
  http: vi.fn<Logger["http"]>(),
  info: vi.fn<Logger["info"]>(),
  log: vi.fn<Logger["log"]>(),
  panic: vi.fn<Logger["panic"]>(),
  progress: vi.fn<Logger["progress"]>(),
  setLogLevel: vi.fn<Logger["setLogLevel"]>(),
  shouldLog: vi.fn<Logger["shouldLog"]>(),
  silly: vi.fn<Logger["silly"]>(),
  success: vi.fn<Logger["success"]>(),
  unsetLogLevel: vi.fn<Logger["unsetLogLevel"]>(),
  verbose: vi.fn<Logger["verbose"]>(),
  warn: vi.fn<Logger["warn"]>(),
}

const pplClientModuleOptions: PplClientModuleOptions = {
  environment: "testing",
}

/**
 * `PplClientModuleService` has private instance fields, so TypeScript treats
 * it nominally: a plain object literal can never satisfy its type, even with
 * every public method implemented (the private fields would always be
 * "missing"). A real instance is constructed here - the same technique the
 * module's own spec (ppl-client/service.unit.spec.ts) uses for itself - and
 * its public methods are replaced with `vi.spyOn`, so the fulfillment
 * provider under test receives a genuinely typed `PplClientModuleService`
 * with fully mocked behavior, without any cast.
 */
const createRealPplClient = (): PplClientModuleService => {
  const container: PplClientInjectedDependencies = { logger: mockLogger }
  return new PplClientModuleService(container, pplClientModuleOptions)
}

const pplClient = createRealPplClient()

const mockPplClient = {
  cancelShipment: vi.spyOn(pplClient, "cancelShipment"),
  createShipmentBatch: vi.spyOn(pplClient, "createShipmentBatch"),
  getBatchStatus: vi.spyOn(pplClient, "getBatchStatus"),
  getCachedCountries: vi.spyOn(pplClient, "getCachedCountries"),
  getCachedCurrencies: vi.spyOn(pplClient, "getCachedCurrencies"),
  getCustomerAddresses: vi.spyOn(pplClient, "getCustomerAddresses"),
  getCustomerInfo: vi.spyOn(pplClient, "getCustomerInfo"),
  getEffectiveConfig: vi.spyOn(pplClient, "getEffectiveConfig"),
}

const createPplOptions = (overrides: Partial<PplOptions> = {}): PplOptions => ({
  client_id: "test-client-id",
  client_secret: "test-client-secret",
  default_label_format: "Pdf",
  environment: "testing",
  ...overrides,
})

const createValidateContext = (): ValidateFulfillmentDataContext => ({
  from_location: {
    address_id: "loc_addr_1",
    created_at: new Date(),
    deleted_at: null,
    fulfillment_sets: [],
    id: "loc_1",
    metadata: null,
    name: "Test Location",
    updated_at: new Date(),
  },
  id: "cart_1",
  items: [],
})

const createService = (): PplFulfillmentProviderService => {
  const container: InjectedDependencies = {
    logger: mockLogger,
    ppl_client: pplClient,
  }
  return new PplFulfillmentProviderService(container, createPplOptions())
}

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

const addressWithoutCountryCode = {
  address_1: baseShippingAddress.address_1,
  city: baseShippingAddress.city,
  created_at: baseShippingAddress.created_at,
  first_name: baseShippingAddress.first_name,
  id: baseShippingAddress.id,
  last_name: baseShippingAddress.last_name,
  phone: baseShippingAddress.phone,
  postal_code: baseShippingAddress.postal_code,
  updated_at: baseShippingAddress.updated_at,
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

const createOrderWithoutShippingAddress = (
  overrides: Partial<Omit<FulfillmentOrderDTO, "shipping_address">> = {},
): Partial<FulfillmentOrderDTO> => ({
  currency_code: "CZK",
  display_id: 1001,
  email: "customer@example.com",
  id: "order_123",
  total: 1500,
  ...overrides,
})

const createShippingData = (overrides = {}) => ({
  product_type: "PRIV",
  supports_cod: false,
  ...overrides,
})

describe(PplFulfillmentProviderService, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPplClient.getCachedCurrencies.mockResolvedValue([
      { code: "CZK", name: "Czech Koruna" },
      { code: "EUR", name: "Euro" },
    ])
    mockPplClient.getCachedCountries.mockResolvedValue([
      { codAllowed: true, code: "CZ", name: "Czech Republic" },
    ])
    mockPplClient.getCustomerInfo.mockResolvedValue({
      customerName: "Test Company",
    })
    mockPplClient.getCustomerAddresses.mockResolvedValue(null)
    mockPplClient.getEffectiveConfig.mockResolvedValue(
      createPplOptions({
        sender_city: "Prague",
        sender_country: "CZ",
        sender_name: "Test Sender",
        sender_street: "Sender Street 1",
        sender_zip_code: "10000",
      }),
    )
    mockPplClient.createShipmentBatch.mockResolvedValue("batch_123")
  })

  describe("createFulfillment", () => {
    it("throws if order is missing", async () => {
      await expect(
        createService().createFulfillment(createShippingData(), [], undefined, {
          id: "ful_1",
        }),
      ).rejects.toThrow("PPL: Order is required for fulfillment")
    })

    it("throws if shipping address is missing", async () => {
      await expect(
        createService().createFulfillment(
          createShippingData(),
          [],
          createOrderWithoutShippingAddress(),
          { id: "ful_1" },
        ),
      ).rejects.toThrow("PPL: Shipping address is required")
    })

    it("throws if country_code is missing", async () => {
      const order = createOrder({
        shipping_address: addressWithoutCountryCode,
      })
      await expect(
        createService().createFulfillment(createShippingData(), [], order, {
          id: "ful_1",
        }),
      ).rejects.toThrow("PPL: Shipping address must include country_code")
    })

    it("builds recipient from shipping address and returns pending status", async () => {
      const result = await createService().createFulfillment(
        createShippingData(),
        [],
        createOrder(),
        { id: "ful_1" },
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          recipient: {
            city: "Prague",
            country: "CZ",
            email: "customer@example.com",
            name: "John Doe",
            phone: "+420123456789",
            street: "123 Main Street",
            zipCode: "11000",
          },
        }),
      ])

      expect(result).toStrictEqual({
        data: {
          batch_id: "batch_123",
          product_type: "PRIV",
          status: "pending",
        },
        labels: [],
      })
    })

    it("builds COD settings with bank account when supports_cod is true", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue(
        createPplOptions({
          cod_bank_account: "123456789",
          cod_bank_code: "0100",
          sender_city: "City",
          sender_country: "CZ",
          sender_name: "Test",
          sender_street: "Street",
          sender_zip_code: "10000",
        }),
      )

      await createService().createFulfillment(
        createShippingData({ supports_cod: true }),
        [],
        createOrder(),
        { id: "ful_1" },
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          cashOnDelivery: {
            bankAccount: "123456789",
            bankCode: "0100",
            codCurrency: "CZK",
            codPrice: 1500,
            codVarSym: "1001",
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
          { id: "ful_1" },
        ),
      ).rejects.toThrow("PPL: Currency USD is not supported for COD")
    })

    it("throws if COD not allowed for country", async () => {
      mockPplClient.getCachedCountries.mockResolvedValue([
        { codAllowed: false, code: "CZ", name: "Czech Republic" },
      ])

      await expect(
        createService().createFulfillment(
          createShippingData({ supports_cod: true }),
          [],
          createOrder(),
          { id: "ful_1" },
        ),
      ).rejects.toThrow("PPL: COD is not allowed for country CZ")
    })

    it("builds COD settings with IBAN when provided", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue(
        createPplOptions({
          cod_iban: "CZ1234567890",
          cod_swift: "KOMBCZPP",
          sender_city: "City",
          sender_country: "CZ",
          sender_name: "Test",
          sender_street: "Street",
          sender_zip_code: "10000",
        }),
      )

      await createService().createFulfillment(
        createShippingData({ supports_cod: true }),
        [],
        createOrder(),
        { id: "ful_1" },
      )

      expect(mockPplClient.createShipmentBatch).toHaveBeenCalledWith([
        expect.objectContaining({
          cashOnDelivery: {
            codCurrency: "CZK",
            codPrice: 1500,
            codVarSym: "1001",
            iban: "CZ1234567890",
            swift: "KOMBCZPP",
          },
        }),
      ])
    })

    it("includes access_point_id for pickup delivery", async () => {
      await createService().createFulfillment(
        createShippingData({ access_point_id: "AP123", product_type: "SMAR" }),
        [],
        createOrder(),
        { id: "ful_1" },
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
          { product_type: "PRIV", requires_access_point: false },
          {},
          createValidateContext(),
        ),
      ).rejects.toThrow("PPL shipping is currently unavailable")
    })

    it("throws when access point required but not provided", async () => {
      await expect(
        createService().validateFulfillmentData(
          { product_type: "SMAR", requires_access_point: true },
          {},
          createValidateContext(),
        ),
      ).rejects.toThrow("PPL: Access point (pickup location) is required")
    })

    it("returns correct shape for pickup delivery", async () => {
      const result = await createService().validateFulfillmentData(
        {
          product_type: "SMAR",
          requires_access_point: true,
          supports_cod: false,
        },
        {
          access_point_id: "AP123",
          access_point_name: "Test Shop",
          access_point_type: "ParcelShop",
        },
        createValidateContext(),
      )

      expect(result).toStrictEqual({
        access_point_id: "AP123",
        access_point_name: "Test Shop",
        access_point_type: "ParcelShop",
        product_type: "SMAR",
        requires_access_point: true,
        supports_cod: false,
      })
    })

    it("returns correct shape for home delivery", async () => {
      const result = await createService().validateFulfillmentData(
        {
          product_type: "PRIV",
          requires_access_point: false,
          supports_cod: true,
        },
        {},
        createValidateContext(),
      )

      expect(result).toStrictEqual({
        product_type: "PRIV",
        requires_access_point: false,
        supports_cod: true,
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
        batch_id: "batch_123",
        status: "pending",
      })

      expect(mockPplClient.getBatchStatus).toHaveBeenCalledWith("batch_123")
      expect(mockPplClient.cancelShipment).toHaveBeenCalledWith("12345678901")
      expect(result).toStrictEqual({
        cancelled: true,
        shipment_number: "12345678901",
      })
    })

    it("returns failure when batch not yet processed", async () => {
      mockPplClient.getBatchStatus.mockResolvedValue({
        // No shipmentNumber yet
        items: [{ referenceId: "ful_123" }],
      })

      const result = await createService().cancelFulfillment({
        batch_id: "batch_123",
        status: "pending",
      })

      expect(mockPplClient.getBatchStatus).toHaveBeenCalledWith("batch_123")
      expect(mockPplClient.cancelShipment).not.toHaveBeenCalled()
      expect(result).toStrictEqual({
        batch_id: "batch_123",
        cancelled: false,
        note: "Batch not yet processed by PPL. Check PPL portal or retry later.",
      })
    })

    it("calls PPL API directly when shipment_number already available", async () => {
      mockPplClient.cancelShipment.mockResolvedValue(true)

      const result = await createService().cancelFulfillment({
        batch_id: "batch_123",
        shipment_number: "12345678901",
        status: "completed",
      })

      expect(mockPplClient.getBatchStatus).not.toHaveBeenCalled()
      expect(mockPplClient.cancelShipment).toHaveBeenCalledWith("12345678901")
      expect(result).toStrictEqual({
        cancelled: true,
        shipment_number: "12345678901",
      })
    })

    it("returns failure when PPL cancellation fails", async () => {
      mockPplClient.cancelShipment.mockResolvedValue(false)

      const result = await createService().cancelFulfillment({
        batch_id: "batch_123",
        shipment_number: "12345678901",
        status: "completed",
      })

      expect(result).toStrictEqual({
        cancelled: false,
        note: "Cancellation failed. Shipment may have been picked up. Contact PPL support.",
        shipment_number: "12345678901",
      })
    })
  })

  describe("validateOption", () => {
    it("returns true for valid product types", async () => {
      await expect(
        createService().validateOption({ product_type: "SMAR" }),
      ).resolves.toBeTruthy()
      await expect(
        createService().validateOption({ product_type: "SMAD" }),
      ).resolves.toBeTruthy()
      await expect(
        createService().validateOption({ product_type: "PRIV" }),
      ).resolves.toBeTruthy()
      await expect(
        createService().validateOption({ product_type: "PRID" }),
      ).resolves.toBeTruthy()
    })

    it("returns false for invalid product type", async () => {
      await expect(
        createService().validateOption({ product_type: "INVALID" }),
      ).resolves.toBeFalsy()
    })
  })

  describe("getFulfillmentOptions", () => {
    it("returns all available PPL shipping options when enabled", async () => {
      const options = await createService().getFulfillmentOptions()

      expect(options).toHaveLength(4)
      expect(options.map((o) => o.id)).toStrictEqual([
        "ppl-parcel-smart",
        "ppl-parcel-smart-cod",
        "ppl-private",
        "ppl-private-cod",
      ])
    })

    it("returns empty array when PPL is disabled", async () => {
      mockPplClient.getEffectiveConfig.mockResolvedValue(null)

      const options = await createService().getFulfillmentOptions()

      expect(options).toStrictEqual([])
    })
  })
})
