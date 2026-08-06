import { Module } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import payloadModule, {
  PAYLOAD_MODULE,
} from "../../../../../src/modules/payload/index"
import PayloadModuleService from "../../../../../src/modules/payload/service"

vi.mock(import("@medusajs/framework/utils"), () => {
  class MedusaError extends Error {
    static readonly Types = {
      INVALID_DATA: "invalid_data",
      UNEXPECTED_STATE: "unexpected_state",
    }

    constructor(_type: string, message: string) {
      super(message)
      this.name = "MedusaError"
    }
  }

  return {
    MedusaError,
    MedusaService: vi.fn<() => ObjectConstructor>(() => Object),
    Module: vi.fn<typeof Module>(() => ({ __module: true })),
    Modules: { CACHING: "caching" },
  }
})

describe("payload module", () => {
  it("registers the module with the payload service", () => {
    const moduleMock = vi.mocked(Module)

    expect(moduleMock).toHaveBeenCalledWith(PAYLOAD_MODULE, {
      service: PayloadModuleService,
    })
    expect(payloadModule).toBe(moduleMock.mock.results[0]?.value)
  })
})
