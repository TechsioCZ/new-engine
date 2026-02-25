import type {
  AresAddress,
  AresEconomicSubject,
  ViesCheckVatRequest,
} from "../../../modules/company-check/types"
import { toTrimmedString } from "../../../utils/strings"

export const MAX_COMPANY_RESULTS = 10
const WHITESPACE_REGEX = /\s+/g

export type CompanyInfoQueryType = "vat" | "ico" | "name"

export type CompanyCheckCzInfoWorkflowInput = {
  vat_identification_number?: string
  company_identification_number?: string
  company_name?: string
}

export type ParsedCompanyInfoWorkflowInput = {
  queryType: CompanyInfoQueryType
  requestedVatIdentificationNumber: string | null
  parsedRequestedVat: ViesCheckVatRequest | null
  companyIdentificationNumber: string | null
  companyName: string | null
}

export type MapCompanyInfoStepInput = {
  subjects: AresEconomicSubject[]
  verifiedVatByIco: Record<string, string | null>
}

export function normalizeCompanyName(value: string): string {
  return value.replace(WHITESPACE_REGEX, "").toLowerCase()
}

export function composeStreet(address: AresAddress | null | undefined): string {
  if (!address) {
    return ""
  }

  const streetName = toTrimmedString(address.nazevUlice)
  const houseNumber = toTrimmedString(address.cisloDomovni)
  const orientationNumber = toTrimmedString(address.cisloOrientacni)
  const orientationLetter = toTrimmedString(address.cisloOrientacniPismeno)
  const orientation = `${orientationNumber}${orientationLetter}`.trim()
  const numberPart = [houseNumber, orientation].filter(Boolean).join("/")

  return [streetName, numberPart].filter(Boolean).join(" ").trim()
}

export function pickTopCompanyMatchesByName(
  companyName: string,
  subjects: AresEconomicSubject[]
): AresEconomicSubject[] {
  const normalizedQueryName = normalizeCompanyName(companyName)
  const exactWhitespaceMatches = subjects.filter(
    (subject) => normalizeCompanyName(subject.obchodniJmeno) === normalizedQueryName
  )

  const selectedSubjects =
    exactWhitespaceMatches.length > 0 ? exactWhitespaceMatches : subjects

  const deduplicatedByIco = new Map<string, AresEconomicSubject>()
  for (const subject of selectedSubjects) {
    if (!deduplicatedByIco.has(subject.ico)) {
      deduplicatedByIco.set(subject.ico, subject)
    }
  }

  return Array.from(deduplicatedByIco.values())
    .sort((left, right) => left.ico.localeCompare(right.ico))
    .slice(0, MAX_COMPANY_RESULTS)
}
