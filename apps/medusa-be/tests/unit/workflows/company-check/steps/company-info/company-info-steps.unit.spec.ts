import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { withMedusaStatusCode } from "../../../../../../src/utils/errors"
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

import { fetchAresSubjectByIcoStep } from "../../../../../../src/workflows/company-check/steps/company-info/fetch-ares-subject-by-ico"
import { mapCompanyInfoStep } from "../../../../../../src/workflows/company-check/steps/company-info/map-company-info"
import { parseCompanyInfoInputStep } from "../../../../../../src/workflows/company-check/steps/company-info/parse-company-info-input"
import { resolveVatCompanyNameStep } from "../../../../../../src/workflows/company-check/steps/company-info/resolve-vat-company-name"
import { searchAresSubjectsByNameStep } from "../../../../../../src/workflows/company-check/steps/company-info/search-ares-subjects-by-name"

type StepResult<T> = {
  output: T
}

type CompanyCheckServiceMock = {
  getAresEconomicSubjectByIco: jest.Mock
  searchAresEconomicSubjects: jest.Mock
  checkVatNumber: jest.Mock
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
    getAresEconomicSubjectByIco: jest.fn(),
    searchAresEconomicSubjects: jest.fn(),
    checkVatNumber: jest.fn(),
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

function createSubject(
  ico: string,
  name: string,
  overrides: Partial<AresEconomicSubject> = {}
): AresEconomicSubject {
  return {
    ico,
    obchodniJmeno: name,
    sidlo: null,
    ...overrides,
  }
}

describe("parseCompanyInfoInputStep", () => {
  it("parses VAT query into canonical state", async () => {
    const result = (await (
      parseCompanyInfoInputStep as unknown as (
        input: {
          vat_identification_number?: string
          company_identification_number?: string
          company_name?: string
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ vat_identification_number: " cz12345678 " }, createStepContext())) as StepResult<{
      queryType: string
      requestedVatIdentificationNumber: string
      parsedRequestedVat: { countryCode: string; vatNumber: string }
    }>

    expect(result.output).toMatchObject({
      queryType: "vat",
      requestedVatIdentificationNumber: "CZ12345678",
      parsedRequestedVat: {
        countryCode: "CZ",
        vatNumber: "12345678",
      },
    })
  })

  it("throws INVALID_DATA when multiple fields are provided", async () => {
    await expect(
      (
        parseCompanyInfoInputStep as unknown as (
          input: {
            vat_identification_number?: string
            company_identification_number?: string
            company_name?: string
          },
          context: StepExecutionContextLike
        ) => Promise<StepResult<unknown>>
      )(
        {
          vat_identification_number: "CZ12345678",
          company_name: "Acme",
        },
        createStepContext()
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("parses ICO query into canonical state", async () => {
    const result = (await (
      parseCompanyInfoInputStep as unknown as (
        input: {
          vat_identification_number?: string
          company_identification_number?: string
          company_name?: string
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      { company_identification_number: " 00000001 " },
      createStepContext()
    )) as StepResult<{
      queryType: string
      companyIdentificationNumber: string | null
      companyName: string | null
    }>

    expect(result.output).toMatchObject({
      queryType: "ico",
      companyIdentificationNumber: "00000001",
      companyName: null,
    })
  })

  it("parses company-name query into canonical state", async () => {
    const result = (await (
      parseCompanyInfoInputStep as unknown as (
        input: {
          vat_identification_number?: string
          company_identification_number?: string
          company_name?: string
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ company_name: " ACME s.r.o. " }, createStepContext())) as StepResult<{
      queryType: string
      companyIdentificationNumber: string | null
      companyName: string | null
    }>

    expect(result.output).toMatchObject({
      queryType: "name",
      companyIdentificationNumber: null,
      companyName: "ACME s.r.o.",
    })
  })
})

describe("mapCompanyInfoStep", () => {
  it("returns empty array when input has no subjects", async () => {
    const result = (await (
      mapCompanyInfoStep as unknown as (
        input: {
          subjects: AresEconomicSubject[]
          verifiedVatByIco: Record<string, string | null>
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      {
        subjects: [],
        verifiedVatByIco: {},
      },
      createStepContext()
    )) as StepResult<unknown[]>

    expect(result.output).toEqual([])
  })

  it("maps subjects to CompanyInfo output using verified VAT map", async () => {
    const result = (await (
      mapCompanyInfoStep as unknown as (
        input: {
          subjects: AresEconomicSubject[]
          verifiedVatByIco: Record<string, string | null>
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      {
        subjects: [
          createSubject("00000001", "ACME s.r.o.", {
            sidlo: {
              nazevUlice: "Main",
              cisloDomovni: "10",
              cisloOrientacni: "5",
              cisloOrientacniPismeno: "A",
              nazevObce: "Prague",
              kodStatu: "CZ",
              nazevStatu: "Czech Republic",
              psc: "11000",
            },
          }),
        ],
        verifiedVatByIco: {
          "00000001": "CZ12345678",
        },
      },
      createStepContext()
    )) as StepResult<
      Array<{
        company_name: string
        vat_identification_number: string | null
        street: string
      }>
    >

    expect(result.output[0]).toMatchObject({
      company_name: "ACME s.r.o.",
      vat_identification_number: "CZ12345678",
      country_code: "CZ",
      street: "Main 10/5A",
    })
  })

  it("maps missing verified VAT entries to null", async () => {
    const result = (await (
      mapCompanyInfoStep as unknown as (
        input: {
          subjects: AresEconomicSubject[]
          verifiedVatByIco: Record<string, string | null>
        },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      {
        subjects: [createSubject("00000077", "No VAT Company")],
        verifiedVatByIco: {},
      },
      createStepContext()
    )) as StepResult<
      Array<{
        company_identification_number: string
        vat_identification_number: string | null
      }>
    >

    expect(result.output).toEqual([
      expect.objectContaining({
        company_identification_number: "00000077",
        vat_identification_number: null,
      }),
    ])
  })
})

describe("fetchAresSubjectByIcoStep", () => {
  it("returns subject for successful ICO lookup", async () => {
    const service = {
      getAresEconomicSubjectByIco: jest
        .fn()
        .mockResolvedValue(createSubject("00000001", "ACME")),
    }

    const result = (await (
      fetchAresSubjectByIcoStep as unknown as (
        input: { companyIdentificationNumber: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      { companyIdentificationNumber: "00000001" },
      createStepContext(service)
    )) as StepResult<AresEconomicSubject | null>

    expect(result.output?.ico).toBe("00000001")
  })

  it("returns null when ARES lookup yields 404 INVALID_DATA", async () => {
    const service = {
      getAresEconomicSubjectByIco: jest.fn().mockRejectedValue(
        withMedusaStatusCode(
          new MedusaError(MedusaError.Types.INVALID_DATA, "Not found"),
          404
        )
      ),
    }

    const result = (await (
      fetchAresSubjectByIcoStep as unknown as (
        input: { companyIdentificationNumber: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      { companyIdentificationNumber: "00000001" },
      createStepContext(service)
    )) as StepResult<AresEconomicSubject | null>

    expect(result.output).toBeNull()
  })

  it("rethrows non-404 errors from ARES lookup", async () => {
    const service = {
      getAresEconomicSubjectByIco: jest
        .fn()
        .mockRejectedValue(new Error("upstream down")),
    }

    await expect(
      (
        fetchAresSubjectByIcoStep as unknown as (
          input: { companyIdentificationNumber: string },
          context: StepExecutionContextLike
        ) => Promise<StepResult<unknown>>
      )(
        { companyIdentificationNumber: "00000001" },
        createStepContext(service)
      )
    ).rejects.toThrow("upstream down")
  })
})

describe("resolveVatCompanyNameStep", () => {
  it("returns trimmed company name for valid non-group VAT", async () => {
    const service = {
      checkVatNumber: jest.fn().mockResolvedValue({
        valid: true,
        name: " ACME s.r.o. ",
      }),
    }

    const result = (await (
      resolveVatCompanyNameStep as unknown as (
        input: { countryCode: string; vatNumber: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      { countryCode: "CZ", vatNumber: "12345678" },
      createStepContext(service)
    )) as StepResult<{
      companyName: string | null
      isVatValid: boolean
      isGroupRegistration: boolean
    }>

    expect(result.output).toEqual({
      companyName: "ACME s.r.o.",
      isVatValid: true,
      isGroupRegistration: false,
    })
  })

  it("returns null company name when VIES reports group registration", async () => {
    const service = {
      checkVatNumber: jest.fn().mockResolvedValue({
        valid: true,
        name: "Group registration - This VAT ID corresponds to a Group of Taxpayers",
      }),
    }

    const result = (await (
      resolveVatCompanyNameStep as unknown as (
        input: { countryCode: string; vatNumber: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )(
      { countryCode: "CZ", vatNumber: "12345678" },
      createStepContext(service)
    )) as StepResult<{
      companyName: string | null
      isVatValid: boolean
      isGroupRegistration: boolean
    }>

    expect(result.output).toEqual({
      companyName: null,
      isVatValid: true,
      isGroupRegistration: true,
    })
  })
})

describe("searchAresSubjectsByNameStep", () => {
  it("returns empty result for blank company name", async () => {
    const service = {
      searchAresEconomicSubjects: jest.fn(),
    }

    const result = (await (
      searchAresSubjectsByNameStep as unknown as (
        input: { companyName: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ companyName: "   " }, createStepContext(service))) as StepResult<
      AresEconomicSubject[]
    >

    expect(result.output).toEqual([])
    expect(service.searchAresEconomicSubjects).not.toHaveBeenCalled()
  })

  it("searches ARES and returns deterministic top matches", async () => {
    const service = {
      searchAresEconomicSubjects: jest.fn().mockResolvedValue({
        pocetCelkem: 3,
        ekonomickeSubjekty: [
          createSubject("00000002", "ACMEs.r.o."),
          createSubject("00000001", " ACME   s.r.o. "),
          createSubject("00000001", "ACME s.r.o."),
        ],
      }),
    }

    const result = (await (
      searchAresSubjectsByNameStep as unknown as (
        input: { companyName: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ companyName: " ACME s.r.o. " }, createStepContext(service))) as StepResult<
      AresEconomicSubject[]
    >

    expect(service.searchAresEconomicSubjects).toHaveBeenCalledWith({
      obchodniJmeno: "ACME s.r.o.",
    })
    expect(result.output.map((item) => item.ico)).toEqual([
      "00000001",
      "00000002",
    ])
  })

  it("returns empty result on 404 INVALID_DATA errors", async () => {
    const service = {
      searchAresEconomicSubjects: jest.fn().mockRejectedValue(
        withMedusaStatusCode(
          new MedusaError(MedusaError.Types.INVALID_DATA, "Not found"),
          404
        )
      ),
    }

    const result = (await (
      searchAresSubjectsByNameStep as unknown as (
        input: { companyName: string },
        context: StepExecutionContextLike
      ) => Promise<StepResult<unknown>>
    )({ companyName: "ACME" }, createStepContext(service))) as StepResult<
      AresEconomicSubject[]
    >

    expect(result.output).toEqual([])
  })

  it("rethrows non-404 errors from ARES name search", async () => {
    const service = {
      searchAresEconomicSubjects: jest
        .fn()
        .mockRejectedValue(new Error("ares unavailable")),
    }

    await expect(
      (
        searchAresSubjectsByNameStep as unknown as (
          input: { companyName: string },
          context: StepExecutionContextLike
        ) => Promise<StepResult<unknown>>
      )({ companyName: "ACME" }, createStepContext(service))
    ).rejects.toThrow("ares unavailable")
  })
})
