import { beforeEach, describe, expect, it, vi } from "vitest"
import { STOREFRONT_TEXT_MODULE } from "../../../src/modules/storefront-text"
import {
  getStorefrontTextDefaultMessages,
  getStorefrontTextSeedRows,
} from "../../../src/modules/storefront-text/registry"
import {
  nestStorefrontTextMessages,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
} from "../../../src/modules/storefront-text/catalog"

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
  StepResponse: class StepResponse<
    TPayload = unknown,
    TCompensationInput = unknown,
  > {
    compensateInput: TCompensationInput | undefined
    payload: TPayload

    constructor(payload: TPayload, compensateInput?: TCompensationInput) {
      this.payload = payload
      this.compensateInput = compensateInput
    }
  },
}))

type MockStep = (
  input: {
    id: string
    update: { override_value?: null | string; status?: "active" | "draft" }
  },
  context: { container: ReturnType<typeof createContainer> }
) => Promise<{ compensateInput?: unknown; payload: unknown }>

type MockSyncStep = (
  input: { market?: "cz" },
  context: { container: ReturnType<typeof createContainer> }
) => Promise<{ compensateInput?: unknown; payload: unknown }>

type MockCatalogImportStep = (
  input: {
    catalog: unknown
    market: "cz"
  },
  context: { container: ReturnType<typeof createContainer> }
) => Promise<{ compensateInput?: unknown; payload: unknown }>

const createContainer = (service: Record<string, unknown>) => {
  Object.assign(service, {
    runInTransaction: async <Result>(
      task: (sharedContext: { transactionManager: object }) => Promise<Result>
    ) => task({ transactionManager: { id: "transaction-manager" } }),
  })

  return {
    resolve: vi.fn((key: string) => {
      if (key === STOREFRONT_TEXT_MODULE) {
        return service
      }

      throw new Error(`Unexpected dependency: ${key}`)
    }),
  }
}

const createService = () => ({
  retrieveStorefrontText: vi.fn().mockResolvedValue({
    default_value: "{count, plural, =0 {Filtr} other {Filtr (#)}}",
    id: "sftxt_01",
    key: "catalog.filters.toggle",
    locale: "cs-CZ",
    market: "cz",
    override_value: null,
    status: "active",
  }),
  updateStorefrontTexts: vi.fn().mockResolvedValue({
    id: "sftxt_01",
  }),
})

const createCatalogEnvelope = (
  messages: Record<string, string>,
  market: "cz" = "cz",
  locale: "cs-CZ" = "cs-CZ"
) => ({
  locale,
  market,
  messages: nestStorefrontTextMessages(messages),
  schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
})

