import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { withMedusaStatusCode } from "../../../../../../src/utils/errors"
import { COMPANY_CHECK_MODULE } from "../../../../../../src/modules/company-check"

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

import { fetchAddressCountStep } from "../../../../../../src/workflows/company-check/steps/address-count/fetch-address-count"
import { parseAddressCountInputStep } from "../../../../../../src/workflows/company-check/steps/address-count/parse-address-count-input"
import { resolveAddressCountFilterStep } from "../../../../../../src/workflows/company-check/steps/address-count/resolve-address-count-filter"

type StepResult<T> = {
  output: T
}

type CompanyCheckServiceMock = {
  searchAresStandardizedAddresses: jest.Mock
  searchAresEconomicSubjects: jest.Mock
}

type AddressCountState = {
  street: string
  city: string
  textAddress: string
  sidloFilter: Record<string, unknown> | null
}

type StepExecutionContextLike = {
  container: {
    resolve: (key: string) => unknown
  }
}

function createStepContext(service?: Partial<CompanyCheckServiceMock>): StepExecutionContextLike {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
  const companyCheckService = {
    searchAresStandardizedAddresses: jest.fn(),
    searchAresEconomicSubjects: jest.fn(),
    ...service,
  }

  return {
    container: {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.LOGGER) {
          return logger
        }
        if (key === COMPANY_CHECK_MODULE) {
          return companyCheckService
        }
        throw new Error(`Unexpected key: ${key}`)
      },
    },
  }
}

describe("parseAddressCountInputStep", () => {
  it("normalizes street/city and builds text address", async () => {
    const result = (await (
      parseAddressCountInputStep as unknown as (
        input: { street: string; city: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ street: " Main 10 ", city: " Prague " }, createStepContext())) as StepResult<{
      street: string
      city: string
      textAddress: string
      sidloFilter: Record<string, unknown> | null
    }>

    expect(result.output).toEqual({
      street: "Main 10",
      city: "Prague",
      textAddress: "Main 10, Prague",
      sidloFilter: null,
    })
  })

  it("throws INVALID_DATA when required field is empty", async () => {
    await expect(
      (
        parseAddressCountInputStep as unknown as (
          input: { street: string; city: string },
          context: StepExecutionContextLike
        ) => Promise<StepResult<unknown>>
      )({ street: " ", city: "Prague" }, createStepContext())
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })
})

describe("resolveAddressCountFilterStep", () => {
  const baseState: AddressCountState = {
    street: "Main 10",
    city: "Prague",
    textAddress: "Main 10, Prague",
    sidloFilter: null,
  }

  it("uses standardized address to build sidlo filter", async () => {
    const service = {
      searchAresStandardizedAddresses: jest.fn().mockResolvedValue({
        pocetCelkem: 1,
        standardizovaneAdresy: [
          {
            kodObce: 554782,
            cisloDomovni: "10",
          },
        ],
      }),
    }

    const result = (await (
      resolveAddressCountFilterStep as unknown as (
        input: AddressCountState,
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(baseState, createStepContext(service))) as StepResult<AddressCountState>

    expect(result.output.sidloFilter).toEqual({
      kodObce: 554782,
      cisloDomovni: "10",
    })
  })

  it("falls back to text address when standardization returns no usable fields", async () => {
    const service = {
      searchAresStandardizedAddresses: jest.fn().mockResolvedValue({
        pocetCelkem: 1,
        standardizovaneAdresy: [{}],
      }),
    }

    const result = (await (
      resolveAddressCountFilterStep as unknown as (
        input: AddressCountState,
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(baseState, createStepContext(service))) as StepResult<AddressCountState>

    expect(result.output.sidloFilter).toEqual({
      textovaAdresa: "Main 10, Prague",
    })
  })

  it("falls back to text address on INVALID_DATA errors", async () => {
    const service = {
      searchAresStandardizedAddresses: jest.fn().mockRejectedValue(
        withMedusaStatusCode(
          new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid"),
          400
        )
      ),
    }

    const result = (await (
      resolveAddressCountFilterStep as unknown as (
        input: AddressCountState,
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(baseState, createStepContext(service))) as StepResult<AddressCountState>

    expect(result.output.sidloFilter).toEqual({
      textovaAdresa: "Main 10, Prague",
    })
  })

  it("rethrows unexpected errors", async () => {
    const service = {
      searchAresStandardizedAddresses: jest
        .fn()
        .mockRejectedValue(new Error("upstream failed")),
    }

    await expect(
      (
        resolveAddressCountFilterStep as unknown as (
          input: AddressCountState,
          context: StepExecutionContextLike
        ) => Promise<StepResult<unknown>>
      )(baseState, createStepContext(service))
    ).rejects.toThrow("upstream failed")
  })
})

describe("fetchAddressCountStep", () => {
  it("uses provided sidlo filter and returns count", async () => {
    const service = {
      searchAresEconomicSubjects: jest.fn().mockResolvedValue({
        pocetCelkem: 7,
        ekonomickeSubjekty: [],
      }),
    }

    const result = (await (
      fetchAddressCountStep as unknown as (
        input: AddressCountState,
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      {
        street: "Main 10",
        city: "Prague",
        textAddress: "Main 10, Prague",
        sidloFilter: { kodObce: 554782 },
      },
      createStepContext(service)
    )) as StepResult<{ count: number }>

    expect(service.searchAresEconomicSubjects).toHaveBeenCalledWith({
      sidlo: { kodObce: 554782 },
    })
    expect(result.output).toEqual({ count: 7 })
  })

  it("falls back to text address when sidlo filter is null", async () => {
    const service = {
      searchAresEconomicSubjects: jest.fn().mockResolvedValue({
        pocetCelkem: 2,
        ekonomickeSubjekty: [],
      }),
    }

    await (
      fetchAddressCountStep as unknown as (
        input: AddressCountState,
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      {
        street: "Main 10",
        city: "Prague",
        textAddress: "Main 10, Prague",
        sidloFilter: null,
      },
      createStepContext(service)
    )

    expect(service.searchAresEconomicSubjects).toHaveBeenCalledWith({
      sidlo: { textovaAdresa: "Main 10, Prague" },
    })
  })
})
