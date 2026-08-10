import { MedusaError } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  pickCanonicalRecord,
  normalizeUnitCode,
  normalizeDescription,
  productMeasurementLink,
  productVariantMeasurementLink,
  ensureProductExists,
  ensureProductVariantBelongsToProduct,
  retrieveActiveUnitOrThrow,
  ensureUnitCodeAvailable,
  getCurrentProductMeasurement,
  listProductMeasurementsForProduct,
  getCanonicalProductMeasurement,
  getCanonicalProductVariantMeasurement,
} from "../../../../../src/workflows/measurement-unit/steps/helpers"

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

interface MeasurementStepHelpers {
  pickCanonicalRecord: typeof pickCanonicalRecord
  normalizeUnitCode: typeof normalizeUnitCode
  normalizeDescription: typeof normalizeDescription
  productMeasurementLink: typeof productMeasurementLink
  productVariantMeasurementLink: typeof productVariantMeasurementLink
  ensureProductExists: typeof ensureProductExists
  ensureProductVariantBelongsToProduct: typeof ensureProductVariantBelongsToProduct
  retrieveActiveUnitOrThrow: typeof retrieveActiveUnitOrThrow
  ensureUnitCodeAvailable: typeof ensureUnitCodeAvailable
  getCurrentProductMeasurement: typeof getCurrentProductMeasurement
  listProductMeasurementsForProduct: typeof listProductMeasurementsForProduct
  getCanonicalProductMeasurement: typeof getCanonicalProductMeasurement
  getCanonicalProductVariantMeasurement: typeof getCanonicalProductVariantMeasurement
}

const { helpers, service } = vi.hoisted(() => ({
  helpers: {
    ensureUnitCodeAvailable: vi.fn<typeof ensureUnitCodeAvailable>(),
  },
  service: {
    createMeasurementUnits: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    listMeasurementUnits: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    restoreMeasurementUnits: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    softDeleteMeasurementUnits:
      vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    updateMeasurementUnits: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  },
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
        invoke: MockStep,
        compensate: MockStep["compensate"],
      ) => MockStep
    >((_name, invoke, compensate) => Object.assign(invoke, { compensate })),
  }),
)

vi.mock(
  import("../../../../../src/utils/measurement-units"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      getMeasurementUnitService: vi.fn<() => typeof service>(() => service),
    }),
)

vi.mock(
  import("../../../../../src/workflows/measurement-unit/steps/helpers"),
  async () => {
    const actual = await vi.importActual<MeasurementStepHelpers>(
      "../../../../../src/workflows/measurement-unit/steps/helpers",
    )

    return {
      ...actual,
      ensureUnitCodeAvailable: helpers.ensureUnitCodeAvailable,
    }
  },
)

interface MockStep {
  (
    input: unknown,
    stepContext: { container: Record<string, never> },
  ): Promise<{
    compensateInput: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    stepContext: { container: Record<string, never> },
  ) => Promise<void>
}

const asMockStep = (candidate: unknown): MockStep => {
  if (typeof candidate !== "function") {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function",
    )
  }

  const compensation: unknown = Reflect.get(candidate, "compensate")
  if (typeof compensation !== "function") {
    throw new TypeError("Expected the mocked workflow step to compensate")
  }

  const invoke = async (
    input: unknown,
    stepContext: { container: Record<string, never> },
  ) => {
    const result: unknown = await Reflect.apply(candidate, undefined, [
      input,
      stepContext,
    ])
    if (typeof result !== "object" || result === null) {
      throw new TypeError(
        "Expected the mocked workflow step to return a response",
      )
    }

    const compensateInput: unknown = Reflect.get(result, "compensateInput")
    const payload: unknown = Reflect.get(result, "payload")
    return { compensateInput, payload }
  }

  return Object.assign(invoke, {
    compensate: async (
      input: unknown,
      stepContext: { container: Record<string, never> },
    ) => {
      await Reflect.apply(compensation, undefined, [input, stepContext])
    },
  })
}

const context = { container: {} }

