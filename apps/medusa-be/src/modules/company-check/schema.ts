import { z } from "@medusajs/framework/zod"

const NullableStringSchema = z.string().nullable().optional()
const NullableAresAddressValueSchema = z.preprocess(
  (value) => {
    if (typeof value === "number") {
      return String(value)
    }
    if (typeof value === "string") {
      return value
    }
    return undefined
  },
  z.string().nullable().optional()
)

export const AresAddressSchema = z
  .object({
    nazevUlice: NullableStringSchema,
    cisloDomovni: NullableAresAddressValueSchema,
    cisloOrientacni: NullableAresAddressValueSchema,
    cisloOrientacniPismeno: NullableStringSchema,
    nazevObce: NullableStringSchema,
    kodStatu: NullableAresAddressValueSchema,
    nazevStatu: NullableStringSchema,
    psc: NullableAresAddressValueSchema,
  })
  .passthrough()

export const AresEconomicSubjectSchema = z
  .object({
    ico: z.string(),
    obchodniJmeno: z.string(),
    dic: NullableStringSchema,
    dicSkDph: NullableStringSchema,
    sidlo: AresAddressSchema.nullable().optional(),
  })
  .passthrough()

export const AresEconomicSubjectSearchResponseSchema = z
  .object({
    pocetCelkem: z.number().int().nonnegative(),
    ekonomickeSubjekty: z.array(AresEconomicSubjectSchema).default([]),
  })
  .passthrough()

export const AresStandardizedAddressSchema = z
  .object({
    kodAdresnihoMista: z.number().int().nullable().optional(),
    kodObce: z.number().int().nullable().optional(),
    kodUlice: z.number().int().nullable().optional(),
    kodCastiObce: z.number().int().nullable().optional(),
    kodMestskeCastiObvodu: z.number().int().nullable().optional(),
    kodKraje: z.number().int().nullable().optional(),
    kodOkresu: z.number().int().nullable().optional(),
    kodSpravnihoObvodu: z.number().int().nullable().optional(),
    kodStatu: z.number().int().nullable().optional(),
    nazevUlice: NullableStringSchema,
    cisloDomovni: NullableAresAddressValueSchema,
    cisloOrientacni: NullableAresAddressValueSchema,
    cisloOrientacniPismeno: NullableStringSchema,
    nazevObce: NullableStringSchema,
    nazevStatu: NullableStringSchema,
    psc: NullableAresAddressValueSchema,
  })
  .passthrough()

export const AresStandardizedAddressSearchResponseSchema = z
  .object({
    pocetCelkem: z.number().int().nonnegative(),
    standardizovaneAdresy: z.array(AresStandardizedAddressSchema).default([]),
  })
  .passthrough()

export const ViesCheckVatResponseSchema = z
  .object({
    valid: z.boolean(),
    name: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    requestDate: z.string().nullable().optional(),
    requestIdentifier: z.string().nullable().optional(),
    traderNameMatch: z.string().nullable().optional(),
    traderAddressMatch: z.string().nullable().optional(),
    traderCompanyTypeMatch: z.string().nullable().optional(),
    traderStreetMatch: z.string().nullable().optional(),
    traderPostalCodeMatch: z.string().nullable().optional(),
    traderCityMatch: z.string().nullable().optional(),
  })
  .passthrough()

export const MojeDaneStatusResponseSchema = z
  .object({
    nespolehlivyPlatce: z.enum(["ANO", "NE", "NENALEZEN"]),
    datumZverejneniNespolehlivosti: z.string().nullable().optional(),
    typSubjektu: z.string().nullable().optional(),
  })
  .passthrough()

export const TaxReliabilityResultSchema = z
  .object({
    reliable: z.boolean().nullable(),
    unreliable_published_at: z.string().nullable(),
    subject_type: z.string().nullable(),
  })
  .passthrough()
