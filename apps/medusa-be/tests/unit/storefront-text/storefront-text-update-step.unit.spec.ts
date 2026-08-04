import type { Context } from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  nestStorefrontTextMessages,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
} from "../../../src/modules/storefront-text/catalog"
import {
  getStorefrontTextDefaultMessages,
  getStorefrontTextSeedRows,
  type StorefrontTextSeedRow,
} from "../../../src/modules/storefront-text/registry"
import { importStorefrontTextCatalog } from "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
import { synchronizeStorefrontTexts } from "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
import { updateStorefrontTextRecord } from "../../../src/workflows/storefront-text/steps/update-storefront-text"

const sharedContext: Context = { transactionManager: { id: "tx" } }

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
    const service = createService()

    await expect(
      updateStorefrontTextRecord(service, {
        id: "sftxt_01",
        update: {
          override_value: "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
          status: "draft",
        },
      })
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an unsupported workflow status before reading the record", async () => {
    const service = createService()

    await expect(
      updateStorefrontTextRecord(service, {
        id: "sftxt_01",
        update: { status: "archived" as never },
      })
    ).rejects.toThrow('Unsupported storefront text status "archived"')
    expect(service.retrieveStorefrontText).not.toHaveBeenCalled()
  })

  it("updates a compatible custom value and keeps compensation data", async () => {
    const service = createService()
    const overrideValue = "{count, plural, =0 {Szűr} other {Szűr (#)}}"

    const result = await updateStorefrontTextRecord(service, {
      id: "sftxt_01",
      update: { override_value: overrideValue },
    })

    expect(service.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      override_value: overrideValue,
    })
    expect(result.previousRecord).toMatchObject({
      id: "sftxt_01",
      override_value: null,
    })
  })

  it("allows resetting an override and status-only updates", async () => {
    const resetService = createService()

    await updateStorefrontTextRecord(resetService, {
      id: "sftxt_01",
      update: { override_value: null },
    })
    expect(resetService.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      override_value: null,
    })

    const statusService = createService()
    await updateStorefrontTextRecord(statusService, {
      id: "sftxt_01",
      update: { status: "draft" },
    })
    expect(statusService.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      status: "draft",
    })
  })

  it("validates a stored override before status-only activation", async () => {
    const service = createService()
    service.retrieveStorefrontText.mockResolvedValue({
      default_value: "{count, plural, =0 {Filtr} other {Filtr (#)}}",
      id: "sftxt_01",
      key: "catalog.filters.toggle",
      locale: "cs-CZ",
      market: "cz",
      override_value: "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
      status: "draft",
    })

    await expect(
      updateStorefrontTextRecord(service, {
        id: "sftxt_01",
        update: { status: "active" },
      })
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("validates against the current catalog instead of a stale database default", async () => {
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
      updateStorefrontTextRecord(service, {
        id: "sftxt_01",
        update: { override_value: "Posledních {count} ks" },
      })
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })
})

describe("syncStorefrontTextsStep", () => {
  it("rejects an existing override that no longer matches its default", async () => {
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
      synchronizeStorefrontTexts(service, {}, sharedContext)
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.createStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("creates missing rows with one bulk service call", async () => {
    const service = {
      createStorefrontTexts: vi
        .fn()
        .mockImplementation(async (rows: StorefrontTextSeedRow[]) =>
          rows.map((row, index) => ({ ...row, id: `sftxt_new_${index}` }))
        ),
      deleteStorefrontTexts: vi.fn().mockResolvedValue(undefined),
      listStorefrontTexts: vi.fn().mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await synchronizeStorefrontTexts(service, {}, sharedContext)

    expect(service.createStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.createStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(
      getStorefrontTextSeedRows().length
    )
  })

  it("limits synchronization to the requested market", async () => {
    const service = {
      createStorefrontTexts: vi
        .fn()
        .mockImplementation(async (rows: StorefrontTextSeedRow[]) =>
          rows.map((row, index) => ({ ...row, id: `sftxt_${index}` }))
        ),
      deleteStorefrontTexts: vi.fn(),
      listStorefrontTexts: vi.fn().mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await synchronizeStorefrontTexts(service, { market: "cz" }, sharedContext)

    expect(service.listStorefrontTexts).toHaveBeenCalledWith(
      { market: "cz" },
      {},
      expect.any(Object)
    )
    expect(service.createStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(
      service.createStorefrontTexts.mock.calls[0]?.[0].every(
        (row: StorefrontTextSeedRow) => row.market === "cz"
      )
    ).toBe(true)
  })
})

describe("importStorefrontTextCatalogStep", () => {
  const createImportService = () => {
    const records: Array<
      Omit<StorefrontTextSeedRow, "override_value"> & {
        id: string
        override_value: null | string
      }
    > = getStorefrontTextSeedRows()
      .filter((row) => row.market === "cz")
      .map((row, index) => ({
        ...row,
        id: `sftxt_${index}`,
      }))

    return {
      createStorefrontTexts: vi.fn().mockResolvedValue([]),
      deleteStorefrontTexts: vi.fn().mockResolvedValue(undefined),
      listStorefrontTexts: vi.fn().mockResolvedValue(records),
      records,
      updateStorefrontTexts: vi.fn().mockResolvedValue({}),
    }
  }

  it("writes only values that differ from the default catalog", async () => {
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.add_to_cart": "Přidat do košíku",
    } as Record<string, string>
    const changedRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart"
    )

    const result = await importStorefrontTextCatalog(
      service,
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext
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
    expect(result.result).toEqual({
      unchanged_count: Object.keys(messages).length - 1,
      updated_count: 1,
    })
  })

  it("validates the complete catalog before writing any values", async () => {
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.insufficient_quantity_available": "Nedostatečné množství produktu.",
    } as Record<string, string>

    await expect(
      importStorefrontTextCatalog(
        service,
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        sharedContext
      )
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an incomplete workflow catalog before synchronization", async () => {
    const service = createImportService()

    await expect(
      importStorefrontTextCatalog(
        service,
        {
          catalog: {
            locale: "cs-CZ",
            market: "cz",
            messages: { cart: { add_to_cart: "Do košíku" } },
            schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
          },
          market: "cz",
        },
        sharedContext
      )
    ).rejects.toThrow("Missing keys")
    expect(service.listStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("keeps a hidden draft when the imported value matches the effective value", async () => {
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

    const result = await importStorefrontTextCatalog(
      service,
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext
    )

    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
    expect(result.result).toEqual({
      unchanged_count: Object.keys(messages).length,
      updated_count: 0,
    })
  })

  it("publishes an imported value that currently exists only as a draft", async () => {
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

    const result = await importStorefrontTextCatalog(
      service,
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext
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
    expect(result.result).toEqual({
      unchanged_count: Object.keys(messages).length - 1,
      updated_count: 1,
    })
  })

  it("uses one bulk update so a failed import cannot partially commit", async () => {
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
      importStorefrontTextCatalog(
        service,
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        sharedContext
      )
    ).rejects.toThrow("Database write failed")
    expect(service.updateStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.updateStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(2)
  })
})
