import { describe, expect, it, vi } from "vitest"
import createDefaultConfigLoader from "../loaders/create-default-config"
import { GLSClientModuleService } from "../service"
import type { GLSCreatePacketResult } from "../types"

const packet: GLSCreatePacketResult = {
  id: 41,
  parcel_number: "410",
  barcode: "4101",
  barcodeText: "4101",
}
const input = {
  config_id: "config_testing",
  environment: "testing" as const,
  operation_key: "operation-one",
  client_reference: "NE-operation-one",
  fulfillment_id: "ful_1",
  active_fulfillment_ids: [],
  attributes: {
    number: "order-one",
    name: "A",
    surname: "B",
    email: "a@example.test",
    phone: "+421900000000",
    delivery_street: "Street",
    delivery_house_number: "1",
    delivery_city: "City",
    delivery_zip_code: "01001",
    delivery_country: "SK",
  },
}

describe("GLSClientModuleService parcel attempts", () => {
  it("persists a pending attempt before the non-retryable carrier write", async () => {
    const carrier = {
      findPacketByClientReference: vi.fn().mockResolvedValue(null),
      createPacket: vi.fn().mockResolvedValue(packet),
    }
    const service = createService([], carrier)

    await expect(
      service.instance.createOrRecoverPacket(input)
    ).resolves.toEqual({
      ...packet,
      attempt_id: "attempt_1",
      operation_key: input.operation_key,
    })
    expect(service.createAttempt).toHaveBeenCalledBefore(carrier.createPacket)
    expect(service.updateAttempt).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "attempt_1",
        status: "completed",
        parcel_id: "41",
      })
    )
    expect(service.locking.acquire).toHaveBeenCalledOnce()
    expect(service.locking.release).toHaveBeenCalledOnce()
  })

  it("reconciles an uncertain carrier response without creating another parcel", async () => {
    const createdAt = new Date("2026-08-04T10:00:00.000Z")
    const pendingAttempt = {
      id: "attempt_1",
      operation_key: input.operation_key,
      client_reference: input.client_reference,
      fulfillment_id: "ful_old",
      generation: 1,
      status: "pending",
      parcel_id: null,
      parcel_number: null,
      barcode: null,
      last_error: "timeout",
      created_at: createdAt,
      updated_at: new Date("2026-08-10T10:00:00.000Z"),
    }
    const carrier = {
      findPacketByClientReference: vi.fn().mockResolvedValue(packet),
      createPacket: vi.fn(),
    }
    const service = createService([pendingAttempt], carrier)

    await expect(
      service.instance.createOrRecoverPacket(input)
    ).resolves.toEqual({
      ...packet,
      attempt_id: "attempt_1",
      operation_key: input.operation_key,
    })
    expect(carrier.findPacketByClientReference).toHaveBeenCalledWith(
      input.client_reference,
      createdAt
    )
    expect(carrier.createPacket).not.toHaveBeenCalled()
    expect(service.updateAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", parcel_id: "41" })
    )
  })

  it("returns a completed attempt without another carrier request", async () => {
    const completedAttempt = {
      id: "attempt_1",
      operation_key: input.operation_key,
      client_reference: input.client_reference,
      fulfillment_id: "ful_old",
      generation: 1,
      status: "completed",
      parcel_id: "41",
      parcel_number: "410",
      barcode: "4101",
      last_error: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const carrier = {
      findPacketByClientReference: vi.fn(),
      createPacket: vi.fn(),
    }
    const service = createService([completedAttempt], carrier)

    await expect(
      service.instance.createOrRecoverPacket(input)
    ).resolves.toEqual({
      ...packet,
      id: "41",
      attempt_id: "attempt_1",
      operation_key: input.operation_key,
    })
    expect(carrier.findPacketByClientReference).not.toHaveBeenCalled()
    expect(carrier.createPacket).not.toHaveBeenCalled()
    expect(service.updateAttempt).toHaveBeenCalledWith({
      id: "attempt_1",
      fulfillment_id: input.fulfillment_id,
    })
  })

  it("creates a new generation when the matching parcel belongs to an active fulfillment", async () => {
    const completedAttempt = {
      id: "attempt_1",
      operation_key: input.operation_key,
      client_reference: input.client_reference,
      fulfillment_id: "ful_previous",
      generation: 1,
      status: "completed",
      parcel_id: "41",
      parcel_number: "410",
      barcode: "4101",
      last_error: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    const carrier = {
      findPacketByClientReference: vi.fn().mockResolvedValue(null),
      createPacket: vi.fn().mockResolvedValue(packet),
    }
    const service = createService([completedAttempt], carrier)

    await expect(
      service.instance.createOrRecoverPacket({
        ...input,
        active_fulfillment_ids: ["ful_previous"],
      })
    ).resolves.toEqual({
      ...packet,
      attempt_id: "attempt_2",
      operation_key: input.operation_key,
    })
    expect(service.createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference: "NE-operation-one-g2",
        generation: 2,
      })
    )
    expect(carrier.createPacket).toHaveBeenCalledWith(
      expect.objectContaining({ number: "NE-operation-one-g2" })
    )
  })
})

