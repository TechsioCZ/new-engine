import { MedusaError, Modules } from "@medusajs/framework/utils"
import { withMedusaStatusCode } from "../../../utils/errors"

const mockAresClient = {
  getEconomicSubjectByIco: jest.fn(),
  searchEconomicSubjects: jest.fn(),
  searchStandardizedAddresses: jest.fn(),
}

const mockViesClient = {
  checkVatNumber: jest.fn(),
}

const mockMojeDaneClient = {
  getStatusNespolehlivySubjektRozsirenyV2: jest.fn(),
}

jest.mock("../clients/ares-client", () => ({
  AresClient: jest.fn().mockImplementation(() => mockAresClient),
}))

jest.mock("../clients/vies-client", () => ({
  ViesClient: jest.fn().mockImplementation(() => mockViesClient),
}))

jest.mock("../clients/moje-dane-client", () => ({
  MojeDaneClient: jest.fn().mockImplementation(() => mockMojeDaneClient),
}))

import { CompanyCheckModuleService } from "../service"

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createCacheService() {
  const store = new Map<string, unknown>()

  return {
    get: jest.fn(async ({ key }: { key: string }) => {
      if (!store.has(key)) {
        return null
      }

      return store.get(key)
    }),
    set: jest.fn(async ({ key, data }: { key: string; data: unknown }) => {
      store.set(key, data)
    }),
    clear: jest.fn(async () => {}),
  }
}

function createLockingService() {
  return {
    execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  }
}

function createService(
  cacheService: ReturnType<typeof createCacheService>,
  lockingService: ReturnType<typeof createLockingService>
): CompanyCheckModuleService {
  return new CompanyCheckModuleService({
    logger: mockLogger,
    [Modules.CACHING]: cacheService as any,
    [Modules.LOCKING]: lockingService as any,
  } as any)
}

