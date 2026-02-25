import { z } from "@medusajs/framework/zod"
import {
  AresAddressSchema,
  AresEconomicSubjectSchema,
  AresEconomicSubjectSearchResponseSchema,
  AresStandardizedAddressSchema,
  AresStandardizedAddressSearchResponseSchema,
  MojeDaneStatusResponseSchema,
  TaxReliabilityResultSchema,
  ViesCheckVatResponseSchema,
} from "./schema"

export type CompanyInfo = {
  company_name: string
  company_identification_number: string
  vat_identification_number?: string | null
  street: string
  city: string
  country_code: string
  country: string
  postal_code: string
}

export type ViesCheckVatRequest = {
  countryCode: string
  vatNumber: string
}

export type ViesCheckVatResponse = z.infer<typeof ViesCheckVatResponseSchema>

export type MojeDaneStatusResponse = z.infer<
  typeof MojeDaneStatusResponseSchema
>

export type TaxReliabilityResult = z.infer<typeof TaxReliabilityResultSchema>

export type ViesClientOptions = {
  baseUrl: string
}

export type AresClientOptions = {
  baseUrl: string
}

export type MojeDaneClientOptions = {
  wsdlUrl: string
}

export type AresAddress = z.infer<typeof AresAddressSchema>

export type AresEconomicSubject = z.infer<typeof AresEconomicSubjectSchema>

export type AresEconomicSubjectSearchResponse = z.infer<
  typeof AresEconomicSubjectSearchResponseSchema
>

export type AresStandardizedAddress = z.infer<
  typeof AresStandardizedAddressSchema
>

export type AresStandardizedAddressSearchResponse = z.infer<
  typeof AresStandardizedAddressSearchResponseSchema
>

export type AresEconomicSubjectSearchRequest = Record<string, unknown>

export type AresStandardizedAddressSearchRequest = Record<string, unknown>

export type ViesCheckVatResult = {
  valid: boolean
  name: string | null
  address: string | null
  is_group_registration: boolean
  request_date: string | null
  request_identifier: string | null
  trader_name_match: string | null
  trader_address_match: string | null
  trader_company_type_match: string | null
  trader_street_match: string | null
  trader_postal_code_match: string | null
  trader_city_match: string | null
}
