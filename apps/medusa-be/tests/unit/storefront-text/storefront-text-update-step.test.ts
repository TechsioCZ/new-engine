import type { Context } from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  nestStorefrontTextMessages,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
} from "../../../src/modules/storefront-text/catalog"
import {
  getStorefrontTextDefaultMessages,
  getStorefrontTextSeedRows,
} from "../../../src/modules/storefront-text/registry"
import type { StorefrontTextSeedRow } from "../../../src/modules/storefront-text/registry"
import { importStorefrontTextCatalog } from "../../../src/workflows/storefront-text/steps/import-storefront-text-catalog"
import { synchronizeStorefrontTexts } from "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
import type { SynchronizeStorefrontTextsService } from "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
import { updateStorefrontTextRecord } from "../../../src/workflows/storefront-text/steps/update-storefront-text"
import type { UpdateStorefrontTextService } from "../../../src/workflows/storefront-text/steps/update-storefront-text"
import type { UpdateStorefrontTextWorkflowInput } from "../../../src/workflows/storefront-text/types"

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework service type. Building the mock separately (instead of
 * against the target type directly) avoids requiring every column of the
 * generated `StorefrontTextRecord` while still validating the shape the
 * steps under test actually read at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const asUpdateService = (candidate: unknown): UpdateStorefrontTextService => {
  assertMockShape<UpdateStorefrontTextService>(candidate, [
    "retrieveStorefrontText",
    "updateStorefrontTexts",
  ])
  return candidate
}

const asSyncService = (
  candidate: unknown,
): SynchronizeStorefrontTextsService => {
  assertMockShape<SynchronizeStorefrontTextsService>(candidate, [
    "createStorefrontTexts",
    "deleteStorefrontTexts",
    "listStorefrontTexts",
    "updateStorefrontTexts",
  ])
  return candidate
}

const sharedContext: Context = { transactionManager: { id: "tx" } }

interface MockStorefrontTextRecord {
  default_value: string
  id: string
  key: string
  locale: string
  market: string
  override_value: null | string
  status: string
}

type RetrieveStorefrontTextMock = (
  id: string,
) => Promise<MockStorefrontTextRecord>

type UpdateStorefrontTextRecordMock = (
  data: unknown,
  sharedContextArg?: unknown,
) => Promise<{ id: string }>

type DeleteStorefrontTextsMock = (
  ids: unknown,
  sharedContextArg?: unknown,
) => Promise<void>

type ListStorefrontTextsMock<Row> = (
  filters: unknown,
  config: unknown,
  sharedContextArg: unknown,
) => Promise<Row[]>

interface SyncListRecord {
  country: string
  default_value: string
  description: string
  domain: string
  id: string
  key: string
  locale: string
  market: string
  namespace: string
  override_value: null | string
}

type SyncCreateStorefrontTextsNoopMock = (
  rows: unknown,
  sharedContextArg?: unknown,
) => Promise<{ id: string }>

type SyncCreateRowsMock = (
  rows: StorefrontTextSeedRow[],
  sharedContextArg?: unknown,
) => Promise<(StorefrontTextSeedRow & { id: string })[]>

type SyncUpdateStorefrontTextsMock = (
  data: unknown,
  sharedContextArg?: unknown,
) => Promise<void>

type ImportCreateStorefrontTextsMock = (
  rows: unknown,
  sharedContextArg?: unknown,
) => Promise<unknown[]>

type ImportUpdateStorefrontTextsMock = (
  data: unknown,
  sharedContextArg?: unknown,
) => Promise<unknown>

type StorefrontTextImportRecord = Omit<
  StorefrontTextSeedRow,
  "override_value"
> & {
  id: string
  override_value: null | string
}

const createService = () => ({
  retrieveStorefrontText: vi
    .fn<RetrieveStorefrontTextMock>()
    .mockResolvedValue({
      default_value: "{count, plural, =0 {Filtr} other {Filtr (#)}}",
      id: "sftxt_01",
      key: "catalog.filters.toggle",
      locale: "cs-CZ",
      market: "cz",
      override_value: null,
      status: "active",
    }),
  updateStorefrontTexts: vi
    .fn<UpdateStorefrontTextRecordMock>()
    .mockResolvedValue({
      id: "sftxt_01",
    }),
})