describe("CompanyCheckModuleService ARES caching", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      ARES_BASE_URL: "https://ares.invalid/rest",
      VIES_BASE_URL: "https://vies.invalid/rest",
      MOJE_DANE_WSDL_URL: "https://mojedane.invalid/wsdl",
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("caches positive ARES ICO lookup", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.getEconomicSubjectByIco.mockResolvedValue({
      ico: "17321743",
      obchodniJmeno: "Nauc me IT, s.r.o.",
      sidlo: null,
    })

    const first = await service.getAresEconomicSubjectByIco("17321743")
    const second = await service.getAresEconomicSubjectByIco("17321743")

    expect(first.ico).toBe("17321743")
    expect(second.ico).toBe("17321743")
    expect(mockAresClient.getEconomicSubjectByIco).toHaveBeenCalledTimes(1)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:ares:ico:17321743",
        ttl: 24 * 60 * 60,
      })
    )
  })

  it("negative-caches ARES ICO not-found results", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.getEconomicSubjectByIco.mockRejectedValue(
      withMedusaStatusCode(
        new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "ARES economic-subject lookup failed: 404 - Not Found"
        ),
        404
      )
    )

    await expect(
      service.getAresEconomicSubjectByIco("00000000")
    ).rejects.toMatchObject({
      type: MedusaError.Types.NOT_FOUND,
    })
    await expect(
      service.getAresEconomicSubjectByIco("00000000")
    ).rejects.toMatchObject({
      type: MedusaError.Types.NOT_FOUND,
    })

    expect(mockAresClient.getEconomicSubjectByIco).toHaveBeenCalledTimes(1)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:ares:ico:00000000",
        ttl: 30 * 60,
      })
    )
  })

  it("caches ARES name search by whitespace-stripped company name", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.searchEconomicSubjects.mockResolvedValue({
      pocetCelkem: 1,
      ekonomickeSubjekty: [
        {
          ico: "17321743",
          obchodniJmeno: "ACME s.r.o.",
        },
      ],
    })

    await service.searchAresEconomicSubjects({
      obchodniJmeno: " ACME   s.r.o. ",
    })
    await service.searchAresEconomicSubjects({
      obchodniJmeno: "ACMEs.r.o.",
    })

    expect(mockAresClient.searchEconomicSubjects).toHaveBeenCalledTimes(1)
    const firstSetPayload = cacheService.set.mock.calls[0]?.[0] as
      | { key?: string; ttl?: number }
      | undefined
    expect(firstSetPayload?.key).toMatch(/^company-check:ares:name:[a-f0-9]{24}$/)
    expect(firstSetPayload?.ttl).toBe(24 * 60 * 60)
  })

  it("caches standardized address searches with negative TTL for empty results", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.searchStandardizedAddresses.mockResolvedValue({
      pocetCelkem: 0,
      standardizovaneAdresy: [],
    })

    await service.searchAresStandardizedAddresses({
      textovaAdresa: "FictionalStreet 174, ExampleCity",
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
    })
    await service.searchAresStandardizedAddresses({
      textovaAdresa: "FictionalStreet 174, ExampleCity",
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
    })

    expect(mockAresClient.searchStandardizedAddresses).toHaveBeenCalledTimes(1)

    const firstSetPayload = cacheService.set.mock.calls[0]?.[0] as
      | { key?: string; ttl?: number }
      | undefined

    expect(firstSetPayload?.key).toMatch(
      /^company-check:ares:address-standardization:/
    )
    expect(firstSetPayload?.ttl).toBe(30 * 60)
  })

  it("uses separate cache namespaces for address standardization and sidlo searches", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.searchStandardizedAddresses.mockResolvedValue({
      pocetCelkem: 1,
      standardizovaneAdresy: [],
    })
    mockAresClient.searchEconomicSubjects.mockResolvedValue({
      pocetCelkem: 1,
      ekonomickeSubjekty: [],
    })

    await service.searchAresStandardizedAddresses({
      textovaAdresa: "FictionalStreet 174, ExampleCity",
      typStandardizaceAdresy: "VYHOVUJICI_ADRESY",
    })
    await service.searchAresEconomicSubjects({
      sidlo: { textovaAdresa: "FictionalStreet 174, ExampleCity" },
    })

    expect(mockAresClient.searchStandardizedAddresses).toHaveBeenCalledTimes(1)
    expect(mockAresClient.searchEconomicSubjects).toHaveBeenCalledTimes(1)

    const cacheKeys = cacheService.set.mock.calls
      .map((call) => call[0]?.key)
      .filter((value): value is string => typeof value === "string")

    expect(
      cacheKeys.some((key) =>
        key.startsWith("company-check:ares:address-standardization:")
      )
    ).toBe(true)
    expect(
      cacheKeys.some((key) => key.startsWith("company-check:ares:address:"))
    ).toBe(true)
  })

  it("normalizes DIC in service before invoking Moje Dane client", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockMojeDaneClient.getStatusNespolehlivySubjektRozsirenyV2.mockResolvedValue({
      nespolehlivyPlatce: "NE",
    })

    const result = await service.checkTaxReliability(" CZ12345678 ")

    expect(mockMojeDaneClient.getStatusNespolehlivySubjektRozsirenyV2).toHaveBeenCalledWith(
      "12345678"
    )
    expect(result.reliable).toBe(true)
  })

  it("throws when ARES base URL is missing", () => {
    process.env.ARES_BASE_URL = "   "

    expect(() => createService(createCacheService(), createLockingService())).toThrow(
      "ARES base URL is not configured"
    )
  })

  it("throws when VIES base URL is missing", () => {
    process.env.VIES_BASE_URL = ""

    expect(() => createService(createCacheService(), createLockingService())).toThrow(
      "VIES base URL is not configured"
    )
  })

  it("throws when Moje Dane WSDL URL is missing", () => {
    process.env.MOJE_DANE_WSDL_URL = "   "

    expect(() => createService(createCacheService(), createLockingService())).toThrow(
      "Moje Dane WSDL URL is not configured"
    )
  })

  it("caches VIES VAT checks and reuses parsed cached value", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockViesClient.checkVatNumber.mockResolvedValue({
      valid: false,
    })

    const first = await service.checkVatNumber({
      countryCode: "CZ",
      vatNumber: "99999999",
    })
    const second = await service.checkVatNumber({
      countryCode: "CZ",
      vatNumber: "99999999",
    })

    expect(first.valid).toBe(false)
    expect(second.valid).toBe(false)
    expect(mockViesClient.checkVatNumber).toHaveBeenCalledTimes(1)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:vies:CZ:99999999",
        ttl: 30 * 60,
      })
    )
  })

  it("uses positive VIES TTL for valid VAT checks", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockViesClient.checkVatNumber.mockResolvedValue({
      valid: true,
    })

    await service.checkVatNumber({
      countryCode: "CZ",
      vatNumber: "12345678",
    })

    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:vies:CZ:12345678",
        ttl: 6 * 60 * 60,
      })
    )
  })

  it("refetches VIES response when cached value fails schema validation", async () => {
    const cacheService = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ cached: "invalid" })
        .mockResolvedValueOnce(null),
      set: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    }
    const lockingService = createLockingService()
    const service = createService(cacheService as any, lockingService)

    mockViesClient.checkVatNumber.mockResolvedValue({
      valid: true,
    })

    const result = await service.checkVatNumber({
      countryCode: "CZ",
      vatNumber: "12345678",
    })

    expect(result.valid).toBe(true)
    expect(cacheService.get).toHaveBeenCalledTimes(2)
    expect(mockViesClient.checkVatNumber).toHaveBeenCalledTimes(1)
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:vies:CZ:12345678",
      })
    )
  })

  it("caches Moje Dane negative result and reuses parsed cached value", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockMojeDaneClient.getStatusNespolehlivySubjektRozsirenyV2.mockResolvedValue({
      nespolehlivyPlatce: "NENALEZEN",
    })

    const first = await service.checkTaxReliability("12345678")
    const second = await service.checkTaxReliability("12345678")

    expect(first.reliable).toBeNull()
    expect(second.reliable).toBeNull()
    expect(mockMojeDaneClient.getStatusNespolehlivySubjektRozsirenyV2).toHaveBeenCalledTimes(
      1
    )
    expect(cacheService.set).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "company-check:mojedane:12345678",
        ttl: 30 * 60,
      })
    )
  })

  it("rethrows non-404 errors from ARES ICO lookup", async () => {
    const cacheService = createCacheService()
    const lockingService = createLockingService()
    const service = createService(cacheService, lockingService)

    mockAresClient.getEconomicSubjectByIco.mockRejectedValue(
      new Error("upstream unavailable")
    )

    await expect(
      service.getAresEconomicSubjectByIco("17321743")
    ).rejects.toThrow("upstream unavailable")

    expect(cacheService.set).not.toHaveBeenCalled()
  })
})
