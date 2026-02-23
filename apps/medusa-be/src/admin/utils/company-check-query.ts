const VAT_ID_REGEX = /^[A-Z]{2}[A-Z0-9]+$/

const toTrimmedValue = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

export const normalizeCompanyCheckCzInfoQuery = (
  query?: {
    vat_identification_number?: string | null
    company_identification_number?: string | null
    company_name?: string | null
  }
):
  | {
      vat_identification_number?: string
      company_identification_number?: string
      company_name?: string
    }
  | undefined => {
  const companyIdentificationNumber = toTrimmedValue(
    query?.company_identification_number
  )
  if (companyIdentificationNumber) {
    return {
      company_identification_number: companyIdentificationNumber,
    }
  }

  const vatIdentificationNumber = toTrimmedValue(
    query?.vat_identification_number
  )?.toUpperCase()
  if (vatIdentificationNumber) {
    return {
      vat_identification_number: vatIdentificationNumber,
    }
  }

  const companyName = toTrimmedValue(query?.company_name)
  if (companyName) {
    return {
      company_name: companyName,
    }
  }

  return undefined
}

export const normalizeCompanyCheckCzAddressCountQuery = (
  query?: {
    street?: string | null
    city?: string | null
  }
): { street: string; city: string } | undefined => {
  const street = toTrimmedValue(query?.street)
  const city = toTrimmedValue(query?.city)

  if (!street || !city) {
    return undefined
  }

  return {
    street,
    city,
  }
}

export const normalizeCompanyCheckCzTaxReliabilityQuery = (
  query?: {
    vat_identification_number?: string | null
  }
): { vat_identification_number: string } | undefined => {
  const vatIdentificationNumber = toTrimmedValue(
    query?.vat_identification_number
  )?.toUpperCase()

  if (!vatIdentificationNumber || !VAT_ID_REGEX.test(vatIdentificationNumber)) {
    return undefined
  }

  return {
    vat_identification_number: vatIdentificationNumber,
  }
}

export const normalizeCompanyCheckViesQuery = (
  query?: {
    vat_identification_number?: string | null
  }
): { vat_identification_number: string } | undefined =>
  normalizeCompanyCheckCzTaxReliabilityQuery(query)
