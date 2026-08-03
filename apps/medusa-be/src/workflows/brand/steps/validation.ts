import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

export type BrandScalarWriteInput = {
  handle?: string | undefined
  title?: string | undefined
  gpsr_contact_email?: string | null | undefined
  gpsr_european_reseller_contact_email?: string | null | undefined
  gpsr_european_reseller_manufacturing_company_name?: string | null | undefined
  gpsr_european_reseller_postal_address?: string | null | undefined
  gpsr_manufactured_outside_eu?: boolean | undefined
  gpsr_manufacturing_company_name?: string | null | undefined
  gpsr_postal_address?: string | null | undefined
}

const emailSchema = z.string().email()
const GPSR_TEXT_FIELDS = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_manufacturing_company_name",
  "gpsr_postal_address",
] as const
const REQUIRED_OUTSIDE_EU_FIELDS = [
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_european_reseller_contact_email",
] as const

export const getBrandHandleCollisionMessage = (brand: {
  deleted_at?: string | Date | null
  handle: string
}) => {
  const suffix = brand.deleted_at
    ? " as a deleted record. Restore it through the explicit restore action"
    : ""

  return `Brand with handle "${brand.handle}" already exists${suffix}.`
}

export const normalizeBrandWriteInput = (
  brand: BrandScalarWriteInput
): BrandScalarWriteInput => {
  const normalized: BrandScalarWriteInput = {
    ...(brand.handle !== undefined ? { handle: brand.handle.trim() } : {}),
    ...(brand.title !== undefined ? { title: brand.title.trim() } : {}),
    ...(brand.gpsr_manufactured_outside_eu !== undefined
      ? {
          gpsr_manufactured_outside_eu: brand.gpsr_manufactured_outside_eu,
        }
      : {}),
  }

  for (const field of GPSR_TEXT_FIELDS) {
    const value = brand[field]
    if (value === undefined) {
      continue
    }

    normalized[field] =
      value === null || value.trim().length === 0 ? null : value.trim()
  }

  return normalized
}

export const validateBrandGpsrState = (
  brand: BrandScalarWriteInput,
  identity = brand.handle ?? brand.title ?? "brand"
) => {
  const normalized = normalizeBrandWriteInput(brand)

  for (const field of [
    "gpsr_contact_email",
    "gpsr_european_reseller_contact_email",
  ] as const) {
    const value = normalized[field]

    if (value && !emailSchema.safeParse(value).success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Brand "${identity}" has an invalid ${field}`
      )
    }
  }

  const presentRepresentativeFields = REQUIRED_OUTSIDE_EU_FIELDS.filter(
    (field) => !!normalized[field]
  )

  if (
    presentRepresentativeFields.length !== 0 &&
    presentRepresentativeFields.length !== REQUIRED_OUTSIDE_EU_FIELDS.length
  ) {
    const missingFields = REQUIRED_OUTSIDE_EU_FIELDS.filter(
      (field) => !normalized[field]
    )

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Brand "${identity}" must provide all EU representative fields or none; missing: ${missingFields.join(", ")}`
    )
  }

  const hasEuropeanRepresentative =
    presentRepresentativeFields.length === REQUIRED_OUTSIDE_EU_FIELDS.length

  const isManufacturedOutsideEu =
    normalized.gpsr_manufactured_outside_eu ?? false

  if (isManufacturedOutsideEu !== hasEuropeanRepresentative) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Brand "${identity}" must set gpsr_manufactured_outside_eu to ${hasEuropeanRepresentative} when EU representative fields are ${hasEuropeanRepresentative ? "present" : "absent"}`
    )
  }

  return normalized
}