describe("GLS configuration profiles", () => {
  it("deactivates the current profile before activating another one", async () => {
    const profiles = [
      {
        id: "config_production",
        environment: "production",
        is_active: true,
        is_enabled: false,
      },
      {
        id: "config_testing",
        environment: "testing",
        is_active: false,
        is_enabled: false,
      },
    ]
    const updateGLSConfigs = vi
      .fn()
      .mockResolvedValueOnce([profiles[0]])
      .mockResolvedValueOnce({ ...profiles[1], is_active: true })
    const flush = vi.fn().mockResolvedValue(undefined)
    const instance = Object.assign(
      Object.create(GLSClientModuleService.prototype),
      {
        baseRepository_: {
          transaction: vi
            .fn()
            .mockImplementation(async (callback) => callback({ flush })),
        },
        lockingService_: {
          execute: vi
            .fn()
            .mockImplementation(async (_key, callback) => callback()),
        },
        listConfigProfiles: vi.fn().mockResolvedValue(profiles),
        updateGLSConfigs,
        invalidateAllCaches: vi.fn().mockResolvedValue(undefined),
      }
    ) as GLSClientModuleService

    await instance.activateConfig("testing", false)

    expect(updateGLSConfigs).toHaveBeenNthCalledWith(
      1,
      [{ id: "config_production", is_active: false }],
      expect.objectContaining({ transactionManager: expect.anything() })
    )
    expect(updateGLSConfigs).toHaveBeenNthCalledWith(
      2,
      { id: "config_testing", is_active: true },
      expect.objectContaining({ transactionManager: expect.anything() })
    )
    expect(flush).toHaveBeenCalledOnce()
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
      updateGLSConfigs.mock.invocationCallOrder[1]
    )
  })

  it("creates a missing testing profile inactive when production is already active", async () => {
    const listAndCount = vi.fn().mockImplementation(async (filter) => {
      if (filter.environment === "testing") {
        return [[], 0]
      }
      if (filter.environment === "production") {
        return [[{ id: "config_production", is_active: true }], 1]
      }

      return [[{ id: "config_production", is_active: true }], 1]
    })
    const create = vi.fn().mockResolvedValue({ id: "config_testing" })
    const service = { listAndCount, create, update: vi.fn() }
    const logger = { info: vi.fn() }
    const container = {
      resolve: vi
        .fn()
        .mockImplementation((key) => (key === "logger" ? logger : service)),
    }

    await createDefaultConfigLoader({ container } as never)

    expect(create).toHaveBeenCalledWith({
      environment: "testing",
      is_active: false,
      supported_countries: [],
    })
    expect(service.update).not.toHaveBeenCalled()
  })
})

function createService(
  attempts: Record<string, unknown>[],
  carrier: {
    findPacketByClientReference: ReturnType<typeof vi.fn>
    createPacket: ReturnType<typeof vi.fn>
  }
) {
  const locking = {
    acquire: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(true),
  }
  const createAttempt = vi.fn().mockImplementation(async (attempt) => ({
    id: attempt.generation === 2 ? "attempt_2" : "attempt_1",
    generation: 1,
    created_at: new Date(),
    updated_at: new Date(),
    parcel_id: null,
    parcel_number: null,
    barcode: null,
    last_error: null,
    ...attempt,
  }))
  const updateAttempt = vi.fn().mockImplementation(async (attempt) => ({
    id: "attempt_1",
    operation_key: input.operation_key,
    client_reference: input.client_reference,
    generation: 1,
    created_at: new Date(),
    updated_at: new Date(),
    parcel_id: null,
    parcel_number: null,
    barcode: null,
    last_error: null,
    ...attempts.find((existingAttempt) => existingAttempt.id === attempt.id),
    ...attempt,
  }))
  const instance = Object.assign(
    Object.create(GLSClientModuleService.prototype),
    {
      lockingService_: locking,
      listGLSFulfillmentAttempts: vi.fn().mockResolvedValue(attempts),
      createGLSFulfillmentAttempts: createAttempt,
      updateGLSFulfillmentAttempts: updateAttempt,
      getClient: vi.fn().mockResolvedValue(carrier),
    }
  ) as GLSClientModuleService

  return { instance, locking, createAttempt, updateAttempt }
}
