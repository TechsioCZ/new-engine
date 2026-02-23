export const toTrimmedOrNull = (value: string): string | null => {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export const isDefined = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

const normalizeComparableText = (value: string): string =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()

export const normalizeCountryFromCompanyInfo = (
  countryValue: string | null | undefined,
  countries:
    | Array<{
        iso_2?: string | null
        name?: string | null
      }>
    | undefined
): string | undefined => {
  if (!countryValue) {
    return undefined
  }

  const normalizedCountry = normalizeComparableText(countryValue)

  if (!normalizedCountry) {
    return undefined
  }

  if (normalizedCountry.length === 2) {
    return normalizedCountry
  }

  const matchedCountry = countries?.find((country) => {
    const countryName = country?.name?.trim()
    if (!countryName) {
      return false
    }

    return normalizeComparableText(countryName) === normalizedCountry
  })

  if (matchedCountry?.iso_2) {
    return matchedCountry.iso_2.toLowerCase()
  }

  if (
    normalizedCountry.includes("czech") ||
    normalizedCountry.includes("cesk")
  ) {
    return "cz"
  }

  return undefined
}

export const resolveCurrencyFromCountry = (
  countryIso2: string | undefined,
  regions:
    | Array<{
        currency_code?: string | null
        countries?:
          | Array<{
              iso_2?: string | null
            }>
          | null
      }>
    | undefined
): string | undefined => {
  if (!countryIso2) {
    return undefined
  }

  const normalizedCountry = countryIso2.toLowerCase()

  const matchedRegion = regions?.find((region) =>
    region.countries?.some(
      (country) => country?.iso_2?.toLowerCase() === normalizedCountry
    )
  )

  return matchedRegion?.currency_code ?? undefined
}

export const buildCompanyInfoLookupQuery = (formData: {
  company_identification_number?: string | null
  vat_identification_number?: string | null
  name?: string | null
}):
  | {
      vat_identification_number?: string
      company_identification_number?: string
      company_name?: string
    }
  | undefined => {
  const companyIdentificationNumber = formData.company_identification_number
    ?.trim()
    .replace(/\s+/g, "")

  if (companyIdentificationNumber) {
    return {
      company_identification_number: companyIdentificationNumber,
    }
  }

  const vatIdentificationNumber = formData.vat_identification_number
    ?.trim()
    .toUpperCase()
  if (vatIdentificationNumber) {
    return {
      vat_identification_number: vatIdentificationNumber,
    }
  }

  const companyName = formData.name?.trim()
  if (companyName) {
    return {
      company_name: companyName,
    }
  }

  return undefined
}
