import { MedusaError } from "@medusajs/framework/utils"

const mockParseCompanyInfoInputStep = jest.fn()
const mockResolveVatCompanyNameStep = jest.fn()
const mockFetchAresSubjectByIcoStep = jest.fn()
const mockSearchAresSubjectsByNameStep = jest.fn()
const mockVerifySubjectVatsStep = jest.fn()
const mockMapCompanyInfoStep = jest.fn()

type WhenFn = (
  name: string,
  state: unknown,
  predicate: (state: any) => boolean
) => { then: (cb: () => unknown) => unknown }

let whenImpl: WhenFn = (_name, state, predicate) => ({
  then: (cb) => (predicate(state) ? cb() : undefined),
})

jest.mock("@medusajs/framework/workflows-sdk", () => ({
  createWorkflow: (_name: string, composer: (input: unknown) => unknown) => {
    return (input: unknown) => {
      const response = composer(input) as { result?: unknown }
      return response?.result
    }
  },
  transform: <TInput, TOutput>(
    input: TInput,
    mapper: (value: TInput) => TOutput
  ): TOutput => mapper(input),
  when: (...args: Parameters<WhenFn>) => whenImpl(...args),
  WorkflowResponse: class<T> {
    result: T

    constructor(result: T) {
      this.result = result
    }
  },
}))

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/parse-company-info-input",
  () => ({
  parseCompanyInfoInputStep: (...args: unknown[]) =>
    mockParseCompanyInfoInputStep(...args),
  })
)

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/resolve-vat-company-name",
  () => ({
  resolveVatCompanyNameStep: (...args: unknown[]) =>
    mockResolveVatCompanyNameStep(...args),
  })
)

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/fetch-ares-subject-by-ico",
  () => ({
  fetchAresSubjectByIcoStep: (...args: unknown[]) =>
    mockFetchAresSubjectByIcoStep(...args),
  })
)

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/search-ares-subjects-by-name",
  () => ({
  searchAresSubjectsByNameStep: (...args: unknown[]) =>
    mockSearchAresSubjectsByNameStep(...args),
  })
)

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/verify-subject-vats",
  () => ({
  verifySubjectVatsStep: (...args: unknown[]) => mockVerifySubjectVatsStep(...args),
  })
)

jest.mock(
  "../../../../../src/workflows/company-check/steps/company-info/map-company-info",
  () => ({
  mapCompanyInfoStep: (...args: unknown[]) => mockMapCompanyInfoStep(...args),
  })
)

import { companyCheckCzInfoWorkflow } from "../../../../../src/workflows/company-check/workflows/company-info"

