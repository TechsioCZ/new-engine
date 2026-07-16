import { beforeEach, describe, expect, it, vi } from "vitest"
import { STOREFRONT_TEXT_MODULE } from "../../../src/modules/storefront-text"

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
  input: undefined,
  context: { container: ReturnType<typeof createContainer> }
) => Promise<{ compensateInput?: unknown; payload: unknown }>

const createContainer = (service: Record<string, ReturnType<typeof vi.fn>>) => ({
  resolve: vi.fn((key: string) => {
    if (key === STOREFRONT_TEXT_MODULE) {
      return service
    }

    throw new Error(`Unexpected dependency: ${key}`)
  }),
})

const createService = () => ({
  retrieveStorefrontText: vi.fn().mockResolvedValue({
    default_value: "{count, plural, =0 {Filtr} other {Filtr (#)}}",
    id: "sftxt_01",
    key: "catalog.filters.toggle",
    locale: "cs-CZ",
    override_value: null,
    status: "active",
  }),
  updateStorefrontTexts: vi.fn().mockResolvedValue({
    id: "sftxt_01",
  }),
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
      (syncStorefrontTextsStep as MockSyncStep)(undefined, {
        container: createContainer(service),
      })
    ).rejects.toThrow("must preserve the default ICU arguments")
    expect(service.createStorefrontTexts).not.toHaveBeenCalled()
    expect(service.updateStorefrontTexts).not.toHaveBeenCalled()
  })

  it("rolls back successful writes when a sibling write fails", async () => {
    const { syncStorefrontTextsStep } = await import(
      "../../../src/workflows/storefront-text/steps/sync-storefront-texts"
    )
    let createCall = 0
    const service = {
      createStorefrontTexts: vi.fn().mockImplementation(async () => {
        createCall += 1

        if (createCall === 2) {
          throw new Error("Database write failed")
        }

        return { id: `sftxt_new_${createCall}` }
      }),
      deleteStorefrontTexts: vi.fn().mockResolvedValue(undefined),
      listStorefrontTexts: vi.fn().mockResolvedValue([]),
      updateStorefrontTexts: vi.fn(),
    }

    await expect(
      (syncStorefrontTextsStep as MockSyncStep)(undefined, {
        container: createContainer(service),
      })
    ).rejects.toThrow("Database write failed")
    expect(service.deleteStorefrontTexts).toHaveBeenCalledTimes(1)
    expect(service.deleteStorefrontTexts).toHaveBeenCalledWith(
      expect.arrayContaining(["sftxt_new_1"])
    )
  })
})