describe("measurement unit lifecycle steps", () => {
  beforeEach(() => {
    helpers.ensureUnitCodeAvailable.mockReset()
    service.createMeasurementUnits.mockReset()
    service.listMeasurementUnits.mockReset()
    service.restoreMeasurementUnits.mockReset()
    service.softDeleteMeasurementUnits.mockReset()
    service.updateMeasurementUnits.mockReset()
  })

  it("validates all create codes in one module query", async () => {
    service.listMeasurementUnits.mockResolvedValue([])
    service.createMeasurementUnits.mockResolvedValue([
      { code: "kg", id: "unit_kg" },
      { code: "piece", id: "unit_piece" },
    ])
    const { createMeasurementUnitsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/create-measurement-units")
    const step = asMockStep(createMeasurementUnitsStep)

    await expect(
      step(
        {
          units: [
            {
              base_quantity: 1,
              code: "   ",
              name: "Kilogram",
              symbol: "kg",
            },
          ],
        },
        context,
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect([
      service.listMeasurementUnits.mock.calls,
      service.createMeasurementUnits.mock.calls,
    ]).toStrictEqual([[], []])

    const result = await step(
      {
        units: [
          {
            base_quantity: 1,
            code: " KG ",
            name: " Kilogram ",
            symbol: " kg ",
          },
          {
            base_quantity: 1,
            code: "Piece",
            description: " Each ",
            name: " Piece ",
            symbol: " pc ",
          },
        ],
      },
      context,
    )

    expect(service.listMeasurementUnits).toHaveBeenCalledExactlyOnceWith(
      { code: { $in: ["kg", "piece"] } },
      {
        select: ["code"],
        withDeleted: true,
      },
    )
    expect(service.createMeasurementUnits).toHaveBeenCalledWith([
      {
        base_quantity: 1,
        code: "kg",
        description: null,
        name: "Kilogram",
        symbol: "kg",
      },
      {
        base_quantity: 1,
        code: "piece",
        description: "Each",
        name: "Piece",
        symbol: "pc",
      },
    ])
    expect(result.compensateInput).toStrictEqual(["unit_kg", "unit_piece"])
  })

  it("soft-deletes an active unit and snapshots only the changed ID", async () => {
    service.listMeasurementUnits.mockResolvedValue([
      {
        code: "kg",
        deleted_at: null,
        id: "unit_1",
      },
    ])
    const { deleteMeasurementUnitsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/delete-measurement-units")
    const result = await asMockStep(deleteMeasurementUnitsStep)(
      { ids: ["unit_1"] },
      context,
    )

    expect(service.softDeleteMeasurementUnits).toHaveBeenCalledWith(["unit_1"])
    expect(result.compensateInput).toStrictEqual(["unit_1"])
  })

  it("does not restore a unit that was already deleted before delete rollback", async () => {
    service.listMeasurementUnits.mockResolvedValue([
      {
        code: "kg",
        deleted_at: new Date("2026-01-01"),
        id: "unit_1",
      },
    ])
    const { deleteMeasurementUnitsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/delete-measurement-units")
    const step = asMockStep(deleteMeasurementUnitsStep)
    const result = await step({ ids: ["unit_1"] }, context)

    await step.compensate(result.compensateInput, context)

    expect(result.compensateInput).toStrictEqual([])
    expect(service.softDeleteMeasurementUnits).not.toHaveBeenCalled()
    expect(service.restoreMeasurementUnits).not.toHaveBeenCalled()
  })

  it("does not soft-delete a unit that was active before a restore no-op", async () => {
    service.listMeasurementUnits.mockResolvedValue([
      {
        code: "kg",
        deleted_at: null,
        id: "unit_1",
      },
    ])
    const { restoreMeasurementUnitsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/restore-measurement-units")
    const step = asMockStep(restoreMeasurementUnitsStep)
    const result = await step({ ids: ["unit_1"] }, context)

    await step.compensate(result.compensateInput, context)

    expect(result.compensateInput).toStrictEqual([])
    expect(service.restoreMeasurementUnits).not.toHaveBeenCalled()
    expect(service.softDeleteMeasurementUnits).not.toHaveBeenCalled()
  })

  it("reports an active code conflict before restoring", async () => {
    service.listMeasurementUnits
      .mockResolvedValueOnce([
        {
          code: "kg",
          deleted_at: new Date("2026-01-01"),
          id: "unit_deleted",
        },
      ])
      .mockResolvedValueOnce([
        {
          code: "kg",
          deleted_at: null,
          id: "unit_active",
        },
      ])
    const { restoreMeasurementUnitsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/restore-measurement-units")

    await expect(
      asMockStep(restoreMeasurementUnitsStep)(
        { ids: ["unit_deleted"] },
        context,
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.DUPLICATE_ERROR,
    })
    expect(service.restoreMeasurementUnits).not.toHaveBeenCalled()
  })

  it("requires a deleted unit to be restored before update", async () => {
    service.listMeasurementUnits.mockResolvedValue([
      {
        base_quantity: 1,
        code: "kg",
        deleted_at: new Date("2026-01-01"),
        id: "unit_1",
        name: "Kilogram",
        symbol: "kg",
      },
    ])
    const { updateMeasurementUnitStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/update-measurement-unit")

    await expect(
      asMockStep(updateMeasurementUnitStep)(
        {
          id: "unit_1",
          update: { name: "Updated" },
        },
        context,
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
    expect(service.updateMeasurementUnits).not.toHaveBeenCalled()
  })

  it("normalizes a blank description to null on update", async () => {
    service.listMeasurementUnits.mockResolvedValue([
      {
        base_quantity: 1,
        code: "kg",
        deleted_at: null,
        description: "Old description",
        id: "unit_1",
        name: "Kilogram",
        symbol: "kg",
      },
    ])
    service.updateMeasurementUnits.mockResolvedValue({
      id: "unit_1",
    })
    const { updateMeasurementUnitStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/update-measurement-unit")

    await asMockStep(updateMeasurementUnitStep)(
      {
        id: "unit_1",
        update: { description: "   " },
      },
      context,
    )

    expect(service.updateMeasurementUnits).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        id: "unit_1",
      }),
    )
  })
})