describe("companyCheckCzInfoWorkflow (unit, mocked SDK)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    whenImpl = (_name, state, predicate) => ({
      then: (cb) => (predicate(state) ? cb() : undefined),
    })
  })

  it("executes name-query path and applies MAX_COMPANY_RESULTS slicing", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "name",
      requestedVatIdentificationNumber: null,
      parsedRequestedVat: null,
      companyIdentificationNumber: null,
      companyName: " ACME s.r.o. ",
    })
    mockSearchAresSubjectsByNameStep.mockReturnValue([{ ico: "00000001" }])
    mockVerifySubjectVatsStep.mockReturnValue({
      "00000001": "CZ12345678",
    })
    mockMapCompanyInfoStep.mockReturnValue(
      Array.from({ length: 12 }, (_, index) => ({
        company_name: `Company ${index + 1}`,
        company_identification_number: String(index + 1).padStart(8, "0"),
        vat_identification_number: null,
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      }))
    )

    const result = companyCheckCzInfoWorkflow({
      company_name: "ACME",
    })

    expect(mockSearchAresSubjectsByNameStep).toHaveBeenCalledWith({
      companyName: "ACME s.r.o.",
    })
    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown[]).length).toBe(10)
  })

  it("executes ICO-query path and returns mapped subject result", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "ico",
      requestedVatIdentificationNumber: null,
      parsedRequestedVat: null,
      companyIdentificationNumber: "00000001",
      companyName: null,
    })
    mockFetchAresSubjectByIcoStep.mockReturnValue({
      ico: "00000001",
      obchodniJmeno: "ACME s.r.o.",
      sidlo: null,
    })
    mockVerifySubjectVatsStep.mockReturnValue({
      "00000001": "CZ12345678",
    })
    mockMapCompanyInfoStep.mockReturnValue([
      {
        company_name: "ACME s.r.o.",
        company_identification_number: "00000001",
        vat_identification_number: "CZ12345678",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
    ])

    const result = companyCheckCzInfoWorkflow({
      company_identification_number: "00000001",
    })

    expect(mockFetchAresSubjectByIcoStep).toHaveBeenCalledWith({
      companyIdentificationNumber: "00000001",
    })
    expect(result).toEqual([
      {
        company_name: "ACME s.r.o.",
        company_identification_number: "00000001",
        vat_identification_number: "CZ12345678",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
    ])
  })

  it("filters VAT query results to exact VAT match", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "vat",
      requestedVatIdentificationNumber: "cz12345678",
      parsedRequestedVat: { countryCode: "CZ", vatNumber: "12345678" },
      companyIdentificationNumber: null,
      companyName: null,
    })
    mockResolveVatCompanyNameStep.mockReturnValue({
      companyName: "ACME s.r.o.",
      isVatValid: true,
      isGroupRegistration: false,
    })
    mockSearchAresSubjectsByNameStep.mockReturnValue([{ ico: "00000001" }])
    mockVerifySubjectVatsStep.mockReturnValue({
      "00000001": "CZ12345678",
    })
    mockMapCompanyInfoStep.mockReturnValue([
      {
        company_name: "ACME",
        company_identification_number: "00000001",
        vat_identification_number: "CZ12345678",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
      {
        company_name: "OTHER",
        company_identification_number: "00000002",
        vat_identification_number: "CZ99999999",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
    ])

    const result = companyCheckCzInfoWorkflow({
      vat_identification_number: "CZ12345678",
    })

    expect(result).toEqual([
      {
        company_name: "ACME",
        company_identification_number: "00000001",
        vat_identification_number: "CZ12345678",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
    ])
  })

  it("returns group-registration placeholder for valid VAT without deterministic company match", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "vat",
      requestedVatIdentificationNumber: "CZ12345678",
      parsedRequestedVat: { countryCode: "CZ", vatNumber: "12345678" },
      companyIdentificationNumber: null,
      companyName: null,
    })
    mockResolveVatCompanyNameStep.mockReturnValue({
      companyName: null,
      isVatValid: true,
      isGroupRegistration: true,
    })
    mockVerifySubjectVatsStep.mockReturnValue({})
    mockMapCompanyInfoStep.mockReturnValue([])

    const result = companyCheckCzInfoWorkflow({
      vat_identification_number: "CZ12345678",
    })

    expect(mockSearchAresSubjectsByNameStep).not.toHaveBeenCalled()
    expect(result).toEqual([
      {
        company_name: "",
        company_identification_number: "",
        vat_identification_number: "CZ12345678",
        street: "",
        city: "",
        country_code: "",
        country: "",
        postal_code: "",
      },
    ])
  })

  it("throws INVALID_DATA when VAT branch lacks parsed VAT", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "vat",
      requestedVatIdentificationNumber: "CZ12345678",
      parsedRequestedVat: null,
      companyIdentificationNumber: null,
      companyName: null,
    })

    expect(() =>
      companyCheckCzInfoWorkflow({
        vat_identification_number: "CZ12345678",
      })
    ).toThrow(MedusaError)
  })

  it("throws INVALID_DATA when ICO branch lacks company identification number", () => {
    mockParseCompanyInfoInputStep.mockReturnValue({
      queryType: "ico",
      requestedVatIdentificationNumber: null,
      parsedRequestedVat: null,
      companyIdentificationNumber: null,
      companyName: null,
    })

    expect(() =>
      companyCheckCzInfoWorkflow({
        company_identification_number: "00000001",
      })
    ).toThrow(MedusaError)
  })
})
