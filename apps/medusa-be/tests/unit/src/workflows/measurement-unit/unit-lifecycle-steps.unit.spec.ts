import { MedusaError } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { helpers, service } = vi.hoisted(() => ({
  helpers: {
    ensureUnitCodeAvailable: vi.fn(),
  },
  service: {
    createMeasurementUnits: vi.fn(),
    listMeasurementUnits: vi.fn(),
    restoreMeasurementUnits: vi.fn(),
    softDeleteMeasurementUnits: vi.fn(),
    updateMeasurementUnits: vi.fn(),
  },
}))

vi.mock(import("@medusajs/framework/workflows-sdk"), () => ({
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
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
}))

vi.mock(import("../../../../../src/utils/measurement-units"), () => ({
  getMeasurementUnitService: vi.fn(() => service),
}))

vi.mock(
  import("../../../../../src/workflows/measurement-unit/steps/helpers"),
  async () => {
    const actual = await vi.importActual<
      typeof import("../../../../../src/workflows/measurement-unit/steps/helpers")
    >("../../../../../src/workflows/measurement-unit/steps/helpers")

    return {
      ...actual,
      ensureUnitCodeAvailable: helpers.ensureUnitCodeAvailable,
    }
  }
)

interface MockStep {
  (
    input: unknown,
    stepContext: { container: Record<string, never> }
  ): Promise<{
    compensateInput: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    stepContext: { container: Record<string, never> }
  ) => Promise<void>
}

const asMockStep = (candidate: unknown): MockStep => {
  if (typeof candidate !== "function") {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function"
    )
  }

  return candidate as MockStep
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
    const result = await asMockStep(createMeasurementUnitsStep)(
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
      context
    )

    expect(service.listMeasurementUnits).toHaveBeenCalledOnce()
    expect(service.listMeasurementUnits).toHaveBeenCalledWith(
      { code: { $in: ["kg", "piece"] } },
      {
        select: ["code"],
        withDeleted: true,
      }
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
      context
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
        context
      )
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
        context
      )
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
      context
    )

    expect(service.updateMeasurementUnits).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        id: "unit_1",
      })
    )
  })
})
