import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPANY_CHECK_MODULE } from "../../../../../../src/modules/company-check"
import type { AresEconomicSubject } from "../../../../../../src/modules/company-check/types"

jest.mock("@medusajs/framework/workflows-sdk", () => {
  class StepResponse<T> {
    output: T

    constructor(output: T) {
      this.output = output
    }
  }

  return {
    createStep: (_name: string, invoke: unknown) => invoke,
    StepResponse,
  }
})

import { verifySubjectVatsStep } from "../../../../../../src/workflows/company-check/steps/company-info/verify-subject-vats"

type StepResult<T> = {
  output: T
}

type CompanyCheckServiceMock = {
  checkVatNumber: jest.Mock<
    Promise<{ valid: boolean }>,
    [{ countryCode: string; vatNumber: string }]
  >
}

type StepExecutionContextLike = {
  container: {
    resolve: (key: string) => unknown
  }
}

function createSubject(
  ico: string,
  vatIdentificationNumber: string | null
): AresEconomicSubject {
  return {
    ico,
    obchodniJmeno: `Company ${ico}`,
    dic: vatIdentificationNumber,
    dicSkDph: undefined,
    sidlo: null,
  }
}

function createStepContext(service: CompanyCheckServiceMock): StepExecutionContextLike {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }

  return {
    container: {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }

        if (key === COMPANY_CHECK_MODULE) {
          return service
        }

        throw new Error(`Unexpected container key: ${key}`)
      },
    },
  }
}

async function executeStep(
  subjects: AresEconomicSubject[],
  service: CompanyCheckServiceMock
): Promise<Record<string, string | null>> {
  const result = (await (
    verifySubjectVatsStep as unknown as (
      input: AresEconomicSubject[],
      context: StepExecutionContextLike
    ) => Promise<StepResult<Record<string, string | null>>>
  )(subjects, createStepContext(service))) as StepResult<Record<string, string | null>>

  return result.output
}

describe("verifySubjectVatsStep", () => {
  it("returns an empty object and skips VIES calls when no subjects are provided", async () => {
    const service = {
      checkVatNumber: jest.fn(),
    }

    const output = await executeStep([], service)

    expect(output).toEqual({})
    expect(service.checkVatNumber).not.toHaveBeenCalled()
  })

  it("deduplicates equal VAT IDs across subjects and maps the result back per ICO", async () => {
    const service = {
      checkVatNumber: jest
        .fn()
        .mockImplementation(async ({ countryCode, vatNumber }) => ({
          valid: `${countryCode}${vatNumber}` === "CZ12345678",
        })),
    }

    const output = await executeStep(
      [
        createSubject("00000001", " CZ12345678 "),
        createSubject("00000002", "CZ12345678"),
        createSubject("00000003", "SK2020202020"),
      ],
      service
    )

    expect(service.checkVatNumber).toHaveBeenCalledTimes(2)
    expect(output).toEqual({
      "00000001": "CZ12345678",
      "00000002": "CZ12345678",
      "00000003": null,
    })
  })

  it("ignores invalid VAT formats and continues verifying remaining subjects", async () => {
    const service = {
      checkVatNumber: jest.fn().mockResolvedValue({ valid: true }),
    }

    const output = await executeStep(
      [
        createSubject("00000001", "CZ-INVALID"),
        createSubject("00000002", "CZ87654321"),
      ],
      service
    )

    expect(service.checkVatNumber).toHaveBeenCalledTimes(1)
    expect(output).toEqual({
      "00000001": null,
      "00000002": "CZ87654321",
    })
  })

  it("marks a VAT as unverified when its VIES check fails", async () => {
    const service = {
      checkVatNumber: jest
        .fn()
        .mockImplementation(async ({ vatNumber }: { vatNumber: string }) => {
          if (vatNumber === "00000002") {
            throw new Error("VIES unavailable")
          }
          return { valid: true }
        }),
    }

    const output = await executeStep(
      [
        createSubject("00000001", "CZ00000001"),
        createSubject("00000002", "CZ00000002"),
      ],
      service
    )

    expect(service.checkVatNumber).toHaveBeenCalledTimes(2)
    expect(output).toEqual({
      "00000001": "CZ00000001",
      "00000002": null,
    })
  })

  it("processes VIES validation in chunks of 10 concurrent calls", async () => {
    let inFlight = 0
    let maxInFlight = 0

    const service = {
      checkVatNumber: jest.fn().mockImplementation(async () => {
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlight--
        return { valid: true }
      }),
    }

    const subjects = Array.from({ length: 12 }, (_, index) =>
      createSubject(
        String(index + 1).padStart(8, "0"),
        `CZ${String(index + 1).padStart(8, "0")}`
      )
    )

    const output = await executeStep(subjects, service)

    expect(service.checkVatNumber).toHaveBeenCalledTimes(12)
    expect(maxInFlight).toBe(10)
    expect(Object.values(output).every((value) => value !== null)).toBe(true)
  })
})