const createCatalogEnvelope = (
  messages: Record<string, string>,
  market = "cz",
  locale = "cs-CZ",
) => ({
  locale,
  market,
  messages: nestStorefrontTextMessages(messages),
  schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
})

const createImportService = () => {
  const records: StorefrontTextImportRecord[] = getStorefrontTextSeedRows()
    .filter((row) => row.market === "cz")
    .map((row, index) => ({
      ...row,
      id: `sftxt_${index}`,
    }))

  return {
    createStorefrontTexts: vi
      .fn<ImportCreateStorefrontTextsMock>()
      .mockResolvedValue([]),
    deleteStorefrontTexts: vi
      .fn<DeleteStorefrontTextsMock>()
      .mockResolvedValue(),
    listStorefrontTexts: vi
      .fn<ListStorefrontTextsMock<StorefrontTextImportRecord>>()
      .mockResolvedValue(records),
    records,
    updateStorefrontTexts: vi
      .fn<ImportUpdateStorefrontTextsMock>()
      .mockResolvedValue({}),
  }
}

describe("updateStorefrontTextStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("validates a draft custom value before updating the record", async () => {
    const service = createService()

    await expect(
      updateStorefrontTextRecord(asUpdateService(service), {
        id: "sftxt_01",
        update: {
          override_value: "{quantity, plural, =0 {Filtr} other {Filtr (#)}}",
          status: "draft",
        },
      }),
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an unsupported workflow status before reading the record", async () => {
    const service = createService()
    const invalidUpdate: unknown = { status: "archived" }

    assertMockShape<UpdateStorefrontTextWorkflowInput["update"]>(
      invalidUpdate,
      ["status"],
    )

    await expect(
      updateStorefrontTextRecord(asUpdateService(service), {
        id: "sftxt_01",
        update: invalidUpdate,
      }),
    ).rejects.toThrow('Unsupported storefront text status "archived"')
    expect(service.retrieveStorefrontText).not.toHaveBeenCalled()
  })

  it("updates a compatible custom value and keeps compensation data", async () => {
    const service = createService()
    const overrideValue = "{count, plural, =0 {Szűr} other {Szűr (#)}}"

    const result = await updateStorefrontTextRecord(asUpdateService(service), {
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

    await updateStorefrontTextRecord(asUpdateService(resetService), {
      id: "sftxt_01",
      update: { override_value: null },
    })
    expect(resetService.updateStorefrontTexts).toHaveBeenCalledWith({
      id: "sftxt_01",
      override_value: null,
    })

    const statusService = createService()
    await updateStorefrontTextRecord(asUpdateService(statusService), {
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
      updateStorefrontTextRecord(asUpdateService(service), {
        id: "sftxt_01",
        update: { status: "active" },
      }),
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
      updateStorefrontTextRecord(asUpdateService(service), {
        id: "sftxt_01",
        update: { override_value: "Posledních {count} ks" },
      }),
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })
})

describe("syncStorefrontTextsStep", () => {
  it("rejects an existing override that no longer matches its default", async () => {
    const service = {
      createStorefrontTexts: vi
        .fn<SyncCreateStorefrontTextsNoopMock>()
        .mockResolvedValue({ id: "sftxt_new" }),
      deleteStorefrontTexts: vi.fn<DeleteStorefrontTextsMock>(),
      listStorefrontTexts: vi
        .fn<ListStorefrontTextsMock<SyncListRecord>>()
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
      updateStorefrontTexts: vi.fn<SyncUpdateStorefrontTextsMock>(),
    }

    await expect(
      synchronizeStorefrontTexts(asSyncService(service), {}, sharedContext),
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.createStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("creates missing rows with one bulk service call", async () => {
    const service = {
      createStorefrontTexts: vi
        .fn<SyncCreateRowsMock>()
        .mockImplementation(async (rows: StorefrontTextSeedRow[]) => {
          await Promise.resolve()
          return rows.map((row, index) => ({
            ...row,
            id: `sftxt_new_${index}`,
          }))
        }),
      deleteStorefrontTexts: vi
        .fn<DeleteStorefrontTextsMock>()
        .mockResolvedValue(),
      listStorefrontTexts: vi
        .fn<ListStorefrontTextsMock<SyncListRecord>>()
        .mockResolvedValue([]),
      updateStorefrontTexts: vi.fn<SyncUpdateStorefrontTextsMock>(),
    }

    await synchronizeStorefrontTexts(asSyncService(service), {}, sharedContext)

    expect(service.createStorefrontTexts).toHaveBeenCalledOnce()
    expect(service.createStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(
      getStorefrontTextSeedRows().length,
    )
  })

  it("limits synchronization to the requested market", async () => {
    const service = {
      createStorefrontTexts: vi
        .fn<SyncCreateRowsMock>()
        .mockImplementation(async (rows: StorefrontTextSeedRow[]) => {
          await Promise.resolve()
          return rows.map((row, index) => ({ ...row, id: `sftxt_${index}` }))
        }),
      deleteStorefrontTexts: vi.fn<DeleteStorefrontTextsMock>(),
      listStorefrontTexts: vi
        .fn<ListStorefrontTextsMock<SyncListRecord>>()
        .mockResolvedValue([]),
      updateStorefrontTexts: vi.fn<SyncUpdateStorefrontTextsMock>(),
    }

    await synchronizeStorefrontTexts(
      asSyncService(service),
      { market: "cz" },
      sharedContext,
    )

    expect(service.listStorefrontTexts).toHaveBeenCalledWith(
      { market: "cz" },
      {},
      expect.any(Object),
    )
    expect(service.createStorefrontTexts).toHaveBeenCalledOnce()
    expect(
      service.createStorefrontTexts.mock.calls[0]?.[0].every(
        (row: StorefrontTextSeedRow) => row.market === "cz",
      ),
    ).toBeTruthy()
  })
})

describe("importStorefrontTextCatalogStep", () => {
  it("writes only values that differ from the default catalog", async () => {
    const service = createImportService()
    const messages = {
      ...getStorefrontTextDefaultMessages({ market: "cz" }),
      "cart.add_to_cart": "Přidat do košíku",
    } as Record<string, string>
    const changedRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart",
    )

    const result = await importStorefrontTextCatalog(
      asSyncService(service),
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext,
    )

    expect(service.updateStorefrontTexts).toHaveBeenCalledExactlyOnceWith(
      [
        {
          id: changedRecord?.id,
          override_value: "Přidat do košíku",
          status: "active",
        },
      ],
      expect.any(Object),
    )
    expect(result.result).toStrictEqual({
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
        asSyncService(service),
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        sharedContext,
      ),
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rejects an incomplete workflow catalog before synchronization", async () => {
    const service = createImportService()

    await expect(
      importStorefrontTextCatalog(
        asSyncService(service),
        {
          catalog: {
            locale: "cs-CZ",
            market: "cz",
            messages: { cart: { add_to_cart: "Do košíku" } },
            schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
          },
          market: "cz",
        },
        sharedContext,
      ),
    ).rejects.toThrow("Missing keys")
    expect(service.listStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("keeps a hidden draft when the imported value matches the effective value", async () => {
    const service = createImportService()
    const draftRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart",
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
      asSyncService(service),
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext,
    )

    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
    expect(result.result).toStrictEqual({
      unchanged_count: Object.keys(messages).length,
      updated_count: 0,
    })
  })

  it("publishes an imported value that currently exists only as a draft", async () => {
    const service = createImportService()
    const draftRecord = service.records.find(
      (record) => record.key === "cart.add_to_cart",
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
      asSyncService(service),
      {
        catalog: createCatalogEnvelope(messages),
        market: "cz",
      },
      sharedContext,
    )

    expect(service.updateStorefrontTexts).toHaveBeenCalledWith(
      [
        {
          id: draftRecord.id,
          override_value: "Přidat do košíku",
          status: "active",
        },
      ],
      expect.any(Object),
    )
    expect(result.result).toStrictEqual({
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
      new Error("Database write failed"),
    )

    await expect(
      importStorefrontTextCatalog(
        asSyncService(service),
        {
          catalog: createCatalogEnvelope(messages),
          market: "cz",
        },
        sharedContext,
      ),
    ).rejects.toThrow("Database write failed")
    expect(service.updateStorefrontTexts).toHaveBeenCalledOnce()
    expect(service.updateStorefrontTexts.mock.calls[0]?.[0]).toHaveLength(2)
  })
})