describe("updateStorefrontTextStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("validates a draft custom value before updating the record", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const service = createService()

    await expect(
      (updateStorefrontTextStep as MockStep)(
        {
          id: "sftxt_01",
          update: {
            override_value:
              "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
            status: "draft",
          },
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an unsupported workflow status before reading the record", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const service = createService()

    await expect(
      (updateStorefrontTextStep as MockStep)(
        {
          id: "sftxt_01",
          update: { status: "archived" as never },
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow('Unsupported storefront text status "archived"')
    expect(service.retrieveStorefrontText).not.toHaveBeenCalled()
  })

  it("updates a compatible custom value and keeps compensation data", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const service = createService()
    const overrideValue =
      "{count, plural, =0 {Szűr} other {Szűr (#)}}"

    const result = await (updateStorefrontTextStep as MockStep)(
      {
        id: "sftxt_01",
        update: { override_value: overrideValue },
      },
      { container: createContainer(service) }
    )

    expect(service.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      override_value: overrideValue,
    })
    expect(result.compensateInput).toMatchObject({
      id: "sftxt_01",
      override_value: null,
    })
  })

  it("allows resetting an override and status-only updates", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const resetService = createService()

    await (updateStorefrontTextStep as MockStep)(
      { id: "sftxt_01", update: { override_value: null } },
      { container: createContainer(resetService) }
    )
    expect(resetService.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      override_value: null,
    })

    const statusService = createService()
    await (updateStorefrontTextStep as MockStep)(
      { id: "sftxt_01", update: { status: "draft" } },
      { container: createContainer(statusService) }
    )
    expect(statusService.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      status: "draft",
    })
  })

  it("validates a stored override before status-only activation", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const service = createService()
    service.retrieveStorefrontText.mockResolvedValue({
      default_value: "{count, plural, =0 {Filtr} other {Filtr (#)}}",
      id: "sftxt_01",
      key: "catalog.filters.toggle",
      locale: "cs-CZ",
      market: "cz",
      override_value:
        "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
      status: "draft",
    })

    await expect(
      (updateStorefrontTextStep as MockStep)(
        { id: "sftxt_01", update: { status: "active" } },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("validates against the current catalog instead of a stale database default", async () => {
    const { updateStorefrontTextStep } = await import(
      "../../../src/workflows/storefront-text/steps/update-storefront-text"
    )
    const service = createService()
    service.retrieveStorefrontText.mockResolvedValue({
      default_value: "Zbývá už jen {count} ks",
      id: "sftxt_01",
      key: "cart.low_stock",
      locale: "cs-CZ",
      market: "cz",
      override_value: null,
      status: "active",
    })

    await expect(
      (updateStorefrontTextStep as MockStep)(
        {
          id: "sftxt_01",
          update: { override_value: "Posledních {count} ks" },
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })
})

describe("syncStorefrontTextsStep", () => {
  it("rejects an existing override that no longer matches its default", async () => {
    const { syncStorefrontTextsStep } = await import(
      "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
    )
    const service = {
      createStorefrontTexts: vi.fn().mockResolvedValue({ id: "sftxt_new" }),
      deleteStorefrontTexts: vi.fn(),
      listStorefrontTexts: vi
        .fn()
        .mockResolvedValueOnce([
          {
            country: "Slovensko",
            default_value: "Do košíka",
            description: "Label tlačidla.",
            domain: "herbatica.sk",
            id: "sftxt_01",
            key: "cart.add_to_cart",
            locale: "sk-SK",
            market: "sk",
            namespace: "cart",
            override_value: "Do košíka {count}",
          },
        ])
        .mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await expect(
      (syncStorefrontTextsStep as MockSyncStep)({}, {
        container: createContainer(service),
      })
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.createStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("creates missing rows with one bulk service call", async () => {
    const { syncStorefrontTextsStep } = await import(
      "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
    )
    const service = {
      createStorefrontTexts: vi.fn().mockImplementation(async (rows) =>
        rows.map((row, index) => ({ ...row, id: `sftxt_new_${index}` }))
      ),
      deleteStorefrontTexts: vi.fn().mockResolvedValue(undefined),
      listStorefrontTexts: vi.fn().mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await (syncStorefrontTextsStep as MockSyncStep)(
      {},
      {
        container: createContainer(service),
      }
    )

    expect(service.createStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.createStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(
      getStorefrontTextSeedRows().length
    )
  })

  it("limits synchronization to the requested market", async () => {
    const { syncStorefrontTextsStep } = await import(
      "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
    )
    const service = {
      createStorefrontTexts: vi.fn().mockImplementation(async (rows) =>
        rows.map((row, index) => ({ ...row, id: `sftxt_${index}` }))
      ),
      deleteStorefrontTexts: vi.fn(),
      listStorefrontTexts: vi.fn().mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await (syncStorefrontTextsStep as MockSyncStep)(
      { market: "cz" },
      { container: createContainer(service) }
    )

    expect(service.listStorefrontTexts).toHaveBeenCalledWith(
      { market: "cz" },
      {},
      expect.any(Object)
    )
    expect(service.createStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(
      service.createStorefrontTexts.mock.calls[0]?.[0].every(
        (row) => row.market === "cz"
      )
    ).toBe(true)
  })
})

describe("importStorefrontTextCatalogStep", () => {
  const createImportService = () => {
    const records = getStorefrontTextSeedRows()
      .filter((row) => row.market === "cz")
      .map((row, index) => ({
        ...row,
        id: `sftxt_${index}`,
      }))

    return {
      listStorefrontTexts: vi.fn().mockResolvedValue(records),
      records,
      updateStorefrontTexts: vi.fn().mockResolvedValue({}),
    }
  }

  it("writes only values that differ from the default catalog", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.add_to_cart": "Přidat do košíku",
    } as Record<string, string>
    const changedRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart"
    )

    const result = await (
      importStorefrontTextCatalogStep as MockCatalogImportStep
    )(
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      { container: createContainer(service) }
    )

    expect(service.updateStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.updateStorefrontTexts).toHaveBeenCalledWith(
      [
        {
          id: changedRecord?.id,
          override_value: "Přidat do košíku",
          status: "active",
        },
      ],
      expect.any(Object)
    )
    expect(result.payload).toEqual({
      unchanged_count: Object.keys(messages).length - 1,
      updated_count: 1,
    })
  })

  it("validates the complete catalog before writing any values", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.insufficient_quantity_available":
        "Nedostatečné množství produktu.",
    } as Record<string, string>

    await expect(
      (importStorefrontTextCatalogStep as MockCatalogImportStep)(
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an incomplete workflow catalog before synchronization", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()

    await expect(
      (importStorefrontTextCatalogStep as MockCatalogImportStep)(
        {
          catalog: {
            locale: "cs-CZ",
            market: "cz",
            messages: { cart: { add_to_cart: "Do košíku" } },
            schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
          },
          market: "cz",
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("Missing keys")
    expect(service.listStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("keeps a hidden draft when the imported value matches the effective value", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()
    const draftRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart"
    )

    if (!draftRecord) {
      throw new Error("Draft test record is missing")
    }

    draftRecord.override_value = "Rozepsaný koncept"
    draftRecord.status = "draft"
    const messages = getStorefrontTextDefaultMessages({
      market: "cz",
    }) as Record<string, string>

    const result = await (
      importStorefrontTextCatalogStep as MockCatalogImportStep
    )(
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      { container: createContainer(service) }
    )

    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
    expect(result.payload).toEqual({
      unchanged_count: Object.keys(messages).length,
      updated_count: 0,
    })
  })

  it("publishes an imported value that currently exists only as a draft", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()
    const draftRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart"
    )

    if (!draftRecord) {
      throw new Error("Draft test record is missing")
    }

    draftRecord.override_value = "Přidat do košíku"
    draftRecord.status = "draft"
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.add_to_cart": "Přidat do košíku",
    } as Record<string, string>

    const result = await (
      importStorefrontTextCatalogStep as MockCatalogImportStep
    )(
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      { container: createContainer(service) }
    )

    expect(service.updateStorefrontTexts).toHaveBeenCalledWith(
      [
        {
          id: draftRecord.id,
          override_value: "Přidat do košíku",
          status: "active",
        },
      ],
      expect.any(Object)
    )
    expect(result.payload).toEqual({
      unchanged_count: Object.keys(messages).length - 1,
      updated_count: 1,
    })
  })

  it("uses one bulk update so a failed import cannot partially commit", async () => {
    const { importStorefrontTextCatalogStep } = await import(
      "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
    )
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.add_to_cart": "Přidat do košíku",
      "cart.adding_to_cart": "Přidávám do košíku",
    } as Record<string, string>

    service.updateStorefrontTexts.mockRejectedValue(
      new Error("Database write failed")
    )

    await expect(
      (importStorefrontTextCatalogStep as MockCatalogImportStep)(
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        { container: createContainer(service) }
      )
    ).rejects.toThrow("Database write failed")
    expect(service.updateStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.updateStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(2)
  })
})
